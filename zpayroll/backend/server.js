import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import crypto from "crypto";
import * as bip39 from "bip39";
import { exec, execFile } from "child_process";
import { promisify } from "util";
import path from "path";
import fs from "fs";
import os from "os";

dotenv.config();

const execAsync = promisify(exec);
const execFileAsync = promisify(execFile);

const PORT = process.env.PORT || 3001;
const ZINGO_BIN = process.env.ZINGO_BIN || "C:\\Users\\USER\\zingolib\\target\\release\\zingo-cli.exe";
const DEFAULT_LIGHTWALLETD = "https://testnet.zec.rocks:443";

function normalizeLightwalletdServer(server) {
  if (!server) return null;
  try {
    const url = new URL(server);
    return `${url.protocol}//${url.hostname}${url.port ? `:${url.port}` : ""}`;
  } catch {
    return server;
  }
}

const rawLightwalletd = String(process.env.LIGHTWALLETD ?? "").trim();
const LIGHTWALLETD_URL = normalizeLightwalletdServer(rawLightwalletd) || DEFAULT_LIGHTWALLETD;
console.log(`[ZPayroll] lightwalletd server: ${LIGHTWALLETD_URL}`);

const PERSIST_DIR = path.join(process.cwd(), "data");
const PAYROLL_HISTORY_PATH = path.join(PERSIST_DIR, "payroll-history.json");
const WORKSPACE_MULTISIG_PATH = path.join(PERSIST_DIR, "workspace-multisig.json");
const PENDING_MULTISIG_PATH = path.join(PERSIST_DIR, "pending-multisig-runs.json");

fs.mkdirSync(PERSIST_DIR, { recursive: true });

function loadJsonFile(filePath, defaultValue) {
  try {
    if (!fs.existsSync(filePath)) return defaultValue;
    const raw = fs.readFileSync(filePath, "utf8");
    return raw ? JSON.parse(raw) : defaultValue;
  } catch (e) {
    console.warn(`[ZPayroll] Failed to load ${filePath}:`, e.message);
    return defaultValue;
  }
}

function saveJsonFile(filePath, data) {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf8");
  } catch (e) {
    console.error(`[ZPayroll] Failed to persist ${filePath}:`, e.message);
  }
}

const app = express();
app.use(cors({
  origin: (origin, callback) => callback(null, true),
  methods: ["GET", "POST"],
  credentials: true,
}));
app.use(express.json({ limit: "1mb" }));

const sessions = new Map();
const payrollHistory = new Map();
const workspaceMultisig = new Map();
const pendingMultisigRuns = new Map();

function savePayrollHistory() {
  saveJsonFile(PAYROLL_HISTORY_PATH, Object.fromEntries(Array.from(payrollHistory.entries())));
}

function saveWorkspaceMultisig() {
  saveJsonFile(WORKSPACE_MULTISIG_PATH, Object.fromEntries(Array.from(workspaceMultisig.entries())));
}

function savePendingMultisigRuns() {
  saveJsonFile(PENDING_MULTISIG_PATH, Object.fromEntries(Array.from(pendingMultisigRuns.entries())));
}

function loadPersistedState() {
  const persistedHistory = loadJsonFile(PAYROLL_HISTORY_PATH, {});
  Object.entries(persistedHistory).forEach(([key, runs]) => payrollHistory.set(key, Array.isArray(runs) ? runs : []));

  const persistedPolicy = loadJsonFile(WORKSPACE_MULTISIG_PATH, {});
  Object.entries(persistedPolicy).forEach(([key, policy]) => workspaceMultisig.set(key, policy));

  const persistedPending = loadJsonFile(PENDING_MULTISIG_PATH, {});
  Object.entries(persistedPending).forEach(([key, run]) => pendingMultisigRuns.set(key, run));
}

loadPersistedState();

function deriveMnemonic(privateKeyHex) {
  const entropy = crypto.createHash("sha256")
    .update(Buffer.from(privateKeyHex, "hex"))
    .digest();
  return bip39.entropyToMnemonic(entropy.toString("hex"));
}

