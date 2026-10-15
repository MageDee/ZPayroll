import { useState, useEffect } from "react";
import { useTheme, useBreakpoint, t, ThemeToggle, Mark, globalCss } from "./theme";
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
  Home: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="9" rx="2" /><rect x="14" y="3" width="7" height="5" rx="2" /><rect x="14" y="12" width="7" height="9" rx="2" /><rect x="3" y="16" width="7" height="5" rx="2" /></svg>,
  Users: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>,
  List: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" /><circle cx="3.5" cy="6" r="1" /><circle cx="3.5" cy="12" r="1" /><circle cx="3.5" cy="18" r="1" /></svg>,
  Gear: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" /></svg>,
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
      <div style={{ fontSize: 11, color: c.textFaint, letterSpacing: ".01em", textTransform: "none", marginBottom: 6 }}>{label}</div>
      <div style={{ borderRadius: 18, background: c.bgInset, border: `1px solid ${accent}22`, padding: "12px 14px", display: "flex", alignItems: "flex-start", gap: 10 }}>
        <div style={{ flex: 1, fontSize: 13, color: accent, wordBreak: "break-all", lineHeight: 1.7, fontFamily: "'DM Mono', monospace", filter: revealed ? "none" : "blur(5px)", userSelect: revealed ? "auto" : "none", transition: "filter .2s" }}>{value}</div>
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
      <span style={{ fontSize: 13, fontFamily: "'DM Mono', monospace", color: c.textFaint, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 200 }} title={txId}>{txId}</span>
      <button className="db-icon-btn" style={{ padding: "3px 7px" }} onClick={e => { e.stopPropagation(); onCopy(txId, txId); }}>{copied ? <I.Check /> : <I.Copy />}</button>
      <a href={`${EXPLORER_BASE}${txId}`} target="_blank" rel="noopener noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12, color: c.blue, textDecoration: "none", padding: "3px 7px", border: `1px solid ${c.borderCard}`, background: c.bgCard, transition: "all .2s" }} onClick={e => e.stopPropagation()}>
        <I.Link /> Explorer
      </a>
    </div>
  );
}

function EmptyState({ icon, title, sub, action, c }) {
  return (
    <div style={{ background: c.bgCard, border: `1px solid ${c.borderCard}`, borderRadius: 28, padding: "clamp(40px, 9vw, 72px) 24px", textAlign: "center" }}>
      <div style={{ width: 56, height: 56, borderRadius: "50%", margin: "0 auto 18px", display: "grid", placeItems: "center", background: c.goldBg, color: c.goldText }}>{icon}</div>
      <div style={{ fontFamily: "'Unbounded', sans-serif", fontWeight: 700, fontSize: 20, letterSpacing: "-.02em", marginBottom: 10 }}>{title}</div>
      <p style={{ fontSize: 15, color: c.textMuted, maxWidth: 380, margin: "0 auto", marginBottom: action ? 24 : 0, lineHeight: 1.6 }}>{sub}</p>
      {action && <button className="db-gold-btn" onClick={action.fn} style={{ margin: "0 auto" }}>{action.label}</button>}
    </div>
  );
}

