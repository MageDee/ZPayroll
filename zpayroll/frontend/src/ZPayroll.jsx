import { useState, useEffect } from "react";
import { useTheme, useBreakpoint, t, ThemeToggle, globalCss } from "./theme";
import { API } from "./apiConfig";

const EXPLORER_BASE = "https://testnet.cipherscan.app/tx/";
const FAUCET_URL = "https://testnet.zecfaucet.com";
const TEAM_STORAGE_PREFIX = "zpayroll_team_";
const HISTORY_STORAGE_PREFIX = "zpayroll_history_";

function loadWorkspaceTeam(publicKey) {
  if (!publicKey) return [];
  try {
    const raw = localStorage.getItem(`${TEAM_STORAGE_PREFIX}${publicKey}`);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveWorkspaceTeam(publicKey, employees) {
  if (!publicKey) return;
  try {
    localStorage.setItem(`${TEAM_STORAGE_PREFIX}${publicKey}`, JSON.stringify(employees));
  } catch {}
}

function loadWorkspaceHistory(publicKey) {
  if (!publicKey) return [];
  try {
    const raw = localStorage.getItem(`${HISTORY_STORAGE_PREFIX}${publicKey}`);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveWorkspaceHistory(publicKey, history) {
  if (!publicKey) return;
  try {
    localStorage.setItem(`${HISTORY_STORAGE_PREFIX}${publicKey}`, JSON.stringify(history));
  } catch {}
}

function mergeRuns(existing = [], incoming = []) {
  const map = new Map();
  [...existing, ...incoming].forEach(run => {
    if (!run?.runId) return;
    const current = map.get(run.runId);
    const runTime = run.timestamp ? new Date(run.timestamp).getTime() : 0;
    const currentTime = current?.timestamp ? new Date(current.timestamp).getTime() : 0;
    if (!current || runTime >= currentTime) map.set(run.runId, run);
  });
  return Array.from(map.values()).sort((a, b) => (new Date(b.timestamp).getTime() || 0) - (new Date(a.timestamp).getTime() || 0));
}

// ── Address validation ────────────────────────────────────────────────────────
function isValidTestnetAddress(addr) {
  return typeof addr === "string" && (addr.startsWith("utest1") || addr.startsWith("u1")) && addr.length >= 40;
}

// ── Schedule helpers ──────────────────────────────────────────────────────────
const SCHEDULE_OPTIONS = [
  { value: "none", label: "No schedule" },
  { value: "weekly", label: "Every week" },
  { value: "biweekly", label: "Every 2 weeks" },
  { value: "monthly", label: "Monthly — 1st" },
  { value: "monthly15", label: "Monthly — 15th" },
];

function nextPayrollDate(schedule) {
  const now = new Date();
  if (schedule === "none") return null;
  if (schedule === "weekly") { const d = new Date(now); d.setDate(d.getDate() + (7 - d.getDay())); return d; }
  if (schedule === "biweekly") { const d = new Date(now); d.setDate(d.getDate() + 14); return d; }
  if (schedule === "monthly") return new Date(now.getFullYear(), now.getMonth() + 1, 1);
  if (schedule === "monthly15") { const d = new Date(now.getFullYear(), now.getMonth(), 15); if (d <= now) d.setMonth(d.getMonth() + 1); return d; }
  return null;
}
function daysUntil(date) { return date ? Math.ceil((date - new Date()) / 86400000) : null; }

// ── Export helpers ────────────────────────────────────────────────────────────
function exportCSV(history) {
  const rows = [["Run ID", "Date", "Recipient", "Amount (ZEC)", "TX ID", "Status"]];
  history.forEach(run => {
    if (run.results?.length) {
      run.results.forEach(r => rows.push([run.runId, new Date(run.timestamp).toISOString().split("T")[0], r.name, r.amountZEC?.toFixed(8) ?? "", r.txId ?? "", r.status]));
    } else {
      rows.push([run.runId, new Date(run.timestamp).toISOString().split("T")[0], `${run.totalEmployees} recipients`, run.totalZEC?.toFixed(8) ?? "", "", run.failureCount > 0 ? "partial" : "complete"]);
    }
  });
  const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = `zpayroll-${Date.now()}.csv`; a.click();
  URL.revokeObjectURL(url);
}
function exportJSON(history) {
  const blob = new Blob([JSON.stringify(history, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = `zpayroll-${Date.now()}.json`; a.click();
  URL.revokeObjectURL(url);
}

// ── Initial data ──────────────────────────────────────────────────────────────
const INITIAL_EMPLOYEES = [
  { id: 1, name: "Amara Osei", role: "Lead Engineer", address: "utest12j4uh9k37ltf2j90g4khqzp4unt5mf6ncdhw0z9s2sg76lta8cxjd9u0tuq9czmppw5554xqdunxg5wpt6rnyuaxurpf26rlfssuem6f", salary: 0.45, status: "active" },
  { id: 2, name: "Kenji Watanabe", role: "Product Designer", address: "utest1vj8x9k3mflt2q90g4khqzp4unt5mf6ncdhw0z9s2sg76lta8cxjd9u0tuq9czmppw5554xqdunxg5wpt6rnyuaxurpf26rlfss9am4k", salary: 0.32, status: "active" },
  { id: 3, name: "Fatima Al-Rashid", role: "Backend Dev", address: "utest1xp92m1rqw4lk33t9ybn2zr7y8pmc5qw4abc7f3xpl9zr7y8pmc5qw4lk33t9ybn2zr7y8pmc5qw4lk33t9ybn2zr7y8pmc5qqas7f3", salary: 0.38, status: "active" },
  { id: 4, name: "Marcus Webb", role: "DevOps", address: "utest1lk33t9ybn2zr7y8pmc5qw4abc7f3xpl9zr7y8pmc5qw4lk33t9ybn2zr7y8pmc5qw4lk33t9ybn2zr7y8pmc5qw4lk33t9ybn2qqts9p", salary: 0.29, status: "active" },
  { id: 5, name: "Nia Okafor", role: "QA Engineer", address: "utest1zr7y8pmc5qw4lk33t9ybn2abc7f3xpl9zr7y8pmc5qw4lk33t9ybn2zr7y8pmc5qw4lk33t9ybn2zr7y8pmc5qw4lk33t9ybn2qqrs7t", salary: 0.25, status: "pending" },
];

// ── Icons ─────────────────────────────────────────────────────────────────────
const I = {
  Shield: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>,
  Copy: () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>,
  Check: () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>,
  Plus: () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>,
  Up: () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="19" x2="12" y2="5" /><polyline points="5 12 12 5 19 12" /></svg>,
  Refresh: () => <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 4 23 10 17 10" /><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" /></svg>,
  Alert: () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>,
  X: () => <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>,
  Key: () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="7.5" cy="15.5" r="5.5" /><path d="M21 2l-9.6 9.6" /><path d="M15.5 7.5l3 3L22 7l-3-3" /></svg>,
  Cal: () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>,
  Eye: () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>,
  Chevron: () => <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9" /></svg>,
  Trash: () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M10 11v6" /><path d="M14 11v6" /><path d="M9 6V4h6v2" /></svg>,
  Export: () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>,
  Link: () => <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" /></svg>,
};

const Spin = ({ size = 13, color }) => {
  const { theme } = useTheme(); const col = color ?? t(theme).gold;
  return <div style={{ width: size, height: size, border: `2px solid ${col}20`, borderTopColor: col, borderRadius: "50%", animation: "g-spin .75s linear infinite", flexShrink: 0 }} />;
};

// ── API helper — always sends session token in header ─────────────────────────
async function apiFetch(path, sessionToken, body = null) {
  const isHealth = path === "/health";
  const headers = { "Content-Type": "application/json" };
  if (sessionToken) headers["x-session-token"] = sessionToken;

  const opts = isHealth
    ? { method: "GET", headers }
    : { method: "POST", headers, body: JSON.stringify(body ?? {}) };

  const url = `${API}${path}`;
  const res = await fetch(url, opts);
  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(`Invalid server response (${res.status}) from ${url}: ${text.slice(0, 250)}`);
  }
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status} from ${url}`);
  return data;
}

// ── Sub-components ────────────────────────────────────────────────────────────
function CopyRow({ label, value, copyKey, copied, onCopy, accent, redact = false, c }) {
  const [revealed, setRevealed] = useState(!redact);
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontSize: 9, color: c.textFaint, letterSpacing: ".16em", textTransform: "uppercase", marginBottom: 6 }}>{label}</div>
      <div style={{ background: c.bgInset, border: `1px solid ${accent}22`, padding: "12px 14px", display: "flex", alignItems: "flex-start", gap: 10 }}>
        <div style={{ flex: 1, fontSize: 11, color: accent, wordBreak: "break-all", lineHeight: 1.7, letterSpacing: ".02em", filter: revealed ? "none" : "blur(5px)", userSelect: revealed ? "auto" : "none", transition: "filter .2s" }}>{value}</div>
        <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
          {redact && <button className="db-icon-btn" onClick={() => setRevealed(r => !r)} style={{ padding: "5px 8px" }}><I.Eye />{revealed ? "Hide" : "Show"}</button>}
          <button className="db-icon-btn" onClick={() => onCopy(copyKey, value)} disabled={!revealed}>{copied ? <><I.Check />Copied</> : <><I.Copy />Copy</>}</button>
        </div>
      </div>
    </div>
  );
}

function TxPill({ txId, copied, onCopy, c }) {
  if (!txId) return null;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
      <span style={{ fontSize: 10, color: c.textDimmer, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 200 }} title={txId}>{txId}</span>
      <button className="db-icon-btn" style={{ padding: "3px 7px" }} onClick={e => { e.stopPropagation(); onCopy(txId, txId); }}>{copied ? <I.Check /> : <I.Copy />}</button>
      <a href={`${EXPLORER_BASE}${txId}`} target="_blank" rel="noopener noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 10, color: c.blue, textDecoration: "none", padding: "3px 7px", border: `1px solid ${c.borderCard}`, background: c.bgCard, transition: "all .2s" }} onClick={e => e.stopPropagation()}>
        <I.Link /> Explorer
      </a>
    </div>
  );
}

function EmptyState({ icon, title, sub, action, c }) {
  return (
    <div style={{ background: c.bgCard, border: `1px solid ${c.borderCard}`, padding: "70px 40px", textAlign: "center", position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", top: 0, left: "50%", transform: "translateX(-50%)", width: 1, height: 36, background: `linear-gradient(${c.gold},transparent)` }} />
      <div style={{ fontSize: 36, marginBottom: 14, opacity: .15 }}>{icon}</div>
      <div style={{ fontFamily: "'Bebas Neue'", fontSize: 28, color: c.borderStrong, letterSpacing: ".04em", marginBottom: 10 }}>{title}</div>
      <p style={{ fontSize: 13, color: c.textDimmer, fontFamily: "'Instrument Serif'", fontStyle: "italic", marginBottom: action ? 24 : 0 }}>{sub}</p>
      {action && <button className="db-gold-btn" onClick={action.fn} style={{ margin: "0 auto" }}>{action.label}</button>}
    </div>
  );
}

function RemoveModal({ employee, onConfirm, onCancel, c }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: c.bgOverlay, display: "flex", alignItems: "center", justifyContent: "center", zIndex: 300, backdropFilter: "blur(8px)", cursor: "crosshair", padding: 16 }} onClick={onCancel}>
      <div style={{ background: c.bgCard, border: `1px solid ${c.redBorder}`, padding: 36, width: "100%", maxWidth: 400, animation: "g-slide .2s ease", position: "relative" }} onClick={e => e.stopPropagation()}>
        <div style={{ position: "absolute", top: 0, right: 0, width: 1, height: 40, background: c.red }} />
        <div style={{ position: "absolute", top: 0, right: 0, width: 40, height: 1, background: c.red }} />
        <div style={{ fontSize: 9, color: c.red, letterSpacing: ".18em", textTransform: "uppercase", marginBottom: 8 }}>Confirm removal</div>
        <div style={{ fontFamily: "'Bebas Neue'", fontSize: 32, letterSpacing: ".02em", marginBottom: 14, lineHeight: 1 }}>REMOVE MEMBER?</div>
        <div style={{ background: c.bgInset, border: `1px solid ${c.borderCard}`, padding: "12px 14px", marginBottom: 18 }}>
          <div style={{ fontSize: 13, color: c.text, marginBottom: 3 }}>{employee.name}</div>
          <div style={{ fontSize: 11, color: c.textMuted }}>{employee.role}</div>
          <div style={{ fontSize: 10, color: c.textDimmer, marginTop: 5, wordBreak: "break-all", lineHeight: 1.5 }}>{employee.address.slice(0, 30)}...</div>
        </div>
        <p style={{ fontSize: 12, color: c.textMuted, lineHeight: 1.7, fontFamily: "'Instrument Serif'", fontStyle: "italic", marginBottom: 22 }}>This member will no longer receive shielded payments. Past transactions are unaffected.</p>
        <div style={{ display: "flex", gap: 10 }}>
          <button className="db-ghost-btn" style={{ flex: 1, borderColor: c.redBorder, color: c.red }} onClick={onConfirm}><I.Trash /> Remove</button>
          <button className="db-gold-btn" style={{ flex: 1 }} onClick={onCancel}>Keep Member</button>
        </div>
      </div>
    </div>
  );
}

// ── Main Dashboard ────────────────────────────────────────────────────────────
export default function ZPayroll({ session, onLogout }) {
  const { theme, isDark } = useTheme();
  const { width, isMobile, isTablet } = useBreakpoint();
  const c = t(theme);
  const pad = isMobile ? "0 16px" : isTablet ? "0 28px" : "0 48px";

  // session.sessionToken is used for all authenticated API calls
  const tok = session?.sessionToken ?? null;

  const [tab, setTab] = useState("dashboard");
  const [employees, setEmployees] = useState(() => loadWorkspaceTeam(session?.publicKey));
  const [balance, setBalance] = useState(null);
  const [walletReady, setWalletReady] = useState(false);
  const [walletErr, setWalletErr] = useState(null);
  const [loadingBal, setLoadingBal] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState(null);
  const [runErr, setRunErr] = useState(null);
  const [history, setHistory] = useState(() => loadWorkspaceHistory(session?.publicKey));
  const [loadingHist, setLoadingHist] = useState(false);
  const [copied, setCopied] = useState({});
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [schedule, setSchedule] = useState("monthly");
  const [showSchedModal, setShowSchedModal] = useState(false);
  const [showVkPanel, setShowVkPanel] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [newEmp, setNewEmp] = useState({ name: "", role: "", address: "", salary: "" });
  const [addrError, setAddrError] = useState("");
  const [expandedRun, setExpandedRun] = useState(null);
  const [removeTarget, setRemoveTarget] = useState(null);
  const [showExportMenu, setShowExportMenu] = useState(false);

  const [msPolicy, setMsPolicy] = useState(null);
  const [msThreshold, setMsThresh] = useState(2);
  const [msSigners, setMsSigners] = useState([session?.publicKey || ""]);
  const [savingMs, setSavingMs] = useState(false);
  const [msErr, setMsErr] = useState(null);
  const [pendingRuns, setPendingRuns] = useState([]);
  const [loadingPending, setLoadingPending] = useState(false);
  const [signing, setSigning] = useState({});
  const [queueing, setQueueing] = useState(false);
  const [queuedRun, setQueuedRun] = useState(null);

  const active = employees.filter(e => e.status === "active");
  const total = active.reduce((s, e) => s + e.salary, 0);
  const canAfford = balance !== null && balance >= total && total > 0;
  const shortfall = balance !== null && !canAfford ? (total - balance).toFixed(4) : null;
  const runway = balance !== null && total > 0 ? Math.floor(balance / total) : "—";
  const allPaid = history.reduce((s, r) => s + (r.totalZEC || 0), 0);
  const dotColor = walletErr ? c.red : walletReady ? c.green : c.gold;
  const nextDate = nextPayrollDate(schedule);
  const daysLeft = daysUntil(nextDate);
  const multisigActive = !!msPolicy;

  useEffect(() => {
    if (isMobile) return;
    const m = e => setMousePos({ x: e.clientX, y: e.clientY });
    window.addEventListener("mousemove", m);
    return () => window.removeEventListener("mousemove", m);
  }, [isMobile]);

  useEffect(() => { boot(); }, []);

  useEffect(() => {
    if (!session?.publicKey) return;
    setEmployees(loadWorkspaceTeam(session.publicKey));
    setHistory(loadWorkspaceHistory(session.publicKey));
  }, [session?.publicKey]);

  useEffect(() => {
    if (!session?.publicKey) return;
    saveWorkspaceTeam(session.publicKey, employees);
  }, [employees, session?.publicKey]);

  useEffect(() => {
    if (!session?.publicKey) return;
    saveWorkspaceHistory(session.publicKey, history);
  }, [history, session?.publicKey]);
  useEffect(() => { if (tab === "dashboard") fetchBal(); }, [tab]);
  useEffect(() => { if (tab === "history") fetchHist(); }, [tab]);
  useEffect(() => { if (tab === "approvals") fetchPending(); }, [tab]);

  // Auto-refresh balance every 30s on dashboard
  useEffect(() => {
    if (tab !== "dashboard") return;
    const id = setInterval(fetchBal, 30_000);
    return () => clearInterval(id);
  }, [tab, tok]);

  const boot = async () => {
    try {
      const d = await apiFetch("/health", null);
      setWalletReady(d.walletReady ?? d.status === "ok");
      setWalletErr(null);
    } catch { setWalletErr("Cannot reach backend — is the server running?"); }
    fetchBal();
    fetchHist();
    fetchMultisigPolicy();
  };

  const fetchBal = async () => {
    if (loadingBal || !tok) return;
    setLoadingBal(true);
    try {
      const d = await apiFetch("/wallet/balance", tok);
      setBalance(d.balanceZEC);
      setWalletErr(null);
    } catch (e) { setWalletErr(e.message); }
    finally { setLoadingBal(false); }
  };

  const fetchHist = async () => {
    if (!tok) return;
    setLoadingHist(true);
    try {
      const d = await apiFetch("/payroll/history", tok);
      const serverRuns = d.runs || [];
      setHistory(prev => mergeRuns(prev, serverRuns));
    } catch (e) {
      console.warn("Failed to load payroll history", e);
    } finally { setLoadingHist(false); }
  };

  const handleSync = async () => {
    setSyncing(true);
    try { await apiFetch("/wallet/sync", tok); await fetchBal(); }
    finally { setSyncing(false); }
  };

  const handleRun = async () => {
    if (running || !canAfford || !walletReady || active.length === 0) return;
    setRunning(true); setResult(null); setRunErr(null); setQueuedRun(null);
    try {
      const endpoint = multisigActive ? "/payroll/queue" : "/payroll/run";
      const d = await apiFetch(endpoint, tok, {
        employees: active.map(e => ({ id: String(e.id), name: e.name, address: e.address, amountZEC: e.salary })),
      });

      if (multisigActive) {
        setQueuedRun({
          runId: d.runId,
          approvalsNeeded: d.approvalsNeeded,
          totalEmployees: d.employees?.length ?? active.length,
          totalZEC: d.totalZEC,
        });
        setTab("approvals");
        await fetchPending();
      } else {
        setResult(d.run);
        await fetchHist();
      }
      await fetchBal();
    } catch (e) { setRunErr(e.message); }
    finally { setRunning(false); }
  };

  const copy = (key, val) => {
    navigator.clipboard.writeText(val);
    setCopied(p => ({ ...p, [key]: true }));
    setTimeout(() => setCopied(p => ({ ...p, [key]: false })), 2000);
  };

  const addEmployee = () => {
    if (!newEmp.name || !newEmp.address || !newEmp.salary) return;
    if (!isValidTestnetAddress(newEmp.address)) {
      setAddrError("Must start with 'utest1' or 'u1'. Get the employee's testnet unified address.");
      return;
    }
    setAddrError("");
    setEmployees(p => [...p, { id: Date.now(), name: newEmp.name, role: newEmp.role || "Team Member", address: newEmp.address, salary: parseFloat(newEmp.salary) || 0, status: "active" }]);
    setNewEmp({ name: "", role: "", address: "", salary: "" });
    setShowModal(false);
  };

  const confirmRemove = () => { setEmployees(p => p.filter(e => e.id !== removeTarget.id)); setRemoveTarget(null); };

  const hexToBytes = (hex = "") => new Uint8Array((hex.match(/.{1,2}/g) || []).map(byte => parseInt(byte, 16)));
  const bytesToHex = (buffer) => Array.from(new Uint8Array(buffer)).map(b => b.toString(16).padStart(2, "0")).join("");
  const signEd25519 = async (privateKeyHex, message) => {
    const keyData = hexToBytes(privateKeyHex);
    const key = await window.crypto.subtle.importKey(
      "raw",
      keyData,
      { name: "Ed25519" },
      false,
      ["sign"],
    );
    const signature = await window.crypto.subtle.sign("Ed25519", key, new TextEncoder().encode(message));
    return bytesToHex(signature);
  };

  const fetchMultisigPolicy = async () => {
    if (!tok) return;
    try {
      const d = await apiFetch("/workspace/multisig/get", tok);
      setMsPolicy(d.policy || null);
      if (d.policy) {
        setMsThresh(d.policy.threshold);
        setMsSigners(d.policy.signers);
      }
    } catch (e) {
      console.warn("Failed to load multisig policy", e);
    }
  };

  const fetchPending = async () => {
    if (!tok) return;
    setLoadingPending(true);
    try {
      const d = await apiFetch("/payroll/pending", tok);
      setPendingRuns(d.pendingRuns || []);
    } catch (e) {
      console.warn("Failed to load pending approvals", e);
    } finally {
      setLoadingPending(false);
    }
  };

  const handleApprove = async (run) => {
    if (!tok || !session?.privateKey) {
      setRunErr("Unable to sign approval: private key unavailable in this session.");
      return;
    }
    setSigning(s => ({ ...s, [run.runId]: true }));
    try {
      const signature = await signEd25519(session.privateKey, run.payloadHash);
      const d = await apiFetch("/payroll/approve", tok, { runId: run.runId, signature });
      if (d.status === "executed") {
        setResult(d.run);
        await fetchHist();
        await fetchBal();
      } else {
        await fetchPending();
      }
    } catch (e) {
      setRunErr(e.message);
    } finally {
      setSigning(s => ({ ...s, [run.runId]: false }));
    }
  };

  const handleCancel = async (runId) => {
    if (!tok) return;
    setQueueing(true);
    try {
      await apiFetch("/payroll/cancel", tok, { runId });
      await fetchPending();
    } catch (e) {
      setRunErr(e.message);
    } finally {
      setQueueing(false);
    }
  };

  const handleSaveMultisig = async () => {
    if (!tok) return;
    setSavingMs(true);
    setMsErr(null);
    try {
      const signers = Array.from(new Set(msSigners.map(s => s.trim()).filter(Boolean)));
      if (!signers.includes(session?.publicKey)) {
        signers.unshift(session?.publicKey);
      }
      if (signers.length === 0) throw new Error("At least one signer is required.");
      if (!Number.isInteger(msThreshold) || msThreshold < 1 || msThreshold > signers.length) {
        throw new Error("Threshold must be a positive integer and no greater than the number of signers.");
      }
      const d = await apiFetch("/workspace/multisig/setup", tok, { threshold: msThreshold, signers });
      setMsPolicy(d.policy);
      setMsThresh(d.policy.threshold);
      setMsSigners(d.policy.signers);
      setMsErr(null);
    } catch (e) {
      setMsErr(e.message);
    } finally {
      setSavingMs(false);
    }
  };

  const handleDisableMultisig = async () => {
    if (!tok) return;
    setSavingMs(true);
    setMsErr(null);
    try {
      await apiFetch("/workspace/multisig/disable", tok);
      setMsPolicy(null);
      setMsErr(null);
      setMsSigners([session?.publicKey || ""]);
      setMsThresh(2);
    } catch (e) {
      setMsErr(e.message);
    } finally {
      setSavingMs(false);
    }
  };

  // ── CSS ───────────────────────────────────────────────────────────────────
  const css = `
    ${globalCss(theme)}

    .db-tab { background:none;border:none;border-bottom:2px solid transparent;font-family:'DM Mono',monospace;font-size:11px;font-weight:500;letter-spacing:.14em;text-transform:uppercase;color:${c.textDimmer};padding:${isMobile ? "14px 14px 12px" : "20px 20px 18px"};cursor:crosshair;transition:all .2s; }
    .db-tab:hover { color:${c.textMuted}; }
    .db-tab.on { color:${c.gold};border-bottom-color:${c.gold}; }

    .db-stat { background:${c.bgCard};padding:${isMobile ? "18px 16px" : "24px 20px"};position:relative;overflow:hidden;animation:g-fadeUp .45s ease both;transition:background .2s; }
    .db-stat:hover { background:${c.bgCardHover}; }
    .db-stat::before { content:'';position:absolute;top:0;right:0;width:44px;height:44px;background:radial-gradient(circle at top right,${c.goldFaint},transparent 70%); }
    .db-stat:nth-child(1){animation-delay:.05s}.db-stat:nth-child(2){animation-delay:.10s}.db-stat:nth-child(3){animation-delay:.15s}.db-stat:nth-child(4){animation-delay:.20s}.db-stat:nth-child(5){animation-delay:.25s}

    .db-gold-btn { display:inline-flex;align-items:center;justify-content:center;gap:8px;background:${c.gold};color:${isDark ? "#050508" : "#fff"};border:none;font-family:'DM Mono',monospace;font-size:11px;font-weight:500;letter-spacing:.14em;text-transform:uppercase;padding:13px 24px;cursor:crosshair;transition:all .15s;white-space:nowrap;clip-path:polygon(0 0,calc(100% - 9px) 0,100% 9px,100% 100%,9px 100%,0 calc(100% - 9px)); }
    .db-gold-btn:hover:not(:disabled) { background:${c.goldHover};box-shadow:0 4px 20px ${c.gold}40;transform:translateY(-1px); }
    .db-gold-btn:disabled { background:${isDark ? "#1a1500" : "#e8ddb0"};color:${isDark ? "#333200" : "#aaa"};cursor:not-allowed; }

    .db-ghost-btn { display:inline-flex;align-items:center;justify-content:center;gap:8px;background:transparent;color:${c.textMuted};border:1px solid ${c.borderCard};font-family:'DM Mono',monospace;font-size:11px;letter-spacing:.12em;text-transform:uppercase;padding:12px 18px;cursor:crosshair;transition:all .15s;white-space:nowrap; }
    .db-ghost-btn:hover { border-color:${c.borderStrong};color:${c.text}; }

    .db-icon-btn { display:inline-flex;align-items:center;gap:5px;background:${c.bgCard};border:1px solid ${c.border};font-family:'DM Mono',monospace;font-size:10px;letter-spacing:.1em;text-transform:uppercase;color:${c.textFaint};padding:6px 10px;cursor:crosshair;transition:all .2s; }
    .db-icon-btn:hover { border-color:${c.borderStrong};color:${c.text}; }
    .db-icon-btn:disabled { opacity:.4;cursor:not-allowed; }

    .db-danger-btn { display:inline-flex;align-items:center;gap:5px;background:${c.bgCard};border:1px solid ${c.redBorder};font-family:'DM Mono',monospace;font-size:10px;letter-spacing:.1em;text-transform:uppercase;color:${c.red}80;padding:6px 10px;cursor:crosshair;transition:all .2s; }
    .db-danger-btn:hover { color:${c.red};background:${c.redBg}; }

    .db-input { width:100%;background:${c.bgInput};border:1px solid ${c.borderCard};padding:11px 13px;color:${c.text};font-family:'DM Mono',monospace;font-size:12px;outline:none;transition:border .2s;letter-spacing:.02em; }
    .db-input:focus { border-color:${c.gold}; }
    .db-input::placeholder { color:${c.textDimmer}; }
    .db-input.err { border-color:${c.redBorder}; }

    .db-select { background:${c.bgInput};border:1px solid ${c.borderCard};padding:10px 13px;color:${c.text};font-family:'DM Mono',monospace;font-size:11px;outline:none;letter-spacing:.04em;cursor:crosshair;appearance:none;width:100%;transition:border .2s; }
    .db-select:focus { border-color:${c.gold}; }

    .db-emp-row { display:grid;grid-template-columns:${isMobile ? "1fr 80px" : "1fr 120px 1.3fr 90px 65px 75px"};gap:${isMobile ? "8px" : "12px"};align-items:center;padding:${isMobile ? "12px 14px" : "13px 24px"};border-bottom:1px solid ${c.borderGap};transition:background .15s; }
    .db-emp-row:hover { background:${c.bgCardHover}; }

    .db-hist-row { background:${c.bgCard};cursor:pointer;border-bottom:1px solid ${c.borderGap};transition:background .15s; }
    .db-hist-row:hover { background:${c.bgCardHover}; }

    .db-ticker-item { display:inline-flex;align-items:center;gap:18px;padding:0 18px;white-space:nowrap;font-size:10px;letter-spacing:.15em;text-transform:uppercase;color:${c.textDimmer}; }
    .db-ticker-dot  { width:3px;height:3px;background:${c.gold};border-radius:50%;flex-shrink:0; }

    .db-vk-panel { position:fixed;top:0;right:0;bottom:0;width:${isMobile ? "100%" : "400px"};background:${c.bgCard};border-left:1px solid ${c.borderCard};z-index:150;padding:${isMobile ? "24px 16px" : "32px 28px"};overflow-y:auto;animation:g-slide .25s ease; }

    .db-export-menu { position:absolute;top:calc(100% + 4px);right:0;background:${c.bgCard};border:1px solid ${c.borderCard};min-width:170px;z-index:100;animation:g-fadeIn .15s ease; }
    .db-export-item { display:flex;align-items:center;gap:8px;padding:10px 14px;font-family:'DM Mono',monospace;font-size:10px;letter-spacing:.1em;text-transform:uppercase;color:${c.textMuted};cursor:crosshair;transition:all .15s;border-bottom:1px solid ${c.borderGap}; }
    .db-export-item:last-child { border-bottom:none; }
    .db-export-item:hover { background:${c.bgCardHover};color:${c.text}; }

    .db-sched-opt { display:flex;align-items:center;gap:12px;padding:11px 14px;border:1px solid ${c.borderCard};cursor:crosshair;transition:all .2s;margin-bottom:7px; }
    .db-sched-opt:hover { border-color:${c.borderStrong}; }
    .db-sched-opt.sel { border-color:${c.gold}60;background:${c.bgInset}; }

    .db-warn { animation:g-warn 2.5s ease-in-out infinite;border:1px solid ${c.redBorder}; }

    @keyframes g-warn  { 0%,100%{border-color:${c.redBorder}} 50%{border-color:${c.red}60} }
    @keyframes g-slide { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }

    @media (max-width:767px) {
      .db-stat-grid { grid-template-columns:1fr 1fr!important; }
      .db-bottom-grid { grid-template-columns:1fr!important; }
      .db-settings-grid { grid-template-columns:1fr!important; }
      .db-section-head { flex-direction:column;gap:12px;align-items:flex-start!important; }
    }
    @media (min-width:768px) and (max-width:1023px) {
      .db-stat-grid { grid-template-columns:repeat(3,1fr)!important; }
    }
  `;

  const TABS = ["dashboard", "team", "history", "approvals", "settings"];

  return (
    <div style={{ fontFamily: "'DM Mono','Courier New',monospace", background: c.bg, minHeight: "100vh", color: c.text, cursor: "crosshair" }}>
      <style>{css}</style>

      {!isMobile && <div style={{ position: "fixed", pointerEvents: "none", zIndex: 9999, width: 280, height: 280, borderRadius: "50%", background: `radial-gradient(circle,${c.goldFaint} 0%,transparent 70%)`, transform: `translate(${mousePos.x - 140}px,${mousePos.y - 140}px)`, transition: "transform .12s ease" }} />}

      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0, backgroundImage: `linear-gradient(${c.gridLine} 1px,transparent 1px),linear-gradient(90deg,${c.gridLine} 1px,transparent 1px)`, backgroundSize: "60px 60px", animation: "g-grid 6s ease-in-out infinite" }} />
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0, overflow: "hidden" }}>
        <div style={{ position: "absolute", left: 0, right: 0, height: 2, background: `linear-gradient(transparent,${c.scanLine},transparent)`, animation: "g-scan 10s linear infinite" }} />
      </div>

      {/* ══ NAV ══ */}
      <nav style={{ position: "sticky", top: 0, zIndex: 50, background: c.bgNav, backdropFilter: "blur(20px)", borderBottom: `1px solid ${c.border}`, display: "flex", alignItems: "stretch", padding: `0 ${isMobile ? "14px" : "40px"}`, justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 9, paddingRight: isMobile ? 0 : 28 }}>
          <div style={{ width: 20, height: 20, background: c.gold, clipPath: "polygon(50% 0%,100% 25%,100% 75%,50% 100%,0% 75%,0% 25%)", animation: "g-pulse 3s ease-in-out infinite" }} />
          {!isMobile && <span style={{ fontFamily: "'Bebas Neue'", fontSize: 18, letterSpacing: ".05em" }}>ZPAYROLL</span>}
          <span style={{ fontSize: 8, color: c.gold, letterSpacing: ".14em", border: `1px solid ${c.goldBorder}`, padding: "2px 5px" }}>TESTNET</span>
        </div>
        <div style={{ display: "flex", flex: 1, overflowX: "auto", scrollbarWidth: "none" }}>
          {TABS.map(tb => <button key={tb} className={`db-tab ${tab === tb ? "on" : ""}`} onClick={() => setTab(tb)}>{tb}</button>)}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: isMobile ? 6 : 12 }}>
          <ThemeToggle />
          {!isMobile && (
            <>
              <button className="db-icon-btn" onClick={() => setShowVkPanel(true)}><I.Key /> Viewing Key</button>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <div style={{ width: 6, height: 6, borderRadius: "50%", background: dotColor, boxShadow: `0 0 8px ${dotColor}`, animation: "g-pulse 2.5s infinite" }} />
                <span style={{ fontSize: 10, color: c.textDimmer, letterSpacing: ".1em", textTransform: "uppercase" }}>{walletErr ? "offline" : walletReady ? "connected" : "syncing"}</span>
              </div>
              {session?.publicKey && (
                <div style={{ display: "flex", alignItems: "center", gap: 7, border: `1px solid ${c.border}`, padding: "6px 11px", background: c.bgCard }}>
                  <div style={{ width: 5, height: 5, borderRadius: "50%", background: c.green }} />
                  <span style={{ fontSize: 10, color: c.textFaint }}>{session.publicKey.slice(0, 8)}···{session.publicKey.slice(-6)}</span>
                </div>
              )}
            </>
          )}
          {onLogout && <button className="db-ghost-btn" onClick={onLogout} style={{ padding: "7px 12px", fontSize: 10 }}>Log out</button>}
        </div>
      </nav>

      {/* Banners */}
      {walletErr && (
        <div style={{ background: c.redBg, borderBottom: `1px solid ${c.redBorder}`, padding: `9px ${isMobile ? "14px" : "48px"}`, display: "flex", alignItems: "center", gap: 10, fontSize: 11, color: c.red, position: "relative", zIndex: 10 }}>
          <I.Alert />{walletErr}
          <button className="db-icon-btn" style={{ marginLeft: "auto", color: c.red, borderColor: c.redBorder }} onClick={boot}>Retry</button>
        </div>
      )}
      {!canAfford && balance !== null && total > 0 && (
        <div className="db-warn" style={{ background: c.redBg, padding: `10px ${isMobile ? "14px" : "48px"}`, display: "flex", alignItems: "center", gap: 12, fontSize: 11, color: c.red, position: "relative", zIndex: 10, flexWrap: "wrap" }}>
          <I.Alert /><span>Insufficient funds — need <strong>{total.toFixed(4)} ZEC</strong>, have <strong>{balance.toFixed(4)} ZEC</strong>. Shortfall: <strong>{shortfall} ZEC</strong>.</span>
          <a href={FAUCET_URL} target="_blank" rel="noopener noreferrer" style={{ marginLeft: "auto", fontSize: 10, color: c.red, textDecoration: "none", opacity: .7 }}>testnet.zecfaucet.com →</a>
        </div>
      )}

      {/* Ticker */}
      <div style={{ borderBottom: `1px solid ${c.border}`, overflow: "hidden", background: c.bgCard, position: "relative", zIndex: 1 }}>
        <div style={{ display: "flex", animation: "g-marquee 30s linear infinite", width: "max-content", padding: "9px 0" }}>
          {[...Array(8)].map((_, i) => (
            <div key={i} style={{ display: "flex" }}>
              {["SHIELDED PAYROLL", "ZK-SNARK PROOFS", "ED25519 IDENTITY", "ORCHARD PROTOCOL", "ZERO CUSTODY", "PRIVATE BY DEFAULT"].map(txt => (
                <div key={txt} className="db-ticker-item"><div className="db-ticker-dot" />{txt}</div>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* ══ CONTENT ══ */}
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: `${isMobile ? "32px" : "48px"} ${pad}`, position: "relative", zIndex: 1 }}>

        {/* ── DASHBOARD ── */}
        {tab === "dashboard" && (
          <div style={{ animation: "g-slide .25s ease" }}>
            <div className="db-section-head" style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 36 }}>
              <div>
                <div style={{ fontSize: 10, color: c.gold, letterSpacing: ".2em", textTransform: "uppercase", marginBottom: 8 }}>Employer Workspace</div>
                <h1 style={{ fontFamily: "'Bebas Neue'", fontSize: isMobile ? 36 : 48, letterSpacing: ".02em", lineHeight: 1 }}>PAYROLL OVERVIEW</h1>
              </div>
              {!isMobile && <p style={{ fontSize: 13, color: c.textMuted, fontFamily: "'Instrument Serif'", fontStyle: "italic", textAlign: "right", maxWidth: 240, lineHeight: 1.6 }}>Salaries are cryptographically hidden on-chain.</p>}
            </div>

            {result && (
              <div style={{ border: `1px solid ${c.greenBorder}`, background: c.greenBg, padding: "16px 20px", marginBottom: 1, animation: "g-fadeIn .3s ease" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                  <span style={{ color: c.green, fontSize: 14 }}>✓</span>
                  <span style={{ fontSize: 11, color: c.green, letterSpacing: ".1em", textTransform: "uppercase" }}>Payroll Complete — {result.successCount}/{result.totalEmployees} dispatched</span>
                  <button className="db-icon-btn" style={{ marginLeft: "auto", padding: "3px 7px" }} onClick={() => setResult(null)}><I.X /></button>
                </div>
                {result.results?.map(r => (
                  <div key={r.employeeId} style={{ fontSize: 10, color: c.textMuted, marginTop: 4, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <span>✓ {r.name} · {r.amountZEC?.toFixed(4)} ZEC</span>
                    {r.txId && <TxPill txId={r.txId} copied={copied[r.txId]} onCopy={copy} c={c} />}
                  </div>
                ))}
              </div>
            )}
            {queuedRun && (
              <div style={{ border: `1px solid ${c.goldBorder}`, background: c.goldBg, padding: "16px 20px", marginBottom: 1, animation: "g-fadeIn .3s ease" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                  <span style={{ color: c.gold, fontSize: 14 }}>⌛</span>
                  <span style={{ fontSize: 11, color: c.text, letterSpacing: ".1em", textTransform: "uppercase" }}>Payroll queued for multisig approval — {queuedRun.totalEmployees} recipients</span>
                  <button className="db-icon-btn" style={{ marginLeft: "auto", padding: "3px 7px" }} onClick={() => setQueuedRun(null)}><I.X /></button>
                </div>
                <div style={{ fontSize: 10, color: c.textMuted }}>Run ID: {queuedRun.runId} · {queuedRun.approvalsNeeded} approvals needed · {queuedRun.totalZEC.toFixed(4)} ZEC</div>
              </div>
            )}
            {runErr && (
              <div style={{ border: `1px solid ${c.redBorder}`, background: c.redBg, padding: "13px 20px", marginBottom: 1, display: "flex", alignItems: "center", gap: 10, fontSize: 11, color: c.red }}>
                <I.Alert />{runErr}
                <button className="db-icon-btn" style={{ marginLeft: "auto", padding: "3px 7px" }} onClick={() => setRunErr(null)}><I.X /></button>
              </div>
            )}

            {/* Stats */}
            <div className="db-stat-grid" style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 1, background: c.borderGap, marginBottom: 1 }}>
              {[
                { label: "Wallet Balance", color: c.gold, val: loadingBal ? null : balance !== null ? balance.toFixed(4) : "—", unit: "ZEC", sub: loadingBal ? "fetching..." : walletErr ? "offline" : "live · testnet", extra: <button className="db-icon-btn" style={{ marginTop: 12 }} onClick={fetchBal} disabled={loadingBal}>{loadingBal ? <Spin size={9} /> : <I.Refresh />} Refresh</button> },
                { label: "Next Payroll", color: c.blue, val: total.toFixed(2), unit: "ZEC", sub: `${active.length} active employees` },
                { label: "Runway", color: canAfford ? c.green : c.red, val: String(runway), unit: runway !== "—" ? "cycles" : "", sub: !canAfford && balance !== null ? `⚠ short ${shortfall} ZEC` : "at current rate" },
                { label: "All-time Paid", color: c.gold, val: allPaid.toFixed(2), unit: "ZEC", sub: `across ${history.length} runs` },
                { label: "Next Run", color: daysLeft !== null && daysLeft <= 3 ? c.red : c.gold, val: daysLeft !== null ? String(daysLeft) : "—", unit: daysLeft !== null ? "days" : "", sub: nextDate ? nextDate.toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "No schedule", extra: <button className="db-icon-btn" style={{ marginTop: 12 }} onClick={() => setShowSchedModal(true)}><I.Cal /> Change</button> },
              ].map((s, i) => (
                <div key={i} className="db-stat">
                  <div style={{ position: "absolute", top: 0, right: 0, width: 1, height: 22, background: `${c.gold}18` }} />
                  <div style={{ position: "absolute", top: 0, right: 0, width: 22, height: 1, background: `${c.gold}18` }} />
                  <div style={{ fontSize: 9, color: c.textDimmer, letterSpacing: ".15em", textTransform: "uppercase", marginBottom: 14 }}>{s.label}</div>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 5, marginBottom: 5 }}>
                    {s.val === null ? <Spin size={20} color={s.color} /> : <span style={{ fontFamily: "'Bebas Neue'", fontSize: isMobile ? 28 : 34, color: s.color, letterSpacing: ".02em", lineHeight: 1 }}>{s.val}</span>}
                    {s.unit && <span style={{ fontSize: 9, color: c.textDimmer, letterSpacing: ".1em", textTransform: "uppercase" }}>{s.unit}</span>}
                  </div>
                  <div style={{ fontSize: 10, color: c.textDimmer }}>{s.sub}</div>
                  {s.extra}
                </div>
              ))}
            </div>

            {/* Bottom panels */}
            <div className="db-bottom-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1, background: c.borderGap }}>
              {/* Deposit address */}
              <div style={{ background: c.bgCard, padding: isMobile ? "20px 16px" : "26px 22px", position: "relative" }}>
                <div style={{ position: "absolute", top: 0, right: 0, width: 1, height: 40, background: c.gold }} />
                <div style={{ position: "absolute", top: 0, right: 0, width: 40, height: 1, background: c.gold }} />
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                  <div>
                    <div style={{ fontSize: 9, color: c.gold, letterSpacing: ".18em", textTransform: "uppercase", marginBottom: 5 }}>Platform Wallet</div>
                    <div style={{ fontFamily: "'Bebas Neue'", fontSize: isMobile ? 20 : 22, letterSpacing: ".04em", lineHeight: 1 }}>DEPOSIT ADDRESS</div>
                  </div>
                  <button className="db-icon-btn" onClick={handleSync} disabled={syncing}>{syncing ? <Spin size={10} /> : <I.Refresh />}{syncing ? "Syncing" : "Sync"}</button>
                </div>
                <div style={{ background: c.bgInset, border: `1px solid ${c.border}`, padding: "11px 13px", display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 10 }}>
                  <div style={{ flex: 1, fontSize: 10, color: session?.unifiedAddress ? c.blue : c.textDimmer, wordBreak: "break-all", lineHeight: 1.7 }}>{session?.unifiedAddress ?? "Loading..."}</div>
                  <button className="db-icon-btn" onClick={() => copy("addr", session?.unifiedAddress)} disabled={!session?.unifiedAddress} style={{ flexShrink: 0, marginTop: 1 }}>{copied.addr ? <><I.Check />Copied</> : <><I.Copy />Copy</>}</button>
                </div>
                <p style={{ fontSize: 10, color: c.textDimmer, lineHeight: 1.8 }}>Fund with testnet ZEC · <a href={FAUCET_URL} target="_blank" rel="noopener noreferrer" style={{ color: c.blue, textDecoration: "none" }}>testnet.zecfaucet.com</a></p>
              </div>

              {/* Run payroll */}
              <div style={{ background: c.bgCard, padding: isMobile ? "20px 16px" : "26px 22px", display: "flex", flexDirection: "column", justifyContent: "space-between", position: "relative" }}>
                <div style={{ position: "absolute", bottom: 0, left: 0, width: 1, height: 36, background: c.borderCard }} />
                <div style={{ position: "absolute", bottom: 0, left: 0, width: 36, height: 1, background: c.borderCard }} />
                <div>
                  <div style={{ fontSize: 9, color: running ? c.green : c.gold, letterSpacing: ".18em", textTransform: "uppercase", marginBottom: 7, transition: "color .3s" }}>{running ? "Generating zk-SNARK Proofs" : "Payroll Execution"}</div>
                  <div style={{ fontFamily: "'Bebas Neue'", fontSize: isMobile ? 20 : 22, letterSpacing: ".04em", lineHeight: 1, marginBottom: 10 }}>{running ? "DISPATCHING..." : "RUN PAYROLL"}</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 5, marginBottom: 10 }}>
                    {active.slice(0, 3).map(e => (
                      <div key={e.id} style={{ display: "flex", justifyContent: "space-between", fontSize: 11 }}>
                        <span style={{ color: c.textMuted }}>{e.name}</span>
                        <span style={{ fontFamily: "'Bebas Neue'", fontSize: 15, color: c.gold }}>{e.salary.toFixed(2)} ZEC</span>
                      </div>
                    ))}
                    {active.length > 3 && <div style={{ fontSize: 10, color: c.textDimmer }}>+{active.length - 3} more</div>}
                  </div>
                  <p style={{ fontSize: 11, color: c.textDimmer, lineHeight: 1.7, fontFamily: "'Instrument Serif'", fontStyle: "italic" }}>
                    {running
                      ? "Proofs generating · do not close this tab"
                      : !canAfford && balance !== null
                        ? `⚠ Deposit ${shortfall} ZEC to proceed`
                        : balance === null
                          ? "Loading balance..."
                          : `${active.length} shielded txs · ${total.toFixed(2)} ZEC`}
                  </p>
                </div>
                <button
                  className="db-gold-btn"
                  style={{ marginTop: 18, width: "100%", padding: "14px" }}
                  onClick={handleRun}
                  disabled={running || !walletReady || !canAfford || balance === null || active.length === 0}
                >
                  {running
                    ? <><Spin size={12} color={isDark ? "#33280a" : "#aa8800"} /> {multisigActive ? "Queueing Payroll..." : "Sending Shielded Transactions..."}</>
                    : <><I.Up /> {multisigActive ? "Queue Payroll" : "Dispatch Payroll"}</>}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── TEAM ── */}
        {tab === "team" && (
          <div style={{ animation: "g-slide .25s ease" }}>
            <div className="db-section-head" style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 36 }}>
              <div>
                <div style={{ fontSize: 10, color: c.gold, letterSpacing: ".2em", textTransform: "uppercase", marginBottom: 8 }}>Roster</div>
                <h1 style={{ fontFamily: "'Bebas Neue'", fontSize: isMobile ? 36 : 48, letterSpacing: ".02em", lineHeight: 1 }}>YOUR TEAM</h1>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                {!isMobile && <span style={{ fontSize: 11, color: c.textDimmer, fontFamily: "'Instrument Serif'", fontStyle: "italic" }}>{employees.length} members · {active.length} active</span>}
                <button className="db-gold-btn" onClick={() => setShowModal(true)}><I.Plus />{!isMobile && " Add Member"}</button>
              </div>
            </div>

            {!canAfford && balance !== null && total > 0 && (
              <div className="db-warn" style={{ padding: "12px 20px", marginBottom: 1, display: "flex", alignItems: "center", gap: 10, fontSize: 11, color: c.red, background: c.redBg }}>
                <I.Alert /> Balance too low. Shortfall: <strong>{shortfall} ZEC</strong>
              </div>
            )}

            {employees.length === 0 ? (
              <EmptyState icon="👥" title="NO TEAM MEMBERS YET" sub="Add your first employee. They'll receive shielded ZEC to their unified address." action={{ label: "+ Add First Member", fn: () => setShowModal(true) }} c={c} />
            ) : (
              <div style={{ background: c.borderGap }}>
                {!isMobile && (
                  <div className="db-emp-row" style={{ background: c.bgInset, borderBottom: `1px solid ${c.border}`, padding: "9px 24px" }}>
                    {["Name", "Role", "Address", "Salary", "Status", ""].map(h => <div key={h} style={{ fontSize: 9, color: c.textDimmer, letterSpacing: ".12em", textTransform: "uppercase" }}>{h}</div>)}
                  </div>
                )}
                {employees.map((emp, i) => (
                  isMobile ? (
                    <div key={emp.id} style={{ background: i % 2 === 0 ? c.bgCard : c.bgCardHover, padding: "14px", borderBottom: `1px solid ${c.borderGap}` }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                        <div>
                          <div style={{ fontSize: 13, color: c.text, marginBottom: 2 }}>{emp.name}</div>
                          <div style={{ fontSize: 11, color: c.textMuted }}>{emp.role}</div>
                          <div style={{ fontSize: 10, color: c.blue, marginTop: 4, wordBreak: "break-all", lineHeight: 1.5 }}>{emp.address.slice(0, 20)}...</div>
                        </div>
                        <div style={{ textAlign: "right", flexShrink: 0, marginLeft: 12 }}>
                          <div style={{ fontFamily: "'Bebas Neue'", fontSize: 20, color: c.gold }}>{emp.salary.toFixed(2)} ZEC</div>
                          <span style={{ fontSize: 9, letterSpacing: ".1em", textTransform: "uppercase", padding: "3px 8px", background: emp.status === "active" ? c.greenBg : c.bgInset, color: emp.status === "active" ? c.green : c.gold, border: `1px solid ${emp.status === "active" ? c.greenBorder : c.border}` }}>{emp.status}</span>
                        </div>
                      </div>
                      <button className="db-danger-btn" style={{ marginTop: 10 }} onClick={() => setRemoveTarget(emp)}><I.Trash /> Remove</button>
                    </div>
                  ) : (
                    <div key={emp.id} className="db-emp-row" style={{ background: i % 2 === 0 ? c.bgCard : c.bgCardHover }}>
                      <span style={{ fontSize: 13, color: c.text }}>{emp.name}</span>
                      <span style={{ fontSize: 11, color: c.textMuted }}>{emp.role}</span>
                      <span style={{ fontSize: 9, color: c.blue, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={emp.address}>{emp.address.slice(0, 16)}...{emp.address.slice(-6)}</span>
                      <div style={{ display: "flex", alignItems: "baseline", gap: 3 }}>
                        <span style={{ fontFamily: "'Bebas Neue'", fontSize: 18, color: c.gold }}>{emp.salary.toFixed(2)}</span>
                        <span style={{ fontSize: 9, color: c.textDimmer }}>ZEC</span>
                      </div>
                      <span style={{ fontSize: 9, letterSpacing: ".1em", textTransform: "uppercase", padding: "3px 8px", background: emp.status === "active" ? c.greenBg : c.bgInset, color: emp.status === "active" ? c.green : c.gold, border: `1px solid ${emp.status === "active" ? c.greenBorder : c.border}` }}>{emp.status}</span>
                      <button className="db-danger-btn" onClick={() => setRemoveTarget(emp)}><I.Trash /> Remove</button>
                    </div>
                  )
                ))}
              </div>
            )}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 24px", background: c.bgCard, borderTop: `1px solid ${c.borderGap}` }}>
              <span style={{ fontSize: 10, color: c.textDimmer, letterSpacing: ".1em", textTransform: "uppercase" }}>Total per cycle</span>
              <div style={{ display: "flex", alignItems: "baseline", gap: 5 }}>
                <span style={{ fontFamily: "'Bebas Neue'", fontSize: 24, color: canAfford || balance === null ? c.gold : c.red }}>{total.toFixed(2)}</span>
                <span style={{ fontSize: 9, color: c.textDimmer }}>ZEC</span>
              </div>
            </div>
          </div>
        )}

        {/* ── HISTORY ── */}
        {tab === "history" && (
          <div style={{ animation: "g-slide .25s ease" }}>
            <div className="db-section-head" style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 36 }}>
              <div>
                <div style={{ fontSize: 10, color: c.gold, letterSpacing: ".2em", textTransform: "uppercase", marginBottom: 8 }}>On-chain record</div>
                <h1 style={{ fontFamily: "'Bebas Neue'", fontSize: isMobile ? 36 : 48, letterSpacing: ".02em", lineHeight: 1 }}>PAYROLL HISTORY</h1>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button className="db-icon-btn" onClick={fetchHist} disabled={loadingHist}>{loadingHist ? <Spin size={10} /> : <I.Refresh />} Refresh</button>
                {history.length > 0 && (
                  <div style={{ position: "relative" }}>
                    <button className="db-icon-btn" onClick={() => setShowExportMenu(e => !e)}><I.Export /> Export <I.Chevron /></button>
                    {showExportMenu && (
                      <>
                        <div style={{ position: "fixed", inset: 0, zIndex: 99 }} onClick={() => setShowExportMenu(false)} />
                        <div className="db-export-menu">
                          <div className="db-export-item" onClick={() => { exportCSV(history); setShowExportMenu(false); }}><I.Export /> Export as CSV</div>
                          <div className="db-export-item" onClick={() => { exportJSON(history); setShowExportMenu(false); }}><I.Export /> Export as JSON</div>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>

            {loadingHist ? (
              <div style={{ display: "flex", justifyContent: "center", padding: 80 }}><Spin size={28} /></div>
            ) : history.length === 0 ? (
              <EmptyState icon="📋" title="NO PAYROLL RUNS YET" sub="History appears here after your first payroll run." action={{ label: "→ Go to Dashboard", fn: () => setTab("dashboard") }} c={c} />
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 1, background: c.borderGap }}>
                {history.map(run => (
                  <div key={run.runId} className="db-hist-row" onClick={() => setExpandedRun(expandedRun === run.runId ? null : run.runId)}>
                    <div style={{ padding: isMobile ? "16px 14px" : "20px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                        <div style={{ width: 32, height: 32, border: `1px solid ${c.border}`, display: "flex", alignItems: "center", justifyContent: "center", color: c.gold, flexShrink: 0 }}><I.Shield /></div>
                        <div>
                          <div style={{ fontFamily: "'Bebas Neue'", fontSize: 18, letterSpacing: ".04em", lineHeight: 1 }}>
                            {new Date(run.timestamp).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                          </div>
                          <div style={{ fontSize: 10, color: c.textDimmer, marginTop: 3 }}>{run.totalEmployees} recipients · <span style={{ color: c.blue }}>{run.runId}</span></div>
                        </div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: isMobile ? 10 : 18 }}>
                        <div style={{ textAlign: "right" }}>
                          <div style={{ display: "flex", alignItems: "baseline", gap: 4, justifyContent: "flex-end" }}>
                            <span style={{ fontFamily: "'Bebas Neue'", fontSize: 24, color: c.gold }}>{run.totalZEC?.toFixed(4)}</span>
                            <span style={{ fontSize: 9, color: c.textDimmer }}>ZEC</span>
                          </div>
                          <div style={{ fontSize: 10, color: c.textDimmer }}>{run.successCount}/{run.totalEmployees}</div>
                        </div>
                        {!isMobile && <span style={{ fontSize: 9, letterSpacing: ".12em", textTransform: "uppercase", padding: "4px 10px", background: run.failureCount > 0 ? c.redBg : c.greenBg, color: run.failureCount > 0 ? c.red : c.green, border: `1px solid ${run.failureCount > 0 ? c.redBorder : c.greenBorder}` }}>{run.failureCount > 0 ? "partial" : "complete"}</span>}
                        <div style={{ color: c.textDimmer, transform: expandedRun === run.runId ? "rotate(180deg)" : "none", transition: "transform .2s" }}><I.Chevron /></div>
                      </div>
                    </div>
                    {expandedRun === run.runId && run.results?.length > 0 && (
                      <div style={{ borderTop: `1px solid ${c.borderGap}`, padding: isMobile ? "12px 14px 16px" : "14px 24px 18px" }} onClick={e => e.stopPropagation()}>
                        <div style={{ fontSize: 9, color: c.textDimmer, letterSpacing: ".14em", textTransform: "uppercase", marginBottom: 10 }}>Transaction breakdown</div>
                        {run.results.map(r => (
                          <div key={r.employeeId} style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 10, padding: "8px 0", borderBottom: `1px solid ${c.borderGap}` }}>
                            <span style={{ color: r.status === "sent" ? c.green : c.red, flexShrink: 0 }}>{r.status === "sent" ? "✓" : "✗"}</span>
                            <span style={{ color: c.textMuted, width: 130, flexShrink: 0, fontSize: 12 }}>{r.name}</span>
                            <div style={{ flex: 1, minWidth: 0 }}><TxPill txId={r.txId} copied={copied[r.txId]} onCopy={copy} c={c} /></div>
                            <span style={{ fontFamily: "'Bebas Neue'", fontSize: 15, color: c.gold, flexShrink: 0 }}>{r.amountZEC?.toFixed(4)} ZEC</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
            <div style={{ marginTop: 1, padding: "12px 24px", background: c.bgCard, fontSize: 10, color: c.textDimmer, lineHeight: 1.9 }}>
              🔒 Individual amounts are shielded via zk-SNARK proofs. · Explorer: <a href="https://testnet.cipherscan.app/" target="_blank" rel="noopener noreferrer" style={{ color: c.blue, textDecoration: "none" }}>testnet.cipherscan.app</a>
            </div>
          </div>
        )}

        {/* ── APPROVALS ── */}
        {tab === "approvals" && (
          <div style={{ animation: "g-slide .25s ease" }}>
            <div className="db-section-head" style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 36 }}>
              <div>
                <div style={{ fontSize: 10, color: c.gold, letterSpacing: ".2em", textTransform: "uppercase", marginBottom: 8 }}>Multisig Workflow</div>
                <h1 style={{ fontFamily: "'Bebas Neue'", fontSize: isMobile ? 36 : 48, letterSpacing: ".02em", lineHeight: 1 }}>APPROVALS</h1>
              </div>
              <button className="db-gold-btn" onClick={fetchPending} disabled={loadingPending}>{loadingPending ? <><Spin size={12} /> Refresh</> : <><I.Refresh /> Refresh</>}</button>
            </div>

            {!multisigActive ? (
              <div style={{ border: `1px solid ${c.redBorder}`, background: c.redBg, padding: "18px 22px", marginBottom: 18, color: c.red }}>
                <div style={{ fontSize: 12, marginBottom: 10 }}>Multisig is not enabled for this workspace yet.</div>
                <div style={{ fontSize: 10, color: c.textMuted }}>Go to Settings → Multisig to configure a workspace approval policy.</div>
              </div>
            ) : (
              <div style={{ border: `1px solid ${c.bgCardHover}`, background: c.bgCard, padding: "22px", marginBottom: 18 }}>
                <div style={{ fontSize: 11, color: c.textFaint, marginBottom: 14 }}>Your workspace is protected by a multisig policy requiring {msPolicy?.threshold} of {msPolicy?.signers.length} signers.</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                  {msPolicy?.signers?.map(s => (
                    <div key={s} style={{ padding: "9px 12px", border: `1px solid ${c.border}`, borderRadius: 8, fontSize: 10, color: c.text, background: c.bgInset }}>{s.slice(0, 8)}…{s.slice(-6)}</div>
                  ))}
                </div>
              </div>
            )}

            {queuedRun && (
              <div style={{ border: `1px solid ${c.goldBorder}`, background: c.goldBg, padding: "16px 20px", marginBottom: 18 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                  <span style={{ color: c.gold, fontSize: 14 }}>⌛</span>
                  <span style={{ fontSize: 11, color: c.text, letterSpacing: ".1em", textTransform: "uppercase" }}>Pending run queued — awaiting approvals</span>
                </div>
                <div style={{ fontSize: 10, color: c.textMuted }}>Run ID: {queuedRun.runId} · {queuedRun.approvalsNeeded} signatures needed · {queuedRun.totalEmployees} recipients</div>
              </div>
            )}

            {loadingPending ? (
              <div style={{ padding: 40, display: "flex", justifyContent: "center" }}><Spin size={28} /></div>
            ) : pendingRuns.length === 0 ? (
              <div style={{ border: `1px solid ${c.border}`, background: c.bgCard, padding: "26px 22px", textAlign: "center", color: c.textDimmer }}>
                <div style={{ fontSize: 20, marginBottom: 8 }}>No pending approvals</div>
                <div style={{ fontSize: 11 }}>Queued payroll runs that require your signature will appear here for approval.</div>
              </div>
            ) : (
              <div style={{ display: "grid", gap: 12 }}>
                {pendingRuns.map(run => (
                  <div key={run.runId} style={{ background: c.bgCard, padding: "18px 20px", border: `1px solid ${c.border}` }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                      <div>
                        <div style={{ fontSize: 10, color: c.textDimmer, letterSpacing: ".12em", textTransform: "uppercase" }}>Pending Run</div>
                        <div style={{ fontFamily: "'Bebas Neue'", fontSize: 18 }}>{run.runId}</div>
                      </div>
                      <div style={{ fontSize: 10, color: c.textMuted }}>Approvals: {run.approvalsCount}/{run.threshold}</div>
                    </div>
                    <div style={{ display: "grid", gap: 10, marginBottom: 16 }}>
                      {run.employees?.map(emp => (
                        <div key={emp.id} style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: c.textMuted }}>
                          <span>{emp.name}</span>
                          <span>{emp.amountZEC.toFixed(4)} ZEC</span>
                        </div>
                      ))}
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                      <button className="db-gold-btn" onClick={() => handleApprove(run)} disabled={signing[run.runId]}>
                        {signing[run.runId] ? <><Spin size={10} /> Signing...</> : "Approve"}
                      </button>
                      {run.ownerKey === session?.publicKey && (
                        <button className="db-danger-btn" onClick={() => handleCancel(run.runId)} disabled={queueing}>Cancel</button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── SETTINGS ── */}
        {tab === "settings" && (
          <div style={{ animation: "g-slide .25s ease" }}>
            <div style={{ marginBottom: 36 }}>
              <div style={{ fontSize: 10, color: c.gold, letterSpacing: ".2em", textTransform: "uppercase", marginBottom: 8 }}>Configuration</div>
              <h1 style={{ fontFamily: "'Bebas Neue'", fontSize: isMobile ? 36 : 48, letterSpacing: ".02em", lineHeight: 1 }}>SETTINGS</h1>
            </div>
            <div className="db-settings-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1, background: c.borderGap }}>
              <div style={{ background: c.bgCard, padding: isMobile ? "20px 16px" : "26px 22px", position: "relative" }}>
                <div style={{ position: "absolute", top: 0, right: 0, width: 1, height: 36, background: c.gold }} />
                <div style={{ position: "absolute", top: 0, right: 0, width: 36, height: 1, background: c.gold }} />
                <div style={{ fontSize: 9, color: c.gold, letterSpacing: ".2em", textTransform: "uppercase", marginBottom: 7 }}>Privacy</div>
                <div style={{ fontFamily: "'Bebas Neue'", fontSize: isMobile ? 20 : 22, letterSpacing: ".04em", lineHeight: 1, marginBottom: 16 }}>VIEWING KEY</div>
                <p style={{ fontSize: 12, color: c.textMuted, lineHeight: 1.8, marginBottom: 18, fontFamily: "'Instrument Serif'", fontStyle: "italic" }}>Share with your accountant for read-only access.</p>
                <CopyRow label="Unified Full Viewing Key" value={session?.viewingKey ?? "—"} copyKey="vk" copied={copied.vk} onCopy={copy} accent={c.green} redact={true} c={c} />
              </div>

              <div style={{ background: c.bgCard, padding: isMobile ? "20px 16px" : "26px 22px", position: "relative" }}>
                <div style={{ position: "absolute", bottom: 0, left: 0, width: 1, height: 36, background: c.borderCard }} />
                <div style={{ position: "absolute", bottom: 0, left: 0, width: 36, height: 1, background: c.borderCard }} />
                <div style={{ fontSize: 9, color: c.gold, letterSpacing: ".2em", textTransform: "uppercase", marginBottom: 7 }}>Automation</div>
                <div style={{ fontFamily: "'Bebas Neue'", fontSize: isMobile ? 20 : 22, letterSpacing: ".04em", lineHeight: 1, marginBottom: 16 }}>PAYROLL SCHEDULE</div>
                <p style={{ fontSize: 12, color: c.textMuted, lineHeight: 1.8, marginBottom: 18, fontFamily: "'Instrument Serif'", fontStyle: "italic" }}>Set a recurring cadence.</p>
                <div style={{ position: "relative", marginBottom: 14 }}>
                  <select className="db-select" value={schedule} onChange={e => setSchedule(e.target.value)}>
                    {SCHEDULE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                  <div style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", color: c.textFaint, pointerEvents: "none" }}><I.Chevron /></div>
                </div>
                {nextDate && (
                  <div style={{ background: c.bgInset, border: `1px solid ${c.border}`, padding: "12px 14px" }}>
                    <div style={{ fontSize: 9, color: c.textDimmer, letterSpacing: ".1em", textTransform: "uppercase", marginBottom: 5 }}>Next payroll</div>
                    <div style={{ fontFamily: "'Bebas Neue'", fontSize: 24, color: daysLeft <= 3 ? c.red : c.gold }}>{nextDate.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}</div>
                    <div style={{ fontSize: 10, color: c.textDimmer, marginTop: 3 }}>{daysLeft} days from today</div>
                  </div>
                )}
              </div>

              <div style={{ background: c.bgCard, padding: isMobile ? "20px 16px" : "26px 22px" }}>
                <div style={{ fontSize: 9, color: c.gold, letterSpacing: ".2em", textTransform: "uppercase", marginBottom: 7 }}>Wallet</div>
                <div style={{ fontFamily: "'Bebas Neue'", fontSize: isMobile ? 20 : 22, letterSpacing: ".04em", lineHeight: 1, marginBottom: 16 }}>DEPOSIT ADDRESS</div>
                <CopyRow label="Unified Address" value={session?.unifiedAddress ?? "—"} copyKey="addr2" copied={copied.addr2} onCopy={copy} accent={c.blue} c={c} />
                <div style={{ fontSize: 10, color: c.textDimmer, lineHeight: 1.8 }}>Deterministically derived from your Ed25519 keypair.</div>
              </div>

              <div style={{ background: c.bgCard, padding: isMobile ? "20px 16px" : "26px 22px", position: "relative" }}>
                <div style={{ position: "absolute", top: 0, right: 0, width: 1, height: 36, background: c.gold }} />
                <div style={{ position: "absolute", top: 0, right: 0, width: 36, height: 1, background: c.gold }} />
                <div style={{ fontSize: 9, color: c.gold, letterSpacing: ".2em", textTransform: "uppercase", marginBottom: 7 }}>Multisig</div>
                <div style={{ fontFamily: "'Bebas Neue'", fontSize: isMobile ? 20 : 22, letterSpacing: ".04em", lineHeight: 1, marginBottom: 16 }}>WORKSPACE APPROVALS</div>
                <p style={{ fontSize: 12, color: c.textMuted, lineHeight: 1.8, marginBottom: 18, fontFamily: "'Instrument Serif'", fontStyle: "italic" }}>
                  Enable multisig payroll approvals so runs require multiple signers before dispatch.
                </p>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 14 }}>
                  <div style={{ flex: 1, minWidth: 120 }}>
                    <div style={{ fontSize: 10, color: c.textDimmer, marginBottom: 6 }}>Threshold</div>
                    <input className="db-input" type="number" min="1" value={msThreshold} onChange={e => setMsThresh(Number(e.target.value) || 1)} />
                  </div>
                  <div style={{ flex: 2, minWidth: 160 }}>
                    <div style={{ fontSize: 10, color: c.textDimmer, marginBottom: 6 }}>Signers</div>
                    {msSigners.map((signer, idx) => (
                      <input key={`${signer}-${idx}`} className="db-input" value={signer} onChange={e => setMsSigners(prev => prev.map((s, i) => i === idx ? e.target.value : s))} placeholder="Ed25519 public key" style={{ marginBottom: 8 }} />
                    ))}
                    <button className="db-icon-btn" style={{ width: "100%" }} onClick={() => setMsSigners(prev => [...prev, ""])}>+ Add signer</button>
                  </div>
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 10 }}>
                  <button className="db-gold-btn" onClick={handleSaveMultisig} disabled={savingMs}>{savingMs ? <><Spin size={10} /> Saving...</> : "Save Policy"}</button>
                  {msPolicy && <button className="db-danger-btn" onClick={handleDisableMultisig} disabled={savingMs}>Disable Multisig</button>}
                </div>
                {msErr && <div style={{ fontSize: 10, color: c.red, marginTop: 10 }}>{msErr}</div>}
                {msPolicy && (
                  <div style={{ marginTop: 16, fontSize: 10, color: c.textDimmer }}>
                    Policy active: {msPolicy.threshold} of {msPolicy.signers.length} signers required.
                  </div>
                )}
              </div>

              <div style={{ background: c.bgCard, padding: isMobile ? "20px 16px" : "26px 22px" }}>
                <div style={{ fontSize: 9, color: c.red, letterSpacing: ".2em", textTransform: "uppercase", marginBottom: 7 }}>Session</div>
                <div style={{ fontFamily: "'Bebas Neue'", fontSize: isMobile ? 20 : 22, letterSpacing: ".04em", lineHeight: 1, marginBottom: 16 }}>WORKSPACE ACCESS</div>
                <p style={{ fontSize: 12, color: c.textMuted, lineHeight: 1.8, marginBottom: 18, fontFamily: "'Instrument Serif'", fontStyle: "italic" }}>Session is active for this browser tab only. Your wallet is always recoverable from your Ed25519 keypair.</p>
                <button className="db-ghost-btn" onClick={onLogout} style={{ borderColor: c.redBorder, color: c.red }}
                  onMouseEnter={e => { e.currentTarget.style.background = c.redBg; }}
                  onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}>
                  Log Out &amp; Clear Session
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ══ VIEWING KEY PANEL ══ */}
      {showVkPanel && (
        <>
          <div style={{ position: "fixed", inset: 0, background: c.bgOverlay, zIndex: 149, backdropFilter: "blur(4px)" }} onClick={() => setShowVkPanel(false)} />
          <div className="db-vk-panel">
            <div style={{ position: "absolute", top: 0, left: 0, width: 1, height: 48, background: c.gold }} />
            <div style={{ position: "absolute", top: 0, left: 0, width: 48, height: 1, background: c.gold }} />
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
              <div>
                <div style={{ fontSize: 9, color: c.gold, letterSpacing: ".18em", textTransform: "uppercase", marginBottom: 5 }}>Privacy</div>
                <div style={{ fontFamily: "'Bebas Neue'", fontSize: 26, letterSpacing: ".04em", lineHeight: 1 }}>VIEWING KEY</div>
              </div>
              <button className="db-icon-btn" onClick={() => setShowVkPanel(false)}><I.X /></button>
            </div>
            <p style={{ fontSize: 12, color: c.textMuted, lineHeight: 1.8, marginBottom: 22, fontFamily: "'Instrument Serif'", fontStyle: "italic" }}>Share with your accountant. Read-only — no spending access.</p>
            <CopyRow label="Unified Full Viewing Key" value={session?.viewingKey ?? "—"} copyKey="vk2" copied={copied.vk2} onCopy={copy} accent={c.green} redact={true} c={c} />
            <div style={{ background: c.bgInset, border: `1px solid ${c.greenBorder}`, padding: "12px 14px", marginTop: 8, fontSize: 10, color: c.green, lineHeight: 1.9, opacity: .8 }}>
              ✓ Read-only · Can verify payments<br />✓ Cannot spend or move funds<br />✓ For accountants &amp; auditors<br />✗ Never share your private key
            </div>
          </div>
        </>
      )}

      {/* ══ SCHEDULE MODAL ══ */}
      {showSchedModal && (
        <div style={{ position: "fixed", inset: 0, background: c.bgOverlay, display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200, backdropFilter: "blur(8px)", cursor: "crosshair", padding: 16 }} onClick={() => setShowSchedModal(false)}>
          <div style={{ background: c.bgCard, border: `1px solid ${c.borderCard}`, padding: isMobile ? "28px 20px" : "36px", width: "100%", maxWidth: 420, animation: "g-slide .2s ease", position: "relative" }} onClick={e => e.stopPropagation()}>
            <div style={{ position: "absolute", top: 0, right: 0, width: 1, height: 40, background: c.gold }} />
            <div style={{ position: "absolute", top: 0, right: 0, width: 40, height: 1, background: c.gold }} />
            <div style={{ fontSize: 9, color: c.gold, letterSpacing: ".18em", textTransform: "uppercase", marginBottom: 8 }}>Automation</div>
            <div style={{ fontFamily: "'Bebas Neue'", fontSize: 32, letterSpacing: ".02em", marginBottom: 22, lineHeight: 1 }}>SET SCHEDULE</div>
            {SCHEDULE_OPTIONS.map(o => (
              <div key={o.value} className={`db-sched-opt ${schedule === o.value ? "sel" : ""}`} onClick={() => setSchedule(o.value)}>
                <div style={{ width: 18, height: 18, border: `1px solid ${schedule === o.value ? c.gold : c.borderStrong}`, background: schedule === o.value ? c.bgInset : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "all .2s" }}>
                  {schedule === o.value && <span style={{ color: c.gold, fontSize: 11 }}>✓</span>}
                </div>
                <div>
                  <div style={{ fontSize: 13, color: schedule === o.value ? c.gold : c.textMuted }}>{o.label}</div>
                  {o.value !== "none" && schedule === o.value && nextDate && (
                    <div style={{ fontSize: 10, color: c.textDimmer, marginTop: 2 }}>Next: {nextDate.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })} · {daysLeft} days</div>
                  )}
                </div>
              </div>
            ))}
            <button className="db-gold-btn" style={{ width: "100%", marginTop: 14 }} onClick={() => setShowSchedModal(false)}>Save Schedule</button>
          </div>
        </div>
      )}

      {/* ══ ADD MEMBER MODAL ══ */}
      {showModal && (
        <div style={{ position: "fixed", inset: 0, background: c.bgOverlay, display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200, backdropFilter: "blur(10px)", cursor: "crosshair", padding: 16 }} onClick={() => setShowModal(false)}>
          <div style={{ background: c.bgCard, border: `1px solid ${c.borderCard}`, padding: isMobile ? "28px 20px" : "36px", width: "100%", maxWidth: 500, animation: "g-slide .2s ease", position: "relative", maxHeight: "90vh", overflowY: "auto" }} onClick={e => e.stopPropagation()}>
            <div style={{ position: "absolute", top: 0, right: 0, width: 1, height: 44, background: c.gold }} />
            <div style={{ position: "absolute", top: 0, right: 0, width: 44, height: 1, background: c.gold }} />
            <div style={{ fontSize: 9, color: c.gold, letterSpacing: ".2em", textTransform: "uppercase", marginBottom: 7 }}>New team member</div>
            <div style={{ fontFamily: "'Bebas Neue'", fontSize: 32, letterSpacing: ".02em", marginBottom: 24, lineHeight: 1 }}>ADD TO ROSTER</div>
            {[
              { label: "Full Name", key: "name", placeholder: "Amara Osei", hint: "" },
              { label: "Role", key: "role", placeholder: "Lead Engineer", hint: "" },
              { label: "Zcash Testnet Address", key: "address", placeholder: "utest1... or u1...", hint: "Unified testnet address · testnet.zecfaucet.com" },
              { label: "Salary per cycle (ZEC)", key: "salary", placeholder: "0.45", hint: "" },
            ].map(f => (
              <div key={f.key} style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 9, color: c.textFaint, letterSpacing: ".14em", textTransform: "uppercase", marginBottom: 6 }}>{f.label}</div>
                <input className={`db-input${f.key === "address" && addrError ? " err" : ""}`} placeholder={f.placeholder} value={newEmp[f.key]}
                  onChange={e => { setNewEmp({ ...newEmp, [f.key]: e.target.value }); if (f.key === "address") setAddrError(""); }}
                  onKeyDown={e => e.key === "Enter" && addEmployee()} />
                {f.key === "address" && addrError && <div style={{ fontSize: 10, color: c.red, marginTop: 4, lineHeight: 1.6 }}>{addrError}</div>}
                {f.hint && !addrError && <div style={{ fontSize: 9, color: c.textDimmer, marginTop: 3 }}>{f.hint}</div>}
              </div>
            ))}
            <div style={{ display: "flex", gap: 10, marginTop: 22 }}>
              <button className="db-gold-btn" style={{ flex: 1 }} onClick={addEmployee}><I.Plus /> Add to Roster</button>
              <button className="db-ghost-btn" onClick={() => { setShowModal(false); setAddrError(""); }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {removeTarget && <RemoveModal employee={removeTarget} onConfirm={confirmRemove} onCancel={() => setRemoveTarget(null)} c={c} />}
    </div>
  );
}