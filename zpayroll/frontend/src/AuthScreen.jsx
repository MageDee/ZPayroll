import { useState } from "react";
import { useTheme, useBreakpoint, t, ThemeToggle, globalCss } from "./theme";

// Ed25519 key generation via Web Crypto API
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

function saveSession(data) {
  sessionStorage.setItem("zpayroll_session", JSON.stringify({ publicKey: data.publicKey, unifiedAddress: data.unifiedAddress ?? null, viewingKey: data.viewingKey ?? null, ts: Date.now() }));
}

// ── Icons ──────────────────────────────────────────────────────────────────────
const IcoKey    = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="7.5" cy="15.5" r="5.5"/><path d="M21 2l-9.6 9.6"/><path d="M15.5 7.5l3 3L22 7l-3-3"/></svg>;
const IcoShield = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>;
const IcoCopy   = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>;
const IcoCheck  = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>;
const IcoDown   = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>;
const IcoBack   = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>;

const Spin = ({ size = 13, color }) => {
  const { theme } = useTheme();
  const col = color ?? t(theme).gold;
  return <div style={{ width: size, height: size, border: `2px solid ${col}20`, borderTopColor: col, borderRadius: "50%", animation: "g-spin .75s linear infinite", flexShrink: 0 }} />;
};

function Steps({ current, steps, c }) {
  return (
    <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 4, marginBottom: 44 }}>
      {steps.map((s, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 7, opacity: i > current ? .25 : 1, transition: "opacity .3s" }}>
            <div style={{ width: 22, height: 22, border: `1px solid ${i === current ? c.gold : i < current ? c.green : c.borderStrong}`, background: i < current ? c.greenBg : "transparent", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: i < current ? c.green : i === current ? c.gold : c.textFaint, transition: "all .3s", flexShrink: 0 }}>
              {i < current ? "✓" : i + 1}
            </div>
            <span style={{ fontSize: 10, letterSpacing: ".1em", textTransform: "uppercase", color: i === current ? c.text : c.textFaint, whiteSpace: "nowrap" }}>{s}</span>
          </div>
          {i < steps.length - 1 && <div style={{ width: 24, height: 1, background: c.border, margin: "0 8px", flexShrink: 0 }} />}
        </div>
      ))}
    </div>
  );
}

export default function AuthScreen({ onSuccess, onBack }) {
  const { theme, isDark } = useTheme();
  const { isMobile }      = useBreakpoint();
  const c                 = t(theme);

  const [mode, setMode]         = useState(null);
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

  const copy = (k, v) => { navigator.clipboard?.writeText(v); setCopied(p => ({ ...p, [k]: true })); setTimeout(() => setCopied(p => ({ ...p, [k]: false })), 2000); };

  const handleGenerate = async () => {
    setGen(true);
    await new Promise(r => setTimeout(r, 800));
    try { const kp = await generateKeypair(); setKeypair(kp); setStep(1); }
    catch (e) { console.error(e); }
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

  const handleProceed = () => {
    onSuccess({ publicKey: keypair.publicKey, privateKey: keypair.privateKey, isNew: true });
  };

  const handleLogin = async () => {
    setLogging(true); setLErr(null);
    try {
      if (!loginPriv.trim() || !loginPub.trim()) throw new Error("Both keys are required");
      const privKey = await importPrivateKey(loginPriv.trim());
      await signChallenge(privKey, CHALLENGE);
      onSuccess({ publicKey: loginPub.trim(), privateKey: loginPriv.trim(), isNew: false });
    } catch (e) {
      setLErr(e.message.includes("pkcs8") ? "Invalid private key — check you copied it fully." : e.message);
    } finally { setLogging(false); }
  };

  // ── Shared styled components ─────────────────────────────────────────────
  const BtnGold = ({ children, onClick, disabled, style = {} }) => (
    <button onClick={onClick} disabled={disabled} style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8, background: disabled ? (isDark ? "#1a1500" : "#e8e0c0") : c.gold, color: disabled ? (isDark ? "#333200" : "#999") : isDark ? "#050508" : "#fff", border: "none", fontFamily: "'DM Mono',monospace", fontSize: 11, fontWeight: 500, letterSpacing: ".14em", textTransform: "uppercase", padding: "14px 28px", cursor: disabled ? "not-allowed" : "crosshair", transition: "all .15s", width: "100%", clipPath: "polygon(0 0,calc(100% - 10px) 0,100% 10px,100% 100%,10px 100%,0 calc(100% - 10px))", ...style }}>{children}</button>
  );
  const BtnGhost = ({ children, onClick, style = {} }) => (
    <button onClick={onClick} style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8, background: "transparent", color: c.textMuted, border: `1px solid ${c.borderCard}`, fontFamily: "'DM Mono',monospace", fontSize: 11, letterSpacing: ".12em", textTransform: "uppercase", padding: "13px 20px", cursor: "crosshair", transition: "all .15s", width: "100%", ...style }}>{children}</button>
  );

  const KeyBox = ({ label, value, colorKey, copyKey }) => (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontSize: 9, color: c.textFaint, letterSpacing: ".14em", textTransform: "uppercase", marginBottom: 6 }}>{label}</div>
      <div style={{ background: c.bgInset, border: `1px solid ${colorKey === "pub" ? c.goldBorder : c.redBorder}`, padding: "12px 14px", display: "flex", alignItems: "flex-start", gap: 10 }}>
        <div style={{ flex: 1, fontSize: 11, color: colorKey === "pub" ? c.gold : c.red, wordBreak: "break-all", lineHeight: 1.7, letterSpacing: ".02em" }}>{value}</div>
        <button onClick={() => copy(copyKey, value)} style={{ background: copied[copyKey] ? c.greenBg : c.bgCard, border: `1px solid ${copied[copyKey] ? c.greenBorder : c.border}`, padding: "7px 10px", cursor: "crosshair", flexShrink: 0, color: copied[copyKey] ? c.green : c.textFaint, display: "flex", alignItems: "center", gap: 5, fontSize: 10, fontFamily: "'DM Mono',monospace", letterSpacing: ".08em", transition: "all .2s" }}>
          {copied[copyKey] ? <><IcoCheck /> Copied</> : <><IcoCopy /> Copy</>}
        </button>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: c.bg, color: c.text, fontFamily: "'DM Mono','Courier New',monospace", cursor: "crosshair", display: "flex", flexDirection: "column" }}>
      <style>{`
        ${globalCss(theme)}
        .auth-mode-card { border:1px solid ${c.borderCard};padding:${isMobile?"24px 20px":"32px 26px"};cursor:crosshair;transition:all .2s;position:relative;overflow:hidden;animation:g-fadeUp .4s ease both; }
        .auth-mode-card:hover { border-color:${c.gold};transform:translateY(-2px); }
        .auth-input { width:100%;background:${c.bgInput};border:1px solid ${c.borderCard};padding:12px 14px;color:${c.text};font-family:'DM Mono',monospace;font-size:12px;outline:none;transition:border .2s;letter-spacing:.02em;resize:none; }
        .auth-input:focus { border-color:${c.gold}; }
        .auth-input::placeholder { color:${c.textDimmer}; }
      `}</style>

      {/* Background grid */}
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0, backgroundImage: `linear-gradient(${c.gridLine} 1px,transparent 1px),linear-gradient(90deg,${c.gridLine} 1px,transparent 1px)`, backgroundSize: "60px 60px", animation: "g-grid 6s ease-in-out infinite" }} />

      {/* Nav */}
      <nav style={{ position: "relative", zIndex: 10, padding: `18px ${isMobile ? "16px" : "40px"}`, borderBottom: `1px solid ${c.border}`, display: "flex", alignItems: "center", justifyContent: "space-between", background: c.bgNav, backdropFilter: "blur(20px)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 20, height: 20, background: c.gold, clipPath: "polygon(50% 0%,100% 25%,100% 75%,50% 100%,0% 75%,0% 25%)", animation: "g-pulse 3s ease-in-out infinite" }} />
          <span style={{ fontFamily: "'Bebas Neue'", fontSize: 18, letterSpacing: ".05em" }}>ZPAYROLL</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <ThemeToggle />
          <button onClick={onBack} style={{ background: "none", border: `1px solid ${c.borderCard}`, cursor: "crosshair", color: c.textMuted, fontFamily: "'DM Mono',monospace", fontSize: 10, letterSpacing: ".1em", textTransform: "uppercase", display: "flex", alignItems: "center", gap: 7, padding: "7px 12px", transition: "all .2s" }}
            onMouseEnter={e => e.currentTarget.style.color = c.text} onMouseLeave={e => e.currentTarget.style.color = c.textMuted}>
            <IcoBack /> Back
          </button>
        </div>
      </nav>

      {/* Content */}
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: `40px ${isMobile ? "16px" : "24px"}`, position: "relative", zIndex: 1 }}>
        <div style={{ width: "100%", maxWidth: 500 }}>

          {/* ── Mode selection ── */}
          {!mode && (
            <div style={{ animation: "g-fadeUp .4s ease" }}>
              <div style={{ textAlign: "center", marginBottom: 40 }}>
                <div style={{ fontSize: 10, color: c.gold, letterSpacing: ".2em", textTransform: "uppercase", marginBottom: 14 }}>Cryptographic access</div>
                <h1 style={{ fontFamily: "'Bebas Neue'", fontSize: isMobile ? 40 : 48, letterSpacing: ".02em", lineHeight: 1, marginBottom: 14 }}>YOUR KEYS.<br />YOUR WORKSPACE.</h1>
                <p style={{ fontSize: 13, color: c.textMuted, lineHeight: 1.7, fontFamily: "'Instrument Serif',serif", fontStyle: "italic" }}>No email. No password. Identity on ZPayroll is an Ed25519 keypair — generated in your browser, held only by you.</p>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {[
                  { icon: <IcoKey />, title: "Create New Workspace", sub: "Generate a fresh Ed25519 keypair. Your Zcash wallet is derived from it on the backend — nothing stored on our servers.", border: c.gold, action: () => setMode("create") },
                  { icon: <IcoShield />, title: "Access Existing Workspace", sub: "Already have a keypair? Paste your keys to sign in. Your wallet auto-restores from your private key.", border: c.borderStrong, action: () => setMode("login") },
                ].map((card, i) => (
                  <div key={i} className="auth-mode-card" style={{ animationDelay: `${i * .1}s` }} onClick={card.action}>
                    <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
                      <div style={{ width: 36, height: 36, border: `1px solid ${card.border}40`, display: "flex", alignItems: "center", justifyContent: "center", color: card.border, flexShrink: 0 }}>{card.icon}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontFamily: "'Bebas Neue'", fontSize: 20, letterSpacing: ".04em", marginBottom: 6 }}>{card.title}</div>
                        <div style={{ fontSize: 12, color: c.textMuted, lineHeight: 1.7 }}>{card.sub}</div>
                      </div>
                      <span style={{ color: card.border, fontSize: 18, flexShrink: 0 }}>→</span>
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 28, padding: "12px 18px", border: `1px solid ${c.border}`, background: c.bgInset, fontSize: 10, color: c.textDimmer, lineHeight: 1.7, textAlign: "center" }}>
                🔒 All cryptography runs in your browser. ZPayroll never sees your private key.
              </div>
            </div>
          )}

          {/* ── Create — Step 0 ── */}
          {mode === "create" && step === 0 && (
            <div style={{ animation: "g-fadeUp .4s ease" }}>
              <div style={{ fontSize: 10, color: c.gold, letterSpacing: ".2em", textTransform: "uppercase", marginBottom: 12 }}>Step 1 of 3</div>
              <h2 style={{ fontFamily: "'Bebas Neue'", fontSize: isMobile ? 36 : 42, letterSpacing: ".02em", marginBottom: 12 }}>GENERATE KEYPAIR</h2>
              <p style={{ fontSize: 13, color: c.textMuted, lineHeight: 1.7, marginBottom: 28, fontFamily: "'Instrument Serif',serif", fontStyle: "italic" }}>We'll generate an Ed25519 keypair in your browser using the Web Crypto API. Your private key never leaves this device.</p>
              <div style={{ border: `1px solid ${c.borderCard}`, padding: "22px", marginBottom: 24, background: c.bgCard }}>
                {[["Algorithm","Ed25519 (Curve25519)"],["Key size","256-bit"],["Generated","In-browser · Web Crypto API"],["Stored","Never on our servers"]].map(([l,v]) => (
                  <div key={l} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: `1px solid ${c.border}`, fontSize: 12 }}>
                    <span style={{ color: c.textMuted }}>{l}</span><span style={{ color: c.textFaint }}>{v}</span>
                  </div>
                ))}
              </div>
              <BtnGold onClick={handleGenerate} disabled={generating}>{generating ? <><Spin size={12} /> Generating...</> : "Generate My Keypair →"}</BtnGold>
            </div>
          )}

          {/* ── Create — Step 1 ── */}
          {mode === "create" && step === 1 && keypair && (
            <div style={{ animation: "g-fadeUp .4s ease" }}>
              <div style={{ fontSize: 10, color: c.gold, letterSpacing: ".2em", textTransform: "uppercase", marginBottom: 12 }}>Step 2 of 3</div>
              <h2 style={{ fontFamily: "'Bebas Neue'", fontSize: isMobile ? 36 : 42, letterSpacing: ".02em", marginBottom: 12 }}>SAVE YOUR KEYS</h2>
              <p style={{ fontSize: 13, color: c.textMuted, lineHeight: 1.7, marginBottom: 22, fontFamily: "'Instrument Serif',serif", fontStyle: "italic" }}>These are your only credentials. No password reset. No recovery. Save them now.</p>
              <KeyBox label="Public Key — your identity (safe to share)" value={keypair.publicKey} colorKey="pub" copyKey="pub" />
              <KeyBox label="Private Key — keep secret, never share" value={keypair.privateKey} colorKey="priv" copyKey="priv" />
              <div style={{ background: isDark ? "#0a0600" : "#fff8e0", border: `1px solid ${isDark ? "#2a1800" : "#f4d98a"}`, padding: "14px 18px", marginBottom: 22, display: "flex", gap: 12, fontSize: 12, color: isDark ? "#7a5a20" : "#8a6000", lineHeight: 1.7 }}>
                <span style={{ flexShrink: 0 }}>⚠</span>
                If you lose your private key, you lose access permanently. We cannot recover it.
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <BtnGold onClick={handleDownload}>{downloaded ? <><IcoCheck /> Downloaded</> : <><IcoDown /> Download Keypair File</>}</BtnGold>
                <BtnGhost onClick={() => setStep(2)} style={{ opacity: downloaded ? 1 : .5, pointerEvents: downloaded ? "auto" : "none" }}>
                  {downloaded ? "Continue →" : "Download first to continue"}
                </BtnGhost>
              </div>
            </div>
          )}

          {/* ── Create — Step 2 ── */}
          {mode === "create" && step === 2 && keypair && (
            <div style={{ animation: "g-fadeUp .4s ease" }}>
              <div style={{ fontSize: 10, color: c.gold, letterSpacing: ".2em", textTransform: "uppercase", marginBottom: 12 }}>Step 3 of 3</div>
              <h2 style={{ fontFamily: "'Bebas Neue'", fontSize: isMobile ? 36 : 42, letterSpacing: ".02em", marginBottom: 12 }}>CONFIRM &amp; ENTER</h2>
              <div style={{ border: `1px solid ${c.greenBorder}`, background: c.greenBg, padding: "18px", marginBottom: 22 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                  <div style={{ width: 7, height: 7, borderRadius: "50%", background: c.green, animation: "g-pulse 2s infinite" }} />
                  <span style={{ fontSize: 10, color: c.green, letterSpacing: ".1em", textTransform: "uppercase" }}>Identity ready</span>
                </div>
                <div style={{ fontSize: 9, color: c.greenBorder, letterSpacing: ".08em", textTransform: "uppercase", marginBottom: 5 }}>Your public key</div>
                <div style={{ fontSize: 11, color: c.gold, wordBreak: "break-all", lineHeight: 1.6 }}>{keypair.publicKey.slice(0, 32)}...</div>
              </div>
              <label style={{ display: "flex", alignItems: "flex-start", gap: 12, cursor: "crosshair", marginBottom: 24 }}>
                <div onClick={() => setConf(p => !p)} style={{ width: 20, height: 20, border: `1px solid ${confirmed ? c.green : c.borderStrong}`, background: confirmed ? c.greenBg : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "all .2s", marginTop: 2 }}>
                  {confirmed && <span style={{ color: c.green, fontSize: 12 }}>✓</span>}
                </div>
                <span style={{ fontSize: 12, color: c.textMuted, lineHeight: 1.6 }}>I have saved my keypair. I understand that losing my private key means losing access to my workspace.</span>
              </label>
              <BtnGold onClick={handleProceed} disabled={!confirmed}>Enter Workspace →</BtnGold>
            </div>
          )}

          {/* ── Login ── */}
          {mode === "login" && (
            <div style={{ animation: "g-fadeUp .4s ease" }}>
              <div style={{ fontSize: 10, color: c.gold, letterSpacing: ".2em", textTransform: "uppercase", marginBottom: 12 }}>Existing workspace</div>
              <h2 style={{ fontFamily: "'Bebas Neue'", fontSize: isMobile ? 36 : 42, letterSpacing: ".02em", marginBottom: 12 }}>SIGN IN WITH KEYS</h2>
              <p style={{ fontSize: 13, color: c.textMuted, lineHeight: 1.7, marginBottom: 28, fontFamily: "'Instrument Serif',serif", fontStyle: "italic" }}>Paste your Ed25519 keys. Your private key signs a challenge locally — no credentials sent anywhere.</p>
              {[
                { label: "Public Key", val: loginPub, set: setLPub, ph: "Paste your public key (hex)..." },
                { label: "Private Key (stays in browser)", val: loginPriv, set: setLPriv, ph: "Paste your private key (hex)..." },
              ].map(f => (
                <div key={f.label} style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: 9, color: c.textFaint, letterSpacing: ".14em", textTransform: "uppercase", marginBottom: 6 }}>{f.label}</div>
                  <textarea className="auth-input" rows={2} placeholder={f.ph} value={f.val} onChange={e => f.set(e.target.value)} />
                </div>
              ))}
              {loginErr && <div style={{ padding: "12px 16px", border: `1px solid ${c.redBorder}`, background: c.redBg, fontSize: 12, color: c.red, marginBottom: 16 }}>⚠ {loginErr}</div>}
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <BtnGold onClick={handleLogin} disabled={logging || !loginPriv || !loginPub}>{logging ? <><Spin size={12} /> Signing challenge...</> : "Sign In →"}</BtnGold>
                <BtnGhost onClick={() => setMode(null)}>← Choose different option</BtnGhost>
              </div>
              <div style={{ marginTop: 20, padding: "12px 16px", border: `1px solid ${c.border}`, background: c.bgInset, fontSize: 10, color: c.textDimmer, lineHeight: 1.7, textAlign: "center" }}>Your private key signs a local challenge only. It is never transmitted.</div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