function RemoveModal({ employee, onConfirm, onCancel, c }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: c.bgOverlay, display: "flex", alignItems: "center", justifyContent: "center", zIndex: 300, backdropFilter: "blur(8px)", cursor: "pointer", padding: 16 }} onClick={onCancel}>
      <div style={{ borderRadius: 18, background: c.bgCard, border: `1px solid ${c.redBorder}`, padding: 32, width: "100%", maxWidth: 400, animation: "g-slide .2s ease", position: "relative", borderRadius: 28 }} onClick={e => e.stopPropagation()}>
        <div style={{ fontSize: 11, color: c.red, letterSpacing: ".01em", textTransform: "none", marginBottom: 8 }}>Confirm removal</div>
        <div style={{ fontFamily: "'Unbounded', sans-serif", fontSize: 21, letterSpacing: "-.02em", fontWeight: 700, marginBottom: 14, lineHeight: 1.2 }}>Remove member?</div>
        <div style={{ borderRadius: 18, background: c.bgInset, border: `1px solid ${c.borderCard}`, padding: "12px 14px", marginBottom: 18 }}>
          <div style={{ fontSize: 14, color: c.text, marginBottom: 3 }}>{employee.name}</div>
          <div style={{ fontSize: 13, color: c.textMuted }}>{employee.role}</div>
          <div style={{ fontSize: 12, color: c.textDimmer, marginTop: 5, wordBreak: "break-all", lineHeight: 1.5 }}>{employee.address.slice(0, 30)}...</div>
        </div>
        <p style={{ fontSize: 13, color: c.textMuted, lineHeight: 1.7, fontStyle: "normal", marginBottom: 22 }}>This member will no longer receive shielded payments. Past transactions are unaffected.</p>
        <div style={{ display: "flex", gap: 10 }}>
          <button className="db-ghost-btn" style={{ flex: 1, borderColor: c.redBorder, color: c.red }} onClick={onConfirm}><I.Trash /> Remove</button>
          <button className="db-gold-btn" style={{ flex: 1 }} onClick={onCancel}>Keep member</button>
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
  const [schedule, setSchedule] = useState("none");
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
      "pkcs8",
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

    .db-topbar { position:sticky;top:0;z-index:50;display:flex;align-items:center;justify-content:space-between;gap:12px;padding:10px ${isMobile ? "12px" : "28px"};background:${c.bgNav};-webkit-backdrop-filter:blur(16px);backdrop-filter:blur(16px);border-bottom:1px solid ${c.border}; }
    .db-brand { display:flex;align-items:center;gap:10px; }
    .db-brand b { font-family:'Unbounded',sans-serif;font-weight:700;font-size:16px;letter-spacing:-.02em; }
    .db-badge { font-size:11px;font-weight:700;color:${c.goldText};border:1px solid ${c.borderStrong};border-radius:999px;padding:2px 9px; }
    .db-top-r { display:flex;align-items:center;gap:${isMobile ? "6px" : "10px"}; }
    .db-status { display:inline-flex;align-items:center;gap:7px;font-size:13px;font-weight:600;color:${c.textMuted}; }
    .db-status i { width:8px;height:8px;border-radius:50%;display:inline-block; }
    .db-chip { display:inline-flex;align-items:center;gap:8px;border:1px solid ${c.borderStrong};border-radius:999px;padding:7px 12px;font-size:12px;color:${c.textMuted};font-family:'DM Mono',monospace; }

    .db-tabs { display:flex;gap:4px;background:${c.bgInset};border:1px solid ${c.border};border-radius:999px;padding:4px; }
    .db-tab { background:none;border:none;border-radius:999px;font-family:inherit;font-size:14px;font-weight:700;color:${c.textMuted};padding:9px 18px;cursor:pointer;transition:background .2s,color .2s; }
    .db-tab:hover { color:${c.text}; }
    .db-tab.on { background:${c.goldFill};color:${c.onGold}; }

    .db-bottom { position:fixed;left:10px;right:10px;bottom:10px;z-index:60;display:flex;gap:2px;background:${c.bgNav};-webkit-backdrop-filter:blur(18px);backdrop-filter:blur(18px);border:1px solid ${c.borderStrong};border-radius:26px;padding:6px; }
    .db-bottom button { flex:1;display:flex;flex-direction:column;align-items:center;gap:3px;background:none;border:none;border-radius:20px;color:${c.textFaint};font-family:inherit;font-size:11px;font-weight:700;padding:8px 2px;cursor:pointer;transition:background .2s,color .2s; }
    .db-bottom button.on { background:${c.goldFill};color:${c.onGold}; }

    .db-banner { display:flex;align-items:center;gap:10px;flex-wrap:wrap;border-radius:18px;padding:12px 16px;margin-top:14px;font-size:14px;border:1px solid ${c.border}; }
    .db-banner.err { background:${c.redBg};color:${c.red};border-color:${c.redBorder}; }
    .db-banner .db-icon-btn { margin-left:auto; }

    .db-stat { background:${c.bgCard};border:1px solid ${c.borderCard};border-radius:24px;padding:${isMobile ? "18px 16px" : "22px 20px"};position:relative;overflow:hidden;animation:g-fadeUp .45s ease both; }
    .db-stat:nth-child(1){animation-delay:.04s}.db-stat:nth-child(2){animation-delay:.08s}.db-stat:nth-child(3){animation-delay:.12s}.db-stat:nth-child(4){animation-delay:.16s}.db-stat:nth-child(5){animation-delay:.2s}

    .db-gold-btn { display:inline-flex;align-items:center;justify-content:center;gap:8px;min-height:46px;background:${c.goldFill};color:${c.onGold};border:1px solid transparent;border-radius:999px;font-family:inherit;font-size:14px;font-weight:700;padding:0 22px;cursor:pointer;transition:filter .2s,transform .15s;white-space:nowrap; }
    .db-gold-btn:hover:not(:disabled) { filter:brightness(1.08); }
    .db-gold-btn:active:not(:disabled) { transform:scale(.985); }
    .db-gold-btn:disabled { opacity:.45;cursor:not-allowed; }

    .db-ghost-btn { display:inline-flex;align-items:center;justify-content:center;gap:8px;min-height:44px;background:transparent;color:${c.text};border:1px solid ${c.borderStrong};border-radius:999px;font-family:inherit;font-size:14px;font-weight:700;padding:0 20px;cursor:pointer;transition:border-color .2s,background .2s;white-space:nowrap; }
    .db-ghost-btn:hover { border-color:${c.gold}; }

    .db-icon-btn { display:inline-flex;align-items:center;gap:6px;min-height:36px;background:transparent;border:1px solid ${c.borderStrong};border-radius:999px;font-family:inherit;font-size:13px;font-weight:700;color:${c.text};padding:0 13px;cursor:pointer;transition:border-color .2s,color .2s; }
    .db-icon-btn:hover:not(:disabled) { border-color:${c.gold}; }
    .db-icon-btn:disabled { opacity:.4;cursor:not-allowed; }

    .db-danger-btn { display:inline-flex;align-items:center;gap:6px;min-height:36px;background:transparent;border:1px solid ${c.redBorder};border-radius:999px;font-family:inherit;font-size:13px;font-weight:700;color:${c.red};padding:0 13px;cursor:pointer;transition:background .2s; }
    .db-danger-btn:hover:not(:disabled) { background:${c.redBg}; }
    .db-danger-btn:disabled { opacity:.45;cursor:not-allowed; }

    .db-input { width:100%;background:${c.bgInset};border:1px solid ${c.borderStrong};border-radius:16px;padding:13px 15px;color:${c.text};font-family:inherit;font-size:14px;outline:none;transition:border-color .2s,box-shadow .2s; }
    .db-input:focus { border-color:${c.gold};box-shadow:0 0 0 3px rgba(244,183,40,.18); }
    .db-input::placeholder { color:${c.textFaint}; }
    .db-input.err { border-color:${c.red}; }

    .db-select { background:${c.bgInset};border:1px solid ${c.borderStrong};border-radius:16px;padding:13px 40px 13px 15px;color:${c.text};font-family:inherit;font-size:14px;outline:none;cursor:pointer;appearance:none;-webkit-appearance:none;width:100%;transition:border-color .2s; }
    .db-select:focus { border-color:${c.gold}; }

    .db-emp-row { display:grid;grid-template-columns:${isMobile ? "1fr 80px" : "1.1fr 1fr 1.4fr 110px 90px 110px"};gap:${isMobile ? "8px" : "14px"};align-items:center;padding:${isMobile ? "12px 14px" : "14px 24px"};border-bottom:1px solid ${c.border};transition:background .15s; }
    .db-emp-row:last-child { border-bottom:none; }
    .db-emp-row:hover { background:${c.bgCardHover}; }

    .db-hist-row { background:${c.bgCard};border:1px solid ${c.borderCard};border-radius:22px;cursor:pointer;overflow:hidden;transition:border-color .15s; }
    .db-hist-row:hover { border-color:${c.borderStrong}; }

    .db-vk-panel { position:fixed;top:0;right:0;bottom:0;width:${isMobile ? "100%" : "420px"};background:${c.bgCard};border-left:1px solid ${c.borderCard};${isMobile ? "" : "border-radius:28px 0 0 28px;"}z-index:150;padding:${isMobile ? "24px 18px" : "32px 28px"};overflow-y:auto;animation:g-slide .25s ease; }

    .db-export-menu { position:absolute;top:calc(100% + 6px);right:0;background:${c.bgCard};border:1px solid ${c.borderStrong};border-radius:18px;overflow:hidden;min-width:190px;z-index:100;animation:g-fadeIn .15s ease; }
    .db-export-item { display:flex;align-items:center;gap:10px;padding:12px 16px;font-size:14px;font-weight:600;color:${c.textMuted};cursor:pointer;transition:background .15s,color .15s;border-bottom:1px solid ${c.border}; }
    .db-export-item:last-child { border-bottom:none; }
    .db-export-item:hover { background:${c.bgCardHover};color:${c.text}; }

    .db-sched-opt { display:flex;align-items:center;gap:12px;padding:13px 16px;border:1px solid ${c.borderCard};border-radius:18px;cursor:pointer;transition:border-color .2s;margin-bottom:8px; }
    .db-sched-opt:hover { border-color:${c.borderStrong}; }
    .db-sched-opt.sel { border-color:${c.gold};background:${c.bgInset}; }

    .db-warn { animation:g-warn 2.5s ease-in-out infinite; }

    @keyframes g-warn  { 0%,100%{border-color:${c.redBorder}} 50%{border-color:${c.red}60} }
    @keyframes g-slide { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }

    @media (max-width:767px) {
      .db-stat-grid { grid-template-columns:1fr 1fr!important; }
      .db-stat:last-child { grid-column:1 / -1; }
      .db-bottom-grid { grid-template-columns:1fr!important; }
      .db-settings-grid { grid-template-columns:1fr!important; }
      .db-section-head { flex-direction:column;gap:12px;align-items:flex-start!important; }
      .db-input, .db-select { font-size:16px; }
    }
    @media (max-width:480px) { .db-brand b { display:none; } }
    @media (min-width:768px) and (max-width:1023px) {
      .db-stat-grid { grid-template-columns:repeat(3,1fr)!important; }
    }
  `;

  const TABS = ["dashboard", "team", "history", "approvals", "settings"];
  const TAB_LABEL = { dashboard: "Overview", team: "Team", history: "History", approvals: "Approvals", settings: "Settings" };
  const TAB_ICON  = { dashboard: <I.Home />, team: <I.Users />, history: <I.List />, approvals: <I.Shield />, settings: <I.Gear /> };

  return (
    <div style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif", background: c.bg, minHeight: "100vh", color: c.text, position: "relative", overflowX: "hidden", lineHeight: 1.6 }}>
      <style>{css}</style>
      <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: 420, background: c.hero, pointerEvents: "none", zIndex: 0 }} />

      {/* ══ TOP BAR ══ */}
      <header className="db-topbar">
        <div className="db-brand">
          <Mark />
          <b>ZPayroll</b>
          {!isMobile && <span className="db-badge">Testnet</span>}
        </div>
        {!isMobile && (
          <nav className="db-tabs" aria-label="Workspace sections">
            {TABS.map(tb => <button key={tb} className={`db-tab ${tab === tb ? "on" : ""}`} onClick={() => setTab(tb)} aria-current={tab === tb ? "page" : undefined}>{TAB_LABEL[tb]}</button>)}
          </nav>
        )}
        <div className="db-top-r">
          <ThemeToggle />
          <button className="db-icon-btn" onClick={() => setShowVkPanel(true)} aria-label="Viewing key"><I.Key />{!isMobile && " Viewing key"}</button>
          {!isMobile && (
            <div className="db-status"><i style={{ background: dotColor, boxShadow: `0 0 8px ${dotColor}` }} />{walletErr ? "Offline" : walletReady ? "Connected" : "Syncing"}</div>
          )}
          {!isMobile && session?.publicKey && (
            <span className="db-chip">{session.publicKey.slice(0, 8)}···{session.publicKey.slice(-6)}</span>
          )}
          {onLogout && <button className="db-ghost-btn" onClick={onLogout} style={{ minHeight: 38, padding: "0 14px" }}>Log out</button>}
        </div>
      </header>

      {/* Banners */}
      <div style={{ position: "relative", zIndex: 2, maxWidth: 1200, margin: "0 auto", padding: `0 ${isMobile ? "16px" : "48px"}` }}>
        {walletErr && (
          <div className="db-banner err" role="alert">
            <I.Alert /><span>{walletErr}</span>
            <button className="db-icon-btn" onClick={boot}>Retry</button>
          </div>
        )}
        {!canAfford && balance !== null && total > 0 && (
          <div className="db-banner err db-warn">
            <I.Alert /><span>Insufficient funds. You need <strong>{total.toFixed(4)} ZEC</strong> and have <strong>{balance.toFixed(4)} ZEC</strong> (short by {shortfall} ZEC).</span>
            <a href={FAUCET_URL} target="_blank" rel="noopener noreferrer" style={{ marginLeft: "auto", color: c.red, fontWeight: 700 }}>Get testnet ZEC</a>
          </div>
        )}
      </div>

      {/* ══ CONTENT ══ */}
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: isMobile ? "24px 16px 120px" : "40px 48px 64px", position: "relative", zIndex: 1 }}>

        {/* ── DASHBOARD ── */}
        {tab === "dashboard" && (
          <div style={{ animation: "g-slide .25s ease" }}>
            <div className="db-section-head" style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 36 }}>
              <div>
                <h1 style={{ fontFamily: "'Unbounded', sans-serif", fontSize: isMobile ? 22 : 30, letterSpacing: "-.02em", fontWeight: 700, lineHeight: 1.2 }}>Payroll overview</h1>
              </div>
              {!isMobile && <p style={{ fontSize: 14, color: c.textMuted, fontStyle: "normal", textAlign: "right", maxWidth: 240, lineHeight: 1.6 }}>Salaries are cryptographically hidden on-chain.</p>}
            </div>

            {result && (
              <div style={{ borderRadius: 18, border: `1px solid ${c.greenBorder}`, background: c.greenBg, padding: "16px 20px", marginBottom: 12, animation: "g-fadeIn .3s ease" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                  <span style={{ color: c.green, fontSize: 14 }}>✓</span>
                  <span style={{ fontSize: 13, color: c.green, letterSpacing: ".01em", textTransform: "none" }}>Payroll complete: {result.successCount}/{result.totalEmployees} dispatched</span>
                  <button className="db-icon-btn" style={{ marginLeft: "auto", padding: "3px 7px" }} onClick={() => setResult(null)}><I.X /></button>
                </div>
                {result.results?.map(r => (
                  <div key={r.employeeId} style={{ fontSize: 12, color: c.textMuted, marginTop: 4, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <span>✓ {r.name} · {r.amountZEC?.toFixed(4)} ZEC</span>
                    {r.txId && <TxPill txId={r.txId} copied={copied[r.txId]} onCopy={copy} c={c} />}
                  </div>
                ))}
              </div>
            )}
            {queuedRun && (
              <div style={{ borderRadius: 18, border: `1px solid ${c.goldBorder}`, background: c.goldBg, padding: "16px 20px", marginBottom: 12, animation: "g-fadeIn .3s ease" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                  <span style={{ color: c.gold, fontSize: 14 }}>●</span>
                  <span style={{ fontSize: 13, color: c.text, letterSpacing: ".01em", textTransform: "none" }}>Payroll queued for multisig approval ({queuedRun.totalEmployees} recipients)</span>
                  <button className="db-icon-btn" style={{ marginLeft: "auto", padding: "3px 7px" }} onClick={() => setQueuedRun(null)}><I.X /></button>
                </div>
                <div style={{ fontSize: 12, color: c.textMuted }}>Run ID: {queuedRun.runId} · {queuedRun.approvalsNeeded} approvals needed · {queuedRun.totalZEC.toFixed(4)} ZEC</div>
              </div>
            )}
            {runErr && (
              <div style={{ borderRadius: 18, border: `1px solid ${c.redBorder}`, background: c.redBg, padding: "13px 20px", marginBottom: 12, display: "flex", alignItems: "center", gap: 10, fontSize: 13, color: c.red }}>
                <I.Alert />{runErr}
                <button className="db-icon-btn" style={{ marginLeft: "auto", padding: "3px 7px" }} onClick={() => setRunErr(null)}><I.X /></button>
              </div>
            )}

            {/* Stats */}
            <div className="db-stat-grid" style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 12, marginBottom: 12 }}>
              {[
                { label: "Wallet Balance", color: c.gold, val: loadingBal ? null : balance !== null ? balance.toFixed(4) : "—", unit: "ZEC", sub: loadingBal ? "fetching..." : walletErr ? "offline" : "live · testnet", extra: <button className="db-icon-btn" style={{ marginTop: 12 }} onClick={fetchBal} disabled={loadingBal}>{loadingBal ? <Spin size={9} /> : <I.Refresh />} Refresh</button> },
                { label: "Next Payroll", color: c.blue, val: total.toFixed(2), unit: "ZEC", sub: `${active.length} active employees` },
                { label: "Runway", color: canAfford ? c.green : c.red, val: String(runway), unit: runway !== "—" ? "cycles" : "", sub: !canAfford && balance !== null ? `⚠ short ${shortfall} ZEC` : "at current rate" },
                { label: "All-time Paid", color: c.gold, val: allPaid.toFixed(2), unit: "ZEC", sub: `across ${history.length} runs` },
                { label: "Next Run", color: daysLeft !== null && daysLeft <= 3 ? c.red : c.gold, val: daysLeft !== null ? String(daysLeft) : "—", unit: daysLeft !== null ? "days" : "", sub: nextDate ? nextDate.toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "No schedule", extra: <button className="db-icon-btn" style={{ marginTop: 12 }} onClick={() => setShowSchedModal(true)}><I.Cal /> Change</button> },
              ].map((s, i) => (
                <div key={i} className="db-stat">
                  <div style={{ fontSize: 11, color: c.textDimmer, letterSpacing: ".01em", textTransform: "none", marginBottom: 14 }}>{s.label}</div>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 5, marginBottom: 5 }}>
                    {s.val === null ? <Spin size={20} color={s.color} /> : <span style={{ fontFamily: "'Unbounded', sans-serif", fontSize: isMobile ? 18 : 21, color: s.color, letterSpacing: "-.02em", fontWeight: 700, lineHeight: 1.2 }}>{s.val}</span>}
                    {s.unit && <span style={{ fontSize: 11, color: c.textDimmer, letterSpacing: ".01em", textTransform: "none" }}>{s.unit}</span>}
                  </div>
                  <div style={{ fontSize: 12, color: c.textDimmer }}>{s.sub}</div>
                  {s.extra}
                </div>
              ))}
            </div>

            {/* Bottom panels */}
            <div className="db-bottom-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              {/* Deposit address */}
              <div style={{ background: c.bgCard, border: `1px solid ${c.borderCard}`, borderRadius: 24, padding: isMobile ? "20px 18px" : "26px 24px", position: "relative" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                  <div>
                    <div style={{ fontSize: 11, color: c.gold, letterSpacing: ".01em", textTransform: "none", marginBottom: 5 }}>Your wallet</div>
                    <div style={{ fontFamily: "'Unbounded', sans-serif", fontSize: isMobile ? 16 : 17, letterSpacing: "-.02em", fontWeight: 700, lineHeight: 1.2 }}>Deposit address</div>
                  </div>
                  <button className="db-icon-btn" onClick={handleSync} disabled={syncing}>{syncing ? <Spin size={10} /> : <I.Refresh />}{syncing ? "Syncing" : "Sync"}</button>
                </div>
                <div style={{ borderRadius: 18, background: c.bgInset, border: `1px solid ${c.border}`, padding: "11px 13px", display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 10 }}>
                  <div style={{ flex: 1, fontSize: 12, color: session?.unifiedAddress ? c.blue : c.textDimmer, wordBreak: "break-all", lineHeight: 1.7 }}>{session?.unifiedAddress ?? "Loading..."}</div>
                  <button className="db-icon-btn" onClick={() => copy("addr", session?.unifiedAddress)} disabled={!session?.unifiedAddress} style={{ flexShrink: 0, marginTop: 1 }}>{copied.addr ? <><I.Check />Copied</> : <><I.Copy />Copy</>}</button>
                </div>
                <p style={{ fontSize: 12, color: c.textDimmer, lineHeight: 1.8 }}>Fund with testnet ZEC · <a href={FAUCET_URL} target="_blank" rel="noopener noreferrer" style={{ color: c.blue, textDecoration: "none" }}>testnet.zecfaucet.com</a></p>
              </div>

              {/* Run payroll */}
              <div style={{ background: c.bgCard, border: `1px solid ${c.borderCard}`, borderRadius: 24, padding: isMobile ? "20px 18px" : "26px 24px", display: "flex", flexDirection: "column", justifyContent: "space-between", position: "relative" }}>
                <div>
                  <div style={{ fontSize: 11, color: running ? c.green : c.gold, letterSpacing: ".01em", textTransform: "none", marginBottom: 7, transition: "color .3s" }}>{running ? "Generating zk-SNARK Proofs" : "Payroll Execution"}</div>
                  <div style={{ fontFamily: "'Unbounded', sans-serif", fontSize: isMobile ? 16 : 17, letterSpacing: "-.02em", fontWeight: 700, lineHeight: 1, marginBottom: 10 }}>{running ? "Dispatching…" : "Run payroll"}</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 5, marginBottom: 10 }}>
                    {active.slice(0, 3).map(e => (
                      <div key={e.id} style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                        <span style={{ color: c.textMuted }}>{e.name}</span>
                        <span style={{ fontFamily: "'Unbounded', sans-serif", fontSize: 14, color: c.gold }}>{e.salary.toFixed(2)} ZEC</span>
                      </div>
                    ))}
                    {active.length > 3 && <div style={{ fontSize: 12, color: c.textDimmer }}>+{active.length - 3} more</div>}
                  </div>
                  <p style={{ fontSize: 13, color: c.textDimmer, lineHeight: 1.7, fontStyle: "normal" }}>
                    {active.length === 0
                      ? "Your team is empty. Add a member to run payroll."
                      : running
                      ? "Proofs generating. Do not close this tab."
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
                  onClick={active.length === 0 ? () => setTab("team") : handleRun}
                  disabled={active.length > 0 && (running || !walletReady || !canAfford || balance === null)}
                >
                  {running
                    ? <><Spin size={12} color={isDark ? "#33280a" : "#aa8800"} /> {multisigActive ? "Queueing Payroll..." : "Sending Shielded Transactions..."}</>
                    : active.length === 0 ? <><I.Plus /> Add team members</> : <><I.Up /> {multisigActive ? "Queue payroll" : "Dispatch payroll"}</>}
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
                <h1 style={{ fontFamily: "'Unbounded', sans-serif", fontSize: isMobile ? 22 : 30, letterSpacing: "-.02em", fontWeight: 700, lineHeight: 1.2 }}>Your team</h1>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                {!isMobile && <span style={{ fontSize: 13, color: c.textDimmer, fontStyle: "normal" }}>{employees.length} members · {active.length} active</span>}
                <button className="db-gold-btn" onClick={() => setShowModal(true)}><I.Plus />{!isMobile && " Add member"}</button>
              </div>
            </div>

            {!canAfford && balance !== null && total > 0 && (
              <div className="db-warn" style={{ padding: "12px 20px", marginBottom: 12, display: "flex", alignItems: "center", gap: 10, fontSize: 13, color: c.red, background: c.redBg }}>
                <I.Alert /> Balance too low. Shortfall: <strong>{shortfall} ZEC</strong>
              </div>
            )}

            {employees.length === 0 ? (
              <EmptyState icon={<I.Users />} title="No team members yet" sub="Add your first employee. They'll receive shielded ZEC at their unified address." action={{ label: "Add first member", fn: () => setShowModal(true) }} c={c} />
            ) : (
              <div style={{ background: c.bgCard, border: `1px solid ${c.borderCard}`, borderRadius: 24, overflow: "hidden" }}>
                {!isMobile && (
                  <div className="db-emp-row" style={{ background: c.bgInset, borderBottom: `1px solid ${c.border}`, padding: "9px 24px" }}>
                    {["Name", "Role", "Address", "Salary", "Status", ""].map(h => <div key={h} style={{ fontSize: 11, color: c.textDimmer, letterSpacing: ".01em", textTransform: "none" }}>{h}</div>)}
                  </div>
                )}
                {employees.map((emp, i) => (
                  isMobile ? (
                    <div key={emp.id} style={{ background: i % 2 === 0 ? c.bgCard : c.bgCardHover, padding: "14px", borderBottom: `1px solid ${c.borderGap}` }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                        <div>
                          <div style={{ fontSize: 14, color: c.text, marginBottom: 2 }}>{emp.name}</div>
                          <div style={{ fontSize: 13, color: c.textMuted }}>{emp.role}</div>
                          <div style={{ fontSize: 12, color: c.blue, marginTop: 4, wordBreak: "break-all", lineHeight: 1.5 }}>{emp.address.slice(0, 20)}...</div>
                        </div>
                        <div style={{ textAlign: "right", flexShrink: 0, marginLeft: 12 }}>
                          <div style={{ fontFamily: "'Unbounded', sans-serif", fontSize: 16, color: c.gold }}>{emp.salary.toFixed(2)} ZEC</div>
                          <span style={{ fontSize: 11, letterSpacing: ".01em", textTransform: "none", padding: "3px 8px", background: emp.status === "active" ? c.greenBg : c.bgInset, color: emp.status === "active" ? c.green : c.gold, border: `1px solid ${emp.status === "active" ? c.greenBorder : c.border}` }}>{emp.status}</span>
                        </div>
                      </div>
                      <button className="db-danger-btn" style={{ marginTop: 10 }} onClick={() => setRemoveTarget(emp)}><I.Trash /> Remove</button>
                    </div>
                  ) : (
                    <div key={emp.id} className="db-emp-row" style={{ background: i % 2 === 0 ? c.bgCard : c.bgCardHover }}>
                      <span style={{ fontSize: 14, color: c.text }}>{emp.name}</span>
                      <span style={{ fontSize: 13, color: c.textMuted }}>{emp.role}</span>
                      <span style={{ fontSize: 11, color: c.blue, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={emp.address}>{emp.address.slice(0, 16)}...{emp.address.slice(-6)}</span>
                      <div style={{ display: "flex", alignItems: "baseline", gap: 3 }}>
                        <span style={{ fontFamily: "'Unbounded', sans-serif", fontSize: 14, color: c.gold }}>{emp.salary.toFixed(2)}</span>
                        <span style={{ fontSize: 11, color: c.textDimmer }}>ZEC</span>
                      </div>
                      <span style={{ fontSize: 11, letterSpacing: ".01em", textTransform: "none", padding: "3px 8px", background: emp.status === "active" ? c.greenBg : c.bgInset, color: emp.status === "active" ? c.green : c.gold, border: `1px solid ${emp.status === "active" ? c.greenBorder : c.border}` }}>{emp.status}</span>
                      <button className="db-danger-btn" onClick={() => setRemoveTarget(emp)}><I.Trash /> Remove</button>
                    </div>
                  )
                ))}
              </div>
            )}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 12, padding: "14px 22px", background: c.bgCard, border: `1px solid ${c.borderCard}`, borderRadius: 20 }}>
              <span style={{ fontSize: 12, color: c.textDimmer, letterSpacing: ".01em", textTransform: "none" }}>Total per cycle</span>
              <div style={{ display: "flex", alignItems: "baseline", gap: 5 }}>
                <span style={{ fontFamily: "'Unbounded', sans-serif", fontSize: 19, color: canAfford || balance === null ? c.gold : c.red }}>{total.toFixed(2)}</span>
                <span style={{ fontSize: 11, color: c.textDimmer }}>ZEC</span>
              </div>
            </div>
          </div>
        )}

        {/* ── HISTORY ── */}
        {tab === "history" && (
          <div style={{ animation: "g-slide .25s ease" }}>
            <div className="db-section-head" style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 36 }}>
              <div>
                <h1 style={{ fontFamily: "'Unbounded', sans-serif", fontSize: isMobile ? 22 : 30, letterSpacing: "-.02em", fontWeight: 700, lineHeight: 1.2 }}>Payroll history</h1>
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
              <EmptyState icon={<I.List />} title="No payroll runs yet" sub="Your history appears here after your first payroll run." action={{ label: "Go to overview", fn: () => setTab("dashboard") }} c={c} />
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {history.map(run => (
                  <div key={run.runId} className="db-hist-row" onClick={() => setExpandedRun(expandedRun === run.runId ? null : run.runId)}>
                    <div style={{ padding: isMobile ? "16px 14px" : "20px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                        <div style={{ width: 36, height: 36, borderRadius: "50%", border: `1px solid ${c.borderStrong}`, display: "flex", alignItems: "center", justifyContent: "center", color: c.gold, flexShrink: 0 }}><I.Shield /></div>
                        <div>
                          <div style={{ fontFamily: "'Unbounded', sans-serif", fontSize: 14, letterSpacing: "-.02em", fontWeight: 700, lineHeight: 1.2 }}>
                            {new Date(run.timestamp).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                          </div>
                          <div style={{ fontSize: 12, color: c.textDimmer, marginTop: 3 }}>{run.totalEmployees} recipients · <span style={{ color: c.blue }}>{run.runId}</span></div>
                        </div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: isMobile ? 10 : 18 }}>
                        <div style={{ textAlign: "right" }}>
                          <div style={{ display: "flex", alignItems: "baseline", gap: 4, justifyContent: "flex-end" }}>
                            <span style={{ fontFamily: "'Unbounded', sans-serif", fontSize: 19, color: c.gold }}>{run.totalZEC?.toFixed(4)}</span>
                            <span style={{ fontSize: 11, color: c.textDimmer }}>ZEC</span>
                          </div>
                          <div style={{ fontSize: 12, color: c.textDimmer }}>{run.successCount}/{run.totalEmployees}</div>
                        </div>
                        {!isMobile && <span style={{ fontSize: 11, letterSpacing: ".01em", textTransform: "none", padding: "4px 10px", background: run.failureCount > 0 ? c.redBg : c.greenBg, color: run.failureCount > 0 ? c.red : c.green, border: `1px solid ${run.failureCount > 0 ? c.redBorder : c.greenBorder}` }}>{run.failureCount > 0 ? "partial" : "complete"}</span>}
                        <div style={{ color: c.textDimmer, transform: expandedRun === run.runId ? "rotate(180deg)" : "none", transition: "transform .2s" }}><I.Chevron /></div>
                      </div>
                    </div>
                    {expandedRun === run.runId && run.results?.length > 0 && (
                      <div style={{ borderTop: `1px solid ${c.borderGap}`, padding: isMobile ? "12px 14px 16px" : "14px 24px 18px" }} onClick={e => e.stopPropagation()}>
                        <div style={{ fontSize: 11, color: c.textDimmer, letterSpacing: ".01em", textTransform: "none", marginBottom: 10 }}>Transaction breakdown</div>
                        {run.results.map(r => (
                          <div key={r.employeeId} style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 10, padding: "8px 0", borderBottom: `1px solid ${c.borderGap}` }}>
                            <span style={{ color: r.status === "sent" ? c.green : c.red, flexShrink: 0 }}>{r.status === "sent" ? "✓" : "✗"}</span>
                            <span style={{ color: c.textMuted, width: 130, flexShrink: 0, fontSize: 13 }}>{r.name}</span>
                            <div style={{ flex: 1, minWidth: 0 }}><TxPill txId={r.txId} copied={copied[r.txId]} onCopy={copy} c={c} /></div>
                            <span style={{ fontFamily: "'Unbounded', sans-serif", fontSize: 14, color: c.gold, flexShrink: 0 }}>{r.amountZEC?.toFixed(4)} ZEC</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
            <div style={{ marginTop: 12, padding: "12px 4px", fontSize: 13, color: c.textDimmer, lineHeight: 1.9 }}>
              Individual amounts are shielded with zk-SNARK proofs. Explorer: <a href="https://testnet.cipherscan.app/" target="_blank" rel="noopener noreferrer" style={{ color: c.blue, textDecoration: "none" }}>testnet.cipherscan.app</a>
            </div>
          </div>
        )}

        {/* ── APPROVALS ── */}
        {tab === "approvals" && (
          <div style={{ animation: "g-slide .25s ease" }}>
            <div className="db-section-head" style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 36 }}>
              <div>
                <h1 style={{ fontFamily: "'Unbounded', sans-serif", fontSize: isMobile ? 22 : 30, letterSpacing: "-.02em", fontWeight: 700, lineHeight: 1.2 }}>Approvals</h1>
              </div>
              <button className="db-gold-btn" onClick={fetchPending} disabled={loadingPending}>{loadingPending ? <><Spin size={12} /> Refresh</> : <><I.Refresh /> Refresh</>}</button>
            </div>

            {!multisigActive ? (
              <div style={{ borderRadius: 18, border: `1px solid ${c.redBorder}`, background: c.redBg, padding: "18px 22px", marginBottom: 18, color: c.red }}>
                <div style={{ fontSize: 13, marginBottom: 10 }}>Multisig is not enabled for this workspace yet.</div>
                <div style={{ fontSize: 12, color: c.textMuted }}>Go to Settings → Multisig to configure a workspace approval policy.</div>
              </div>
            ) : (
              <div style={{ borderRadius: 18, border: `1px solid ${c.bgCardHover}`, background: c.bgCard, padding: "22px", marginBottom: 18 }}>
                <div style={{ fontSize: 13, color: c.textFaint, marginBottom: 14 }}>Your workspace is protected by a multisig policy requiring {msPolicy?.threshold} of {msPolicy?.signers.length} signers.</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                  {msPolicy?.signers?.map(s => (
                    <div key={s} style={{ padding: "9px 12px", border: `1px solid ${c.border}`, borderRadius: 8, fontSize: 12, color: c.text, background: c.bgInset }}>{s.slice(0, 8)}…{s.slice(-6)}</div>
                  ))}
                </div>
              </div>
            )}

            {queuedRun && (
              <div style={{ borderRadius: 18, border: `1px solid ${c.goldBorder}`, background: c.goldBg, padding: "16px 20px", marginBottom: 18 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                  <span style={{ color: c.gold, fontSize: 14 }}>●</span>
                  <span style={{ fontSize: 13, color: c.text, letterSpacing: ".01em", textTransform: "none" }}>Pending run queued, awaiting approvals</span>
                </div>
                <div style={{ fontSize: 12, color: c.textMuted }}>Run ID: {queuedRun.runId} · {queuedRun.approvalsNeeded} signatures needed · {queuedRun.totalEmployees} recipients</div>
              </div>
            )}

            {loadingPending ? (
              <div style={{ padding: 40, display: "flex", justifyContent: "center" }}><Spin size={28} /></div>
            ) : pendingRuns.length === 0 ? (
              <div style={{ borderRadius: 18, border: `1px solid ${c.border}`, background: c.bgCard, padding: "26px 22px", textAlign: "center", color: c.textDimmer }}>
                <div style={{ fontSize: 20, marginBottom: 8 }}>No pending approvals</div>
                <div style={{ fontSize: 13 }}>Queued payroll runs that require your signature will appear here for approval.</div>
              </div>
            ) : (
              <div style={{ display: "grid", gap: 12 }}>
                {pendingRuns.map(run => (
                  <div key={run.runId} style={{ background: c.bgCard, padding: "18px 20px", border: `1px solid ${c.border}` }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                      <div>
                        <div style={{ fontSize: 12, color: c.textDimmer, letterSpacing: ".01em", textTransform: "none" }}>Pending Run</div>
                        <div style={{ fontFamily: "'Unbounded', sans-serif", fontSize: 14 }}>{run.runId}</div>
                      </div>
                      <div style={{ fontSize: 12, color: c.textMuted }}>Approvals: {run.approvalsCount}/{run.threshold}</div>
                    </div>
                    <div style={{ display: "grid", gap: 10, marginBottom: 16 }}>
                      {run.employees?.map(emp => (
                        <div key={emp.id} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: c.textMuted }}>
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
              <h1 style={{ fontFamily: "'Unbounded', sans-serif", fontSize: isMobile ? 22 : 30, letterSpacing: "-.02em", fontWeight: 700, lineHeight: 1.2 }}>Settings</h1>
            </div>
            <div className="db-settings-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div style={{ background: c.bgCard, border: `1px solid ${c.borderCard}`, borderRadius: 24, padding: isMobile ? "20px 18px" : "26px 24px", position: "relative" }}>
                <div style={{ fontSize: 11, color: c.gold, letterSpacing: ".01em", textTransform: "none", marginBottom: 7 }}>Privacy</div>
                <div style={{ fontFamily: "'Unbounded', sans-serif", fontSize: isMobile ? 16 : 17, letterSpacing: "-.02em", fontWeight: 700, lineHeight: 1, marginBottom: 16 }}>Viewing key</div>
                <p style={{ fontSize: 13, color: c.textMuted, lineHeight: 1.8, marginBottom: 18, fontStyle: "normal" }}>Share with your accountant for read-only access.</p>
                <CopyRow label="Unified Full Viewing Key" value={session?.viewingKey ?? "—"} copyKey="vk" copied={copied.vk} onCopy={copy} accent={c.green} redact={true} c={c} />
              </div>

              <div style={{ background: c.bgCard, border: `1px solid ${c.borderCard}`, borderRadius: 24, padding: isMobile ? "20px 18px" : "26px 24px", position: "relative" }}>
                <div style={{ fontSize: 11, color: c.gold, letterSpacing: ".01em", textTransform: "none", marginBottom: 7 }}>Automation</div>
                <div style={{ fontFamily: "'Unbounded', sans-serif", fontSize: isMobile ? 16 : 17, letterSpacing: "-.02em", fontWeight: 700, lineHeight: 1, marginBottom: 16 }}>Payroll schedule</div>
                <p style={{ fontSize: 13, color: c.textMuted, lineHeight: 1.8, marginBottom: 18, fontStyle: "normal" }}>Set a recurring cadence.</p>
                <div style={{ position: "relative", marginBottom: 14 }}>
                  <select className="db-select" value={schedule} onChange={e => setSchedule(e.target.value)}>
                    {SCHEDULE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                  <div style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", color: c.textFaint, pointerEvents: "none" }}><I.Chevron /></div>
                </div>
                {nextDate && (
                  <div style={{ borderRadius: 18, background: c.bgInset, border: `1px solid ${c.border}`, padding: "12px 14px" }}>
                    <div style={{ fontSize: 11, color: c.textDimmer, letterSpacing: ".01em", textTransform: "none", marginBottom: 5 }}>Next payroll</div>
                    <div style={{ fontFamily: "'Unbounded', sans-serif", fontSize: 19, color: daysLeft <= 3 ? c.red : c.gold }}>{nextDate.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}</div>
                    <div style={{ fontSize: 12, color: c.textDimmer, marginTop: 3 }}>{daysLeft} days from today</div>
                  </div>
                )}
              </div>

              <div style={{ background: c.bgCard, border: `1px solid ${c.borderCard}`, borderRadius: 24, padding: isMobile ? "20px 18px" : "26px 24px" }}>
                <div style={{ fontSize: 11, color: c.gold, letterSpacing: ".01em", textTransform: "none", marginBottom: 7 }}>Wallet</div>
                <div style={{ fontFamily: "'Unbounded', sans-serif", fontSize: isMobile ? 16 : 17, letterSpacing: "-.02em", fontWeight: 700, lineHeight: 1, marginBottom: 16 }}>Deposit address</div>
                <CopyRow label="Unified Address" value={session?.unifiedAddress ?? "—"} copyKey="addr2" copied={copied.addr2} onCopy={copy} accent={c.blue} c={c} />
                <div style={{ fontSize: 12, color: c.textDimmer, lineHeight: 1.8 }}>Deterministically derived from your Ed25519 keypair.</div>
              </div>

              <div style={{ background: c.bgCard, border: `1px solid ${c.borderCard}`, borderRadius: 24, padding: isMobile ? "20px 18px" : "26px 24px", position: "relative" }}>
                <div style={{ fontSize: 11, color: c.gold, letterSpacing: ".01em", textTransform: "none", marginBottom: 7 }}>Multisig</div>
                <div style={{ fontFamily: "'Unbounded', sans-serif", fontSize: isMobile ? 16 : 17, letterSpacing: "-.02em", fontWeight: 700, lineHeight: 1, marginBottom: 16 }}>Workspace approvals</div>
                <p style={{ fontSize: 13, color: c.textMuted, lineHeight: 1.8, marginBottom: 18, fontStyle: "normal" }}>
                  Enable multisig payroll approvals so runs require multiple signers before dispatch.
                </p>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 14 }}>
                  <div style={{ flex: 1, minWidth: 120 }}>
                    <div style={{ fontSize: 12, color: c.textDimmer, marginBottom: 6 }}>Threshold</div>
                    <input className="db-input" type="number" min="1" value={msThreshold} onChange={e => setMsThresh(Number(e.target.value) || 1)} />
                  </div>
                  <div style={{ flex: 2, minWidth: 160 }}>
                    <div style={{ fontSize: 12, color: c.textDimmer, marginBottom: 6 }}>Signers</div>
                    {msSigners.map((signer, idx) => (
                      <input key={idx} className="db-input" value={signer} onChange={e => setMsSigners(prev => prev.map((s, i) => i === idx ? e.target.value : s))} placeholder="Ed25519 public key" style={{ marginBottom: 8 }} autoCapitalize="off" spellCheck={false} />
                    ))}
                    <button className="db-icon-btn" style={{ width: "100%" }} onClick={() => setMsSigners(prev => [...prev, ""])}>+ Add signer</button>
                  </div>
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 10 }}>
                  <button className="db-gold-btn" onClick={handleSaveMultisig} disabled={savingMs}>{savingMs ? <><Spin size={10} /> Saving...</> : "Save policy"}</button>
                  {msPolicy && <button className="db-danger-btn" onClick={handleDisableMultisig} disabled={savingMs}>Disable multisig</button>}
                </div>
                {msErr && <div style={{ fontSize: 12, color: c.red, marginTop: 10 }}>{msErr}</div>}
                {msPolicy && (
                  <div style={{ marginTop: 16, fontSize: 12, color: c.textDimmer }}>
                    Policy active: {msPolicy.threshold} of {msPolicy.signers.length} signers required.
                  </div>
                )}
              </div>

              <div style={{ background: c.bgCard, border: `1px solid ${c.borderCard}`, borderRadius: 24, padding: isMobile ? "20px 18px" : "26px 24px" }}>
                <div style={{ fontSize: 11, color: c.red, letterSpacing: ".01em", textTransform: "none", marginBottom: 7 }}>Session</div>
                <div style={{ fontFamily: "'Unbounded', sans-serif", fontSize: isMobile ? 16 : 17, letterSpacing: "-.02em", fontWeight: 700, lineHeight: 1, marginBottom: 16 }}>Workspace access</div>
                <p style={{ fontSize: 13, color: c.textMuted, lineHeight: 1.8, marginBottom: 18, fontStyle: "normal" }}>Session is active for this browser tab only. Your wallet is always recoverable from your Ed25519 keypair.</p>
                <button className="db-ghost-btn" onClick={onLogout} style={{ borderColor: c.redBorder, color: c.red }}
                  onMouseEnter={e => { e.currentTarget.style.background = c.redBg; }}
                  onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}>
                  Log out and clear session
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
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
              <div>
                <div style={{ fontSize: 11, color: c.gold, letterSpacing: ".01em", textTransform: "none", marginBottom: 5 }}>Privacy</div>
                <div style={{ fontFamily: "'Unbounded', sans-serif", fontSize: 17, letterSpacing: "-.02em", fontWeight: 700, lineHeight: 1.2 }}>Viewing key</div>
              </div>
              <button className="db-icon-btn" onClick={() => setShowVkPanel(false)}><I.X /></button>
            </div>
            <p style={{ fontSize: 13, color: c.textMuted, lineHeight: 1.8, marginBottom: 22, fontStyle: "normal" }}>Share with your accountant. Read-only — no spending access.</p>
            <CopyRow label="Unified Full Viewing Key" value={session?.viewingKey ?? "—"} copyKey="vk2" copied={copied.vk2} onCopy={copy} accent={c.green} redact={true} c={c} />
            <div style={{ borderRadius: 18, background: c.bgInset, border: `1px solid ${c.greenBorder}`, padding: "12px 14px", marginTop: 8, fontSize: 12, color: c.green, lineHeight: 1.9, opacity: .8 }}>
              ✓ Read-only, can verify payments<br />✓ Cannot spend or move funds<br />✓ For accountants and auditors<br />✗ Never share your private key
            </div>
          </div>
        </>
      )}

      {/* ══ SCHEDULE MODAL ══ */}
      {showSchedModal && (
        <div style={{ position: "fixed", inset: 0, background: c.bgOverlay, display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200, backdropFilter: "blur(8px)", cursor: "pointer", padding: 16 }} onClick={() => setShowSchedModal(false)}>
          <div style={{ borderRadius: 18, background: c.bgCard, border: `1px solid ${c.borderCard}`, padding: isMobile ? "28px 20px" : "36px", width: "100%", maxWidth: 420, animation: "g-slide .2s ease", position: "relative", borderRadius: 28 }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 11, color: c.gold, letterSpacing: ".01em", textTransform: "none", marginBottom: 8 }}>Automation</div>
            <div style={{ fontFamily: "'Unbounded', sans-serif", fontSize: 21, letterSpacing: "-.02em", fontWeight: 700, marginBottom: 22, lineHeight: 1.2 }}>Set schedule</div>
            {SCHEDULE_OPTIONS.map(o => (
              <div key={o.value} className={`db-sched-opt ${schedule === o.value ? "sel" : ""}`} onClick={() => setSchedule(o.value)}>
                <div style={{ width: 20, height: 20, borderRadius: "50%", border: `1.5px solid ${schedule === o.value ? c.gold : c.borderStrong}`, background: schedule === o.value ? c.bgInset : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "all .2s" }}>
                  {schedule === o.value && <span style={{ color: c.gold, fontSize: 13 }}>✓</span>}
                </div>
                <div>
                  <div style={{ fontSize: 14, color: schedule === o.value ? c.gold : c.textMuted }}>{o.label}</div>
                  {o.value !== "none" && schedule === o.value && nextDate && (
                    <div style={{ fontSize: 12, color: c.textDimmer, marginTop: 2 }}>Next: {nextDate.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })} · {daysLeft} days</div>
                  )}
                </div>
              </div>
            ))}
            <button className="db-gold-btn" style={{ width: "100%", marginTop: 14 }} onClick={() => setShowSchedModal(false)}>Save schedule</button>
          </div>
        </div>
      )}

      {/* ══ ADD MEMBER MODAL ══ */}
      {showModal && (
        <div style={{ position: "fixed", inset: 0, background: c.bgOverlay, display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200, backdropFilter: "blur(10px)", cursor: "pointer", padding: 16 }} onClick={() => setShowModal(false)}>
          <div style={{ borderRadius: 18, background: c.bgCard, border: `1px solid ${c.borderCard}`, padding: isMobile ? "28px 20px" : "36px", width: "100%", maxWidth: 500, animation: "g-slide .2s ease", position: "relative", borderRadius: 28, maxHeight: "90vh", overflowY: "auto" }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 11, color: c.gold, letterSpacing: ".01em", textTransform: "none", marginBottom: 7 }}>New team member</div>
            <div style={{ fontFamily: "'Unbounded', sans-serif", fontSize: 21, letterSpacing: "-.02em", fontWeight: 700, marginBottom: 24, lineHeight: 1.2 }}>Add to roster</div>
            {[
              { label: "Full Name", key: "name", placeholder: "Amara Osei", hint: "" },
              { label: "Role", key: "role", placeholder: "Lead Engineer", hint: "" },
              { label: "Zcash Testnet Address", key: "address", placeholder: "utest1... or u1...", hint: "Unified testnet address · testnet.zecfaucet.com" },
              { label: "Salary per cycle (ZEC)", key: "salary", placeholder: "0.45", hint: "" },
            ].map(f => (
              <div key={f.key} style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 11, color: c.textFaint, letterSpacing: ".01em", textTransform: "none", marginBottom: 6 }}>{f.label}</div>
                <input className={`db-input${f.key === "address" && addrError ? " err" : ""}`} placeholder={f.placeholder} value={newEmp[f.key]}
                  onChange={e => { setNewEmp({ ...newEmp, [f.key]: e.target.value }); if (f.key === "address") setAddrError(""); }}
                  onKeyDown={e => e.key === "Enter" && addEmployee()} />
                {f.key === "address" && addrError && <div style={{ fontSize: 12, color: c.red, marginTop: 4, lineHeight: 1.6 }}>{addrError}</div>}
                {f.hint && !addrError && <div style={{ fontSize: 11, color: c.textDimmer, marginTop: 3 }}>{f.hint}</div>}
              </div>
            ))}
            <div style={{ display: "flex", gap: 10, marginTop: 22 }}>
              <button className="db-gold-btn" style={{ flex: 1 }} onClick={addEmployee}><I.Plus /> Add to Roster</button>
              <button className="db-ghost-btn" onClick={() => { setShowModal(false); setAddrError(""); }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {isMobile && (
        <nav className="db-bottom" aria-label="Workspace sections">
          {TABS.map(tb => <button key={tb} className={tab === tb ? "on" : ""} onClick={() => setTab(tb)} aria-current={tab === tb ? "page" : undefined}>{TAB_ICON[tb]}<span>{TAB_LABEL[tb]}</span></button>)}
        </nav>
      )}

      {removeTarget && <RemoveModal employee={removeTarget} onConfirm={confirmRemove} onCancel={() => setRemoveTarget(null)} c={c} />}
    </div>
  );
}