function walletDataDir(publicKey) {
  const dir = path.join(os.tmpdir(), "zpayroll", publicKey.slice(0, 16));
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

async function zingo(args, dataDir, options = {}) {
  const serverUrl = LIGHTWALLETD_URL || DEFAULT_LIGHTWALLETD;
  const argsList = [];
  argsList.push("--chain", "testnet");
  argsList.push("--server", serverUrl);
  argsList.push("--data-dir", dataDir);
  if (options.waitSync) argsList.push("--waitsync");
  // split the args string into parts (preserve quoted sections)
  function splitArgs(str) {
    const out = [];
    let cur = "";
    let inQuote = false;
    for (let i = 0; i < str.length; i++) {
      const ch = str[i];
      if (ch === '"') { inQuote = !inQuote; continue; }
      if (ch === ' ' && !inQuote) { if (cur) { out.push(cur); cur = ""; } continue; }
      cur += ch;
    }
    if (cur) out.push(cur);
    return out;
  }
  const extra = splitArgs(args || "");
  for (const a of extra) argsList.push(a);
  console.log(`[zingo execFile] ${args.split(" ")[0]} --server ${serverUrl}${options.waitSync ? " --waitsync" : ""}`);
  try {
    const { stdout, stderr } = await execFileAsync(ZINGO_BIN, argsList, { timeout: 180_000 });
    if (stderr) console.warn(`[zingo stderr] ${String(stderr).slice(0, 300)}`);
    return String(stdout).trim();
  } catch (e) {
    const errMsg = e.stderr ? String(e.stderr).trim() : e.message;
    console.error(`[zingo execFile error] ${errMsg}`);
    throw new Error(errMsg || e.message);
  }
}

async function zingoWithSeed(mnemonic, birthday, command, dataDir, options = {}) {
  return zingo(`--seed "${mnemonic}" --birthday ${birthday} ${command}`, dataDir, options);
}

function parseZingo(raw) {
  // First try standard JSON
  try {
    const jsonStart = raw.indexOf("{");
    const jsonEnd = raw.lastIndexOf("}");
    if (jsonStart !== -1) return JSON.parse(raw.slice(jsonStart, jsonEnd + 1));
  } catch { }

  // Handle zingo's custom format: [ key: value, ... ] with underscores in numbers
  try {
    const start = raw.indexOf("[");
    const end = raw.lastIndexOf("]");
    if (start === -1) return null;
    const block = raw.slice(start + 1, end);
    const result = {};
    for (const line of block.split("\n")) {
      const match = line.trim().match(/^(\w+):\s*([\d_]+)$/);
      if (match) {
        result[match[1]] = parseInt(match[2].replace(/_/g, ""), 10);
      }
    }
    return Object.keys(result).length > 0 ? result : null;
  } catch { return null; }
}

function parseZingoArray(raw) {
  try {
    const start = raw.indexOf("[");
    const end = raw.lastIndexOf("]");
    if (start === -1) return null;
    return JSON.parse(raw.slice(start, end + 1));
  } catch { return null; }
}

// Parse zingo key:value format — strips underscores from numbers
// e.g. "confirmed_orchard_balance: 299_975_000"
function parseZingoKV(raw) {
  const obj = {};
  for (const line of raw.split(/\r?\n/)) {
    const m = line.trim().match(/^([\w_]+):\s*([\d_]+)$/);
    if (m) obj[m[1]] = parseInt(m[2].replace(/_/g, ""), 10);
  }
  return Object.keys(obj).length > 0 ? obj : null;
}

// Try all parsers and extract zatoshi balance
function extractZatoshis(raw) {
  const data = parseZingo(raw) ?? parseZingoKV(raw);
  if (!data) return 0;
  return (
    data.confirmed_orchard_balance ??
    data.total_orchard_balance ??
    data.orchard_balance ??
    data.confirmed_sapling_balance ??
    data.total_sapling_balance ??
    data.sapling_balance ??
    data.total_balance ??
    data.z_balance ??
    0
  );
}

function extractTxId(raw) {
  // Try JSON-style txid
  let txId = null;

  // Try object with txid field
  try {
    const json = parseZingo(raw);
    if (json?.txid) return String(json.txid).toLowerCase();
    if (json?.transaction_id) return String(json.transaction_id).toLowerCase();
  } catch { }

  // Try text patterns: "txid": "...", or txid: ...
  const patterns = [
    /"txid"\s*:\s*"([0-9a-fA-F]{64})"/i,
    /txid\s*:\s*"?([0-9a-fA-F]{64})"?/i,
    /"transaction_id"\s*:\s*"([0-9a-fA-F]{64})"/i,
    /transaction_id\s*:\s*"?([0-9a-fA-F]{64})"?/i,
    /\btxid\s+([0-9a-fA-F]{64})\b/i,
    /\btransaction.id\s+([0-9a-fA-F]{64})\b/i,
  ];

  for (const pattern of patterns) {
    const m = raw.match(pattern);
    if (m && m[1]) {
      txId = String(m[1]).toLowerCase();
      break;
    }
  }

  // Fallback: look for any 64-char hex string (with some heuristics)
  if (!txId) {
    const hexMatches = raw.match(/\b[0-9a-fA-F]{64}\b/g) || [];
    if (hexMatches.length > 0) {
      // Prefer the last hex string if multiple exist
      txId = String(hexMatches[hexMatches.length - 1]).toLowerCase();
    }
  }

  return txId || null;
}

function sha256Hex(input) {
  return crypto.createHash("sha256").update(input).digest("hex");
}

function ed25519PublicKeyPem(publicKeyHex) {
  const keyBuf = Buffer.from(publicKeyHex, "hex");
  if (keyBuf.length !== 32) throw new Error("Invalid Ed25519 public key length");
  const der = Buffer.concat([Buffer.from("302a300506032b6570032100", "hex"), keyBuf]);
  const b64 = der.toString("base64").match(/.{1,64}/g).join("\n");
  return `-----BEGIN PUBLIC KEY-----\n${b64}\n-----END PUBLIC KEY-----\n`;
}

function verifyEd25519Signature(publicKeyHex, payloadHashHex, signatureHex) {
  try {
    const pubPem = ed25519PublicKeyPem(publicKeyHex);
    const message = Buffer.from(payloadHashHex, "hex");
    const signature = Buffer.from(signatureHex, "hex");
    return crypto.verify(null, message, { key: pubPem, format: "pem", type: "spki" }, signature);
  } catch {
    return false;
  }
}

function createPayloadHash(runId, employees) {
  const payload = {
    runId,
    employees: employees.map(e => ({ id: e.id, address: e.address, amountZEC: e.amountZEC })),
  };
  return sha256Hex(JSON.stringify(payload));
}

function normalizeSignerHex(hex) {
  return typeof hex === "string" ? hex.trim().toLowerCase() : "";
}

function requireSession(req, res, next) {
  const token = req.headers["x-session-token"] || req.body?.sessionToken;
  if (!token || !sessions.has(token))
    return res.status(401).json({ error: "Invalid or expired session. Please log in again." });
  req.wallet = sessions.get(token);
  next();
}

async function initWallet(publicKey, privateKey, birthdayHeight = 3991097) {
  const mnemonic = deriveMnemonic(privateKey);
  const dataDir = walletDataDir(publicKey);

  const walletFile = path.join(dataDir, "zingo-wallet.dat");
  if (fs.existsSync(walletFile)) fs.unlinkSync(walletFile);

  const addrRaw = await zingoWithSeed(mnemonic, birthdayHeight, "addresses", dataDir);
  console.log(`[zingo raw addresses] ${addrRaw.slice(0, 400)}`);

  const addrArr = parseZingoArray(addrRaw);
  const addrObj = addrArr?.[0] ?? parseZingo(addrRaw);

  const unifiedAddress =
    addrObj?.encoded_address ??
    addrObj?.unified_address ??
    addrObj?.address ??
    addrArr?.[0]?.encoded_address ??
    addrArr?.[0]?.unified_address ??
    null;

  if (!unifiedAddress)
    throw new Error(`Could not parse address from zingo output: ${addrRaw.slice(0, 400)}`);

  const vkRaw = await zingo("export_ufvk", dataDir);
  console.log(`[zingo raw vk] ${vkRaw.slice(0, 200)}`);
  const vkJson = parseZingo(vkRaw);
  const viewingKey =
    vkJson?.ufvk ??
    vkJson?.viewing_key ??
    vkJson?.unified_full_viewing_key ??
    `uviewtest1_${publicKey.slice(0, 32)}`;

  return { mnemonic, dataDir, unifiedAddress, viewingKey };
}

app.get("/api/health", async (req, res) => {
  try {
    fs.accessSync(ZINGO_BIN);
    res.json({ status: "ok", zingoReady: true, network: "testnet", lightwalletd: LIGHTWALLETD_URL });
  } catch {
    res.status(503).json({ status: "error", zingoReady: false, error: `zingo-cli not found at ${ZINGO_BIN}` });
  }
});

app.post("/api/wallet/create", async (req, res) => {
  const { publicKey, privateKey } = req.body;
  if (!publicKey || !privateKey)
    return res.status(400).json({ error: "publicKey and privateKey required" });
  try {
    const birthdayHeight = 3991097; // Recent testnet height for faster scanning
    const { mnemonic, dataDir, unifiedAddress, viewingKey } = await initWallet(publicKey, privateKey, birthdayHeight);
    const sessionToken = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString(); // 8 hours
    sessions.set(sessionToken, { publicKey, mnemonic, dataDir, unifiedAddress, viewingKey, birthdayHeight });
    console.log(`[wallet/create] ${unifiedAddress.slice(0, 24)}...`);
    res.json({ unifiedAddress, viewingKey, mnemonic: mnemonic.split(" "), birthdayHeight, network: "testnet", sessionToken, expiresAt });
  } catch (e) {
    console.error("[/wallet/create]", e.message);
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/wallet/restore", async (req, res) => {
  const { publicKey, privateKey } = req.body;
  if (!publicKey || !privateKey)
    return res.status(400).json({ error: "publicKey and privateKey required" });
  try {
    const birthdayHeight = 3991097; // First received transaction block height on testnet
    const { mnemonic, dataDir, unifiedAddress, viewingKey } = await initWallet(publicKey, privateKey, birthdayHeight);
    const sessionToken = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString(); // 8 hours
    sessions.set(sessionToken, { publicKey, mnemonic, dataDir, unifiedAddress, viewingKey, birthdayHeight });
    console.log(`[wallet/restore] ${unifiedAddress.slice(0, 24)}...`);
    res.json({ unifiedAddress, viewingKey, mnemonic: mnemonic.split(" "), birthdayHeight, network: "testnet", sessionToken, restored: true, expiresAt });
  } catch (e) {
    console.error("[/wallet/restore]", e.message);
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/wallet/balance", requireSession, async (req, res) => {
  const { dataDir } = req.wallet;
  try {
    const raw = await zingo("balance", dataDir, { waitSync: true });
    console.log(`[zingo raw balance] ${raw.slice(0, 400)}`);
    const json = parseZingo(raw) ?? parseZingoKV(raw);
    const zatoshis = json?.orchard_balance ?? json?.total_orchard_balance ?? json?.confirmed_orchard_balance ??
      json?.sapling_balance ?? json?.total_sapling_balance ?? json?.confirmed_sapling_balance ??
      json?.transparent_balance ?? json?.total_transparent_balance ?? json?.confirmed_transparent_balance ??
      json?.z_balance ?? json?.total_balance ?? 0;
    const balanceZEC = zatoshis / 100_000_000;
    res.json({ balanceZatoshis: zatoshis, balanceZEC: parseFloat(balanceZEC.toFixed(8)), network: "testnet", rawBalance: json });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/wallet/address", requireSession, (req, res) => {
  res.json({ address: req.wallet.unifiedAddress, network: "testnet" });
});

app.post("/api/wallet/mnemonic", requireSession, (req, res) => {
  const { mnemonic, viewingKey, unifiedAddress } = req.wallet;
  res.json({ mnemonic, viewingKey, unifiedAddress, network: "testnet" });
});

app.post("/api/wallet/sync", requireSession, async (req, res) => {
  const { dataDir } = req.wallet;
  try {
    await zingo("sync", dataDir, { waitSync: true });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/session/logout", requireSession, (req, res) => {
  const token = req.headers["x-session-token"] || req.body?.sessionToken;
  if (token && sessions.has(token)) {
    sessions.delete(token);
  }
  res.json({ success: true });
});

app.post("/api/workspace/multisig/get", requireSession, (req, res) => {
  const policy = workspaceMultisig.get(req.wallet.publicKey) || null;
  res.json({ policy });
});

app.post("/api/workspace/multisig/setup", requireSession, (req, res) => {
  const { threshold, signers } = req.body;
  const ownerKey = req.wallet.publicKey;
  const cleanSigners = Array.isArray(signers)
    ? [...new Set(signers.map(normalizeSignerHex).filter(Boolean))]
    : [];

  if (cleanSigners.length === 0) return res.status(400).json({ error: "Signer public keys are required." });
  if (!Number.isInteger(threshold) || threshold < 1) return res.status(400).json({ error: "Threshold must be a positive integer." });
  if (threshold > cleanSigners.length) return res.status(400).json({ error: "Threshold cannot exceed number of signers." });
  if (!cleanSigners.includes(normalizeSignerHex(ownerKey))) {
    return res.status(400).json({ error: "Your own public key must be included in the signer list." });
  }

  workspaceMultisig.set(ownerKey, { threshold, signers: cleanSigners, ownerDataDir: req.wallet.dataDir });
  saveWorkspaceMultisig();
  res.json({ success: true, policy: { threshold, signers: cleanSigners } });
});

app.post("/api/workspace/multisig/disable", requireSession, (req, res) => {
  const ownerKey = req.wallet.publicKey;
  workspaceMultisig.delete(ownerKey);
  saveWorkspaceMultisig();
  res.json({ success: true });
});

app.post("/api/payroll/queue", requireSession, async (req, res) => {
  const { employees } = req.body;
  const { dataDir, publicKey } = req.wallet;
  const policy = workspaceMultisig.get(publicKey);
  if (!policy) return res.status(400).json({ error: "Multisig is not enabled for this workspace." });
  if (!Array.isArray(employees) || employees.length === 0)
    return res.status(400).json({ error: "employees array required" });

  const cleanEmployees = employees.map(emp => ({ id: emp.id, name: emp.name, address: emp.address, amountZEC: emp.amountZEC }));
  for (const emp of cleanEmployees) {
    if (!emp.address?.startsWith("utest1"))
      return res.status(400).json({ error: `Invalid address for ${emp.name}. Must be utest1...` });
    if (typeof emp.amountZEC !== "number" || emp.amountZEC <= 0)
      return res.status(400).json({ error: `Invalid amount for ${emp.name}.` });
  }

  try {
    const balRaw = await zingo("balance", dataDir, { waitSync: true });
    const zatoshis = extractZatoshis(balRaw);
    const balanceZEC = zatoshis / 100_000_000;
    const totalZEC = cleanEmployees.reduce((s, e) => s + e.amountZEC, 0);

    if (balanceZEC < totalZEC)
      return res.status(400).json({
        error: "Insufficient balance",
        balanceZEC,
        requiredZEC: totalZEC,
        shortfallZEC: parseFloat((totalZEC - balanceZEC).toFixed(8)),
      });

    const runId = `run_${Date.now()}`;
    const payloadHash = createPayloadHash(runId, cleanEmployees);
    const run = {
      runId,
      ownerKey: publicKey,
      ownerDataDir: req.wallet.dataDir,
      threshold: policy.threshold,
      signers: policy.signers,
      approvals: [],
      approvalsCount: 0,
      employees: cleanEmployees,
      totalZEC,
      queuedAt: new Date().toISOString(),
      payloadHash,
      multisig: true,
    };

    pendingMultisigRuns.set(runId, run);
    res.json({ queued: true, runId, approvalsNeeded: policy.threshold, payloadHash, totalZEC, employees: cleanEmployees });
  } catch (e) {
    console.error("[/payroll/queue]", e);
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/payroll/pending", requireSession, (req, res) => {
  const userKey = req.wallet.publicKey;
  const runs = Array.from(pendingMultisigRuns.values()).filter(run => !run.executed && run.signers.includes(normalizeSignerHex(userKey)));
  res.json({ pendingRuns: runs });
});

app.post("/api/payroll/approve", requireSession, async (req, res) => {
  const { runId, signature } = req.body;
  const signerKey = normalizeSignerHex(req.wallet.publicKey);
  const run = pendingMultisigRuns.get(runId);
  if (!run) return res.status(404).json({ error: "Pending run not found." });
  if (!run.signers.includes(signerKey)) return res.status(403).json({ error: "You are not authorized to sign this run." });
  if (run.approvals.includes(signerKey)) return res.status(400).json({ error: "You have already signed this run." });
  if (!signature || typeof signature !== "string") return res.status(400).json({ error: "Signature is required." });
  if (!verifyEd25519Signature(signerKey, run.payloadHash, signature)) return res.status(400).json({ error: "Signature verification failed." });

  run.approvals.push(signerKey);
  run.approvalsCount = run.approvals.length;
  savePendingMultisigRuns();

  if (run.approvalsCount >= run.threshold) {
    try {
      const results = [];
      const executorDataDir = run.ownerDataDir || req.wallet.dataDir;
      for (const emp of run.employees) {
        try {
          const zatoshiAmount = Math.round(emp.amountZEC * 100_000_000);
          const memo = `ZPayroll-${new Date().toISOString()}`;
          const sendRaw = await zingo(`quicksend ${emp.address} ${zatoshiAmount} "${memo}"`, executorDataDir, { waitSync: true });
          const txId = extractTxId(sendRaw);
          console.log(`[Payroll multisig send] ${emp.name}: raw output (first 400 chars): ${sendRaw.slice(0, 400)}`);
          if (txId) {
            console.log(`[Payroll multisig send] ✓ ${emp.name} — ${emp.amountZEC} ZEC — txid: ${txId}`);
            results.push({ employeeId: emp.id, name: emp.name, amountZEC: emp.amountZEC, txId, status: "sent" });
          } else {
            console.warn(`[Payroll multisig send] ✗ No txid extracted for ${emp.name}; marking as pending.`);
            results.push({ employeeId: emp.id, name: emp.name, amountZEC: emp.amountZEC, txId: null, status: "pending", rawOutput: sendRaw.slice(0, 500) });
          }
        } catch (e) {
          console.error(`[Payroll multisig execute] ${emp.name}:`, e.message);
          results.push({ employeeId: emp.id, name: emp.name, amountZEC: emp.amountZEC, txId: null, status: "failed", error: e.message });
        }
      }
      const executedRun = {
        ...run,
        executed: true,
        status: "executed",
        timestamp: new Date().toISOString(),
        successCount: results.filter(r => r.status === "sent").length,
        failureCount: results.filter(r => r.status === "failed").length,
        results,
      };
      if (!payrollHistory.has(run.ownerKey)) payrollHistory.set(run.ownerKey, []);
      payrollHistory.get(run.ownerKey).unshift(executedRun);
      savePayrollHistory();
      pendingMultisigRuns.delete(runId);
      savePendingMultisigRuns();
      return res.json({ status: "executed", run: executedRun });
    } catch (e) {
      console.error("[/payroll/approve execute]", e);
      return res.status(500).json({ error: e.message });
    }
  }

  res.json({ status: "pending", runId, approvalsCount: run.approvalsCount, approvalsNeeded: run.threshold - run.approvalsCount });
});

app.post("/api/payroll/cancel", requireSession, (req, res) => {
  const { runId } = req.body;
  const run = pendingMultisigRuns.get(runId);
  if (!run) return res.status(404).json({ error: "Pending run not found." });
  if (normalizeSignerHex(req.wallet.publicKey) !== normalizeSignerHex(run.ownerKey)) return res.status(403).json({ error: "Only the workspace owner can cancel this run." });
  pendingMultisigRuns.delete(runId);
  savePendingMultisigRuns();
  res.json({ success: true });
});

app.post("/api/payroll/run", requireSession, async (req, res) => {
  const { employees } = req.body;
  const { dataDir, publicKey } = req.wallet;

  if (!Array.isArray(employees) || employees.length === 0)
    return res.status(400).json({ error: "employees array required" });

  for (const emp of employees) {
    if (!emp.address?.startsWith("utest1"))
      return res.status(400).json({ error: `Invalid address for ${emp.name}. Must be utest1...` });
  }

  try {
    const balRaw = await zingo("balance", dataDir, true);
    const zatoshis = extractZatoshis(balRaw);
    const balanceZEC = zatoshis / 100_000_000;
    const totalZEC = employees.reduce((s, e) => s + e.amountZEC, 0);

    if (balanceZEC < totalZEC)
      return res.status(400).json({
        error: "Insufficient balance",
        balanceZEC,
        requiredZEC: totalZEC,
        shortfallZEC: parseFloat((totalZEC - balanceZEC).toFixed(8)),
      });

    const results = [];
    const runId = `run_${Date.now()}`;

    for (const emp of employees) {
      try {
        const zatoshiAmount = Math.round(emp.amountZEC * 100_000_000);
        const memo = `ZPayroll-${new Date().toISOString()}`;
        const sendRaw = await zingo(`quicksend ${emp.address} ${zatoshiAmount} "${memo}"`, dataDir, { waitSync: true });
        const txId = extractTxId(sendRaw);
        console.log(`[Payroll send] ${emp.name}: raw output (first 400 chars): ${sendRaw.slice(0, 400)}`);
        if (txId) {
          console.log(`[Payroll send] ✓ ${emp.name} — ${emp.amountZEC} ZEC — txid: ${txId}`);
          results.push({ employeeId: emp.id, name: emp.name, amountZEC: emp.amountZEC, txId, status: "sent" });
        } else {
          console.warn(`[Payroll send] ✗ No txid extracted for ${emp.name}; marking as pending.`);
          results.push({ employeeId: emp.id, name: emp.name, amountZEC: emp.amountZEC, txId: null, status: "pending", rawOutput: sendRaw.slice(0, 500) });
        }
      } catch (e) {
        console.error(`[Payroll] ✗ ${emp.name}:`, e.message);
        results.push({ employeeId: emp.id, name: emp.name, amountZEC: emp.amountZEC, txId: null, status: "failed", error: e.message });
      }
    }

    const run = {
      runId,
      timestamp: new Date().toISOString(),
      totalEmployees: employees.length,
      totalZEC,
      successCount: results.filter(r => r.status === "sent").length,
      failureCount: results.filter(r => r.status === "failed").length,
      results,
    };

    if (!payrollHistory.has(publicKey)) payrollHistory.set(publicKey, []);
    payrollHistory.get(publicKey).unshift(run);
    savePayrollHistory();
    res.json({ success: true, run });
  } catch (e) {
    console.error("[/payroll/run]", e);
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/payroll/history", requireSession, (req, res) => {
  const runs = payrollHistory.get(req.wallet.publicKey) || [];
  res.json({ runs });
});

app.post("/api/payroll/estimate", requireSession, async (req, res) => {
  const { dataDir } = req.wallet;
  const totalZEC = parseFloat(req.body.total);
  if (isNaN(totalZEC) || totalZEC <= 0)
    return res.status(400).json({ error: "total must be a positive number" });
  try {
    const raw = await zingo("balance", dataDir, true);
    const zatoshis = extractZatoshis(raw);
    const balanceZEC = zatoshis / 100_000_000;
    const canAfford = balanceZEC >= totalZEC;
    res.json({
      balanceZEC,
      requiredZEC: totalZEC,
      canAfford,
      shortfallZEC: canAfford ? 0 : parseFloat((totalZEC - balanceZEC).toFixed(8)),
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

const server = app.listen(PORT, () => {
  console.log(`\n[ZPayroll] Server running at http://localhost:${PORT}`);
  console.log(`[ZPayroll] Zingo-CLI:    ${ZINGO_BIN}`);
  console.log(`[ZPayroll] Lightwalletd: ${LIGHTWALLETD_URL}`);
  console.log(`[ZPayroll] Mode:         Real testnet via zingo-cli\n`);
});

server.on("error", (err) => {
  if (err && err.code === "EADDRINUSE") {
    console.error(`[ZPayroll] ERROR: Port ${PORT} already in use. Kill the process using it or set PORT to a different value.`);
    console.error(err);
    process.exit(1);
  }
  console.error("[ZPayroll] Server error:", err);
  process.exit(1);
});