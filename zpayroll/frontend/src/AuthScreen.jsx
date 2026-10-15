import { useState } from "react";
import { useTheme, t, ThemeToggle, Mark, themeVars, uiCss, globalCss } from "./theme";

// ─── Ed25519 key handling (Web Crypto) — logic unchanged ─────────────────────
async function generateKeypair() {
  const kp      = await window.crypto.subtle.generateKey({ name: "Ed25519" }, true, ["sign", "verify"]);
  const pubRaw  = await window.crypto.subtle.exportKey("raw",   kp.publicKey);
  const privRaw = await window.crypto.subtle.exportKey("pkcs8", kp.privateKey);
  const toHex   = buf => Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
  return { publicKey: toHex(pubRaw), privateKey: toHex(privRaw) };
}

async function importPrivateKey(hexPkcs8) {
  const bytes = new Uint8Array(hexPkcs8.match(/.{1,2}/g).map(b => parseInt(b, 16)));
  return window.crypto.subtle.importKey("pkcs8", bytes, { name: "Ed25519" }, false, ["sign"]);
}

async function signChallenge(privateKey, challenge) {
  const enc = new TextEncoder();
  const sig  = await window.crypto.subtle.sign("Ed25519", privateKey, enc.encode(challenge));
  return Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, "0")).join("");
}

const CHALLENGE = "zpayroll-auth-v1";

// ─── Icons ────────────────────────────────────────────────────────────────────
const sv = { fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" };
const IcoKey    = () => <svg width="20" height="20" viewBox="0 0 24 24" {...sv}><circle cx="7.5" cy="15.5" r="5.5"/><path d="M21 2l-9.6 9.6"/><path d="M15.5 7.5l3 3L22 7l-3-3"/></svg>;
const IcoShield = () => <svg width="20" height="20" viewBox="0 0 24 24" {...sv}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>;
const IcoCopy   = () => <svg width="14" height="14" viewBox="0 0 24 24" {...sv}><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>;
const IcoCheck  = () => <svg width="14" height="14" viewBox="0 0 24 24" {...sv} strokeWidth="2.6"><polyline points="20 6 9 17 4 12"/></svg>;
const IcoDown   = () => <svg width="16" height="16" viewBox="0 0 24 24" {...sv}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>;
const IcoBack   = () => <svg width="15" height="15" viewBox="0 0 24 24" {...sv}><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>;
const IcoAlert  = () => <svg width="17" height="17" viewBox="0 0 24 24" {...sv}><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>;
const IcoInfo   = () => <svg width="17" height="17" viewBox="0 0 24 24" {...sv}><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>;

const Spin = () => <span style={{ width: 16, height: 16, border: "2px solid currentColor", borderTopColor: "transparent", borderRadius: "50%", animation: "g-spin .75s linear infinite", display: "inline-block", opacity: .8 }} />;

function Progress({ step }) {
  return (
    <div className="zp-progress" role="img" aria-label={`Step ${step + 1} of 3`}>
      {[0, 1, 2].map(i => <i key={i} className={i < step ? "done" : i === step ? "on" : ""} />)}
    </div>
  );
}

function KeyBox({ label, value, tone, copied, onCopy }) {
  return (
    <div className="zp-key">
      <div className="zp-label">{label}</div>
      <div className="zp-key-box" style={{ borderColor: tone === "priv" ? "var(--red-line)" : "var(--line-strong)" }}>
        <div className="zp-key-val" style={{ color: tone === "priv" ? "var(--red)" : "var(--gold-text)" }}>{value}</div>
        <button className={`zp-copy ${copied ? "done" : ""}`} onClick={onCopy}>{copied ? <><IcoCheck /> Copied</> : <><IcoCopy /> Copy</>}</button>
      </div>
    </div>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────
export default function AuthScreen({ onSuccess, onBack }) {
  const { theme } = useTheme();
  const c = t(theme);

  const [mode, setMode]         = useState(null);   // null | "create" | "login"
  const [step, setStep]         = useState(0);
  const [keypair, setKeypair]   = useState(null);
  const [generating, setGen]    = useState(false);
  const [downloaded, setDl]     = useState(false);
  const [confirmed, setConf]    = useState(false);
  const [copied, setCopied]     = useState({});
  const [loginPriv, setLPriv]   = useState("");
  const [loginPub, setLPub]     = useState("");
  const [loginErr, setLErr]     = useState(null);
  const [logging, setLogging]   = useState(false);
  const [genErr, setGenErr]     = useState(null);

  const copy = (k, v) => {
    navigator.clipboard?.writeText(v);
    setCopied(p => ({ ...p, [k]: true }));
    setTimeout(() => setCopied(p => ({ ...p, [k]: false })), 2000);
  };

  const handleGenerate = async () => {
    setGen(true); setGenErr(null);
    await new Promise(r => setTimeout(r, 800));
    try { const kp = await generateKeypair(); setKeypair(kp); setStep(1); }
    catch (e) {
      console.error(e);
      setGenErr("This browser can't generate Ed25519 keys. Try an up-to-date Chrome, Safari or Firefox.");
    }
    finally { setGen(false); }
  };

  const handleDownload = () => {
    const data = JSON.stringify({ zpayroll: true, publicKey: keypair.publicKey, privateKey: keypair.privateKey, warning: "KEEP THIS FILE SAFE AND PRIVATE. Anyone with your private key can access your ZPayroll workspace.", created: new Date().toISOString() }, null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href = url; a.download = "zpayroll-keypair.json"; a.click();
    URL.revokeObjectURL(url);
    setDl(true);
  };

  const handleProceed = () => onSuccess({ publicKey: keypair.publicKey, privateKey: keypair.privateKey, isNew: true });

  const handleLogin = async () => {
    setLogging(true); setLErr(null);
    try {
      if (!loginPriv.trim() || !loginPub.trim()) throw new Error("Both keys are required");
      const privKey = await importPrivateKey(loginPriv.trim());
      await signChallenge(privKey, CHALLENGE);
      onSuccess({ publicKey: loginPub.trim(), privateKey: loginPriv.trim(), isNew: false });
    } catch (e) {
      setLErr(e.message.includes("pkcs8") ? "Invalid private key. Check that you copied all of it." : e.message);
    } finally { setLogging(false); }
  };

  const back = mode ? () => { setMode(null); setStep(0); setLErr(null); } : onBack;

  return (
    <div className="zp-page" style={themeVars(theme)}>
      <style>{`
        ${globalCss(theme)}
        ${uiCss()}
      `}</style>

      <header className="zp-nav">
        <div className="zp-brand"><Mark /><b>ZPayroll</b><span className="zp-badge zp-hide-m">Testnet</span></div>
        <div className="zp-nav-r">
          <ThemeToggle />
          <button className="zp-btn zp-btn-ghost zp-btn-sm" onClick={back}><IcoBack /> Back</button>
        </div>
      </header>

      <main className="zp-main">
        <div className="zp-card">

          {/* ── Choose ── */}
          {!mode && (
            <div>
              <h1 className="zp-h">Your keys are your login</h1>
              <p className="zp-p">No email and no password. Your identity is an Ed25519 keypair generated in your browser.</p>

              <div className="zp-stack" style={{ marginTop: 24 }}>
                <button className="zp-opt" onClick={() => setMode("create")}>
                  <span className="zp-opt-ico"><IcoKey /></span>
                  <span><b>Create a workspace</b><span className="s">Generate a new keypair. Your Zcash wallet is derived from it.</span></span>
                </button>
                <button className="zp-opt" onClick={() => setMode("login")}>
                  <span className="zp-opt-ico alt"><IcoShield /></span>
                  <span><b>Open an existing workspace</b><span className="s">Paste your keys to sign in. Your wallet is restored from them.</span></span>
                </button>
              </div>

              <div className="zp-note"><IcoInfo /><span>Keys are generated in your browser. Your private key is sent once to the backend to derive your wallet, then discarded by the server.</span></div>
            </div>
          )}

          {/* ── Create: 1 ── */}
          {mode === "create" && step === 0 && (
            <div>
              <Progress step={0} />
              <h1 className="zp-h">Generate your keypair</h1>
              <p className="zp-p">We generate an Ed25519 keypair in your browser with the Web Crypto API.</p>
              <div className="zp-kv">
                <div><span>Algorithm</span><b>Ed25519</b></div>
                <div><span>Key size</span><b>256-bit</b></div>
                <div><span>Generated</span><b>In your browser</b></div>
                <div><span>Private key</span><b>Sent once to derive your wallet</b></div>
              </div>
              {genErr && <div className="zp-note err" role="alert"><IcoAlert /><span>{genErr}</span></div>}
              <div className="zp-stack">
                <button className="zp-btn zp-btn-gold" onClick={handleGenerate} disabled={generating}>{generating ? <><Spin /> Generating</> : "Generate my keypair"}</button>
              </div>
            </div>
          )}

          {/* ── Create: 2 ── */}
          {mode === "create" && step === 1 && keypair && (
            <div>
              <Progress step={1} />
              <h1 className="zp-h">Save your keys</h1>
              <p className="zp-p">These are your only credentials. There is no password reset and no recovery.</p>
              <KeyBox label="Public key (your identity, safe to share)" value={keypair.publicKey} tone="pub" copied={copied.pub} onCopy={() => copy("pub", keypair.publicKey)} />
              <KeyBox label="Private key (keep secret)" value={keypair.privateKey} tone="priv" copied={copied.priv} onCopy={() => copy("priv", keypair.privateKey)} />
              <div className="zp-note warn"><IcoAlert /><span>If you lose your private key, you lose access to this workspace for good. We can't recover it.</span></div>
              <div className="zp-stack">
                <button className="zp-btn zp-btn-gold" onClick={handleDownload}>{downloaded ? <><IcoCheck /> Downloaded</> : <><IcoDown /> Download keypair file</>}</button>
                <button className="zp-btn zp-btn-ghost" onClick={() => setStep(2)} disabled={!downloaded}>{downloaded ? "Continue" : "Download first to continue"}</button>
              </div>
            </div>
          )}

          {/* ── Create: 3 ── */}
          {mode === "create" && step === 2 && keypair && (
            <div>
              <Progress step={2} />
              <h1 className="zp-h">Confirm and enter</h1>
              <div className="zp-note ok" style={{ marginTop: 20 }}>
                <IcoCheck />
                <span><b style={{ display: "block" }}>Identity ready</b><span style={{ fontFamily: "'DM Mono', monospace", fontSize: 12.5, overflowWrap: "anywhere" }}>{keypair.publicKey.slice(0, 32)}...</span></span>
              </div>
              <div className="zp-checks">
                <button className={`zp-check ${confirmed ? "on" : ""}`} role="checkbox" aria-checked={confirmed} onClick={() => setConf(p => !p)}>
                  <span className="box">{confirmed && <IcoCheck />}</span>
                  <span>I have saved my keypair. I understand that losing my private key means losing access to my workspace.</span>
                </button>
              </div>
              <div className="zp-stack">
                <button className="zp-btn zp-btn-gold" onClick={handleProceed} disabled={!confirmed}>Enter workspace</button>
              </div>
            </div>
          )}

          {/* ── Login ── */}
          {mode === "login" && (
            <div>
              <h1 className="zp-h">Sign in with your keys</h1>
              <p className="zp-p">Paste your Ed25519 keys. Your private key is checked in your browser first.</p>

              <div className="zp-field">
                <div className="zp-label">Public key</div>
                <textarea className="zp-input" rows={2} placeholder="Paste your public key (hex)" value={loginPub} onChange={e => setLPub(e.target.value)} autoComplete="off" autoCapitalize="off" spellCheck={false} />
              </div>
              <div className="zp-field">
                <div className="zp-label">Private key</div>
                <textarea className="zp-input" rows={2} placeholder="Paste your private key (hex)" value={loginPriv} onChange={e => setLPriv(e.target.value)} autoComplete="off" autoCapitalize="off" spellCheck={false} />
              </div>

              {loginErr && <div className="zp-note err" role="alert"><IcoAlert /><span>{loginErr}</span></div>}
              <div className="zp-note"><IcoInfo /><span>After the local check, your private key is sent once to the backend to restore your wallet. The server discards it after use.</span></div>

              <div className="zp-stack">
                <button className="zp-btn zp-btn-gold" onClick={handleLogin} disabled={logging || !loginPriv || !loginPub}>{logging ? <><Spin /> Checking keys</> : "Sign in"}</button>
                <button className="zp-btn zp-btn-ghost" onClick={() => setMode(null)}>Choose a different option</button>
              </div>
            </div>
          )}

        </div>
      </main>
    </div>
  );
}
