import { useState, useEffect } from "react";
import { useTheme, useBreakpoint, t, ThemeToggle, globalCss } from "./theme";

const API = import.meta.env.VITE_API_URL || "/api";

const IcoCopy   = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>;
const IcoCheck  = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>;
const IcoDown   = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>;
const IcoArrow  = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>;
const IcoShield = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>;
const IcoAlert  = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>;

const Spin = ({ size = 14, color }) => {
  const { theme } = useTheme();
  const col = color ?? t(theme).gold;
  return <div style={{ width: size, height: size, border: `2px solid ${col}20`, borderTopColor: col, borderRadius: "50%", animation: "g-spin .75s linear infinite", flexShrink: 0 }} />;
};

function Steps({ current, c }) {
  const labels = ["Derive Wallet", "Review Keys", "Confirm"];
  return (
    <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 4, marginBottom: 48 }}>
      {labels.map((s, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 7, opacity: i > current ? .25 : 1, transition: "opacity .4s" }}>
            <div style={{ width: 22, height: 22, border: `1px solid ${i === current ? c.gold : i < current ? c.green : c.borderStrong}`, background: i < current ? c.greenBg : "transparent", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: i < current ? c.green : i === current ? c.gold : c.textFaint, transition: "all .3s", flexShrink: 0 }}>
              {i < current ? "✓" : i + 1}
            </div>
            <span style={{ fontSize: 10, letterSpacing: ".1em", textTransform: "uppercase", color: i === current ? c.text : c.textFaint, whiteSpace: "nowrap" }}>{s}</span>
          </div>
          {i < 2 && <div style={{ width: 24, height: 1, background: c.border, margin: "0 8px", flexShrink: 0 }} />}
        </div>
      ))}
    </div>
  );
}

function KeyRow({ label, value, accent, copyKey, copied, onCopy }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontSize: 9, letterSpacing: ".16em", textTransform: "uppercase", marginBottom: 7, color: "var(--ws-text-faint)" }}>{label}</div>
      <div style={{ background: "var(--ws-inset)", border: `1px solid ${accent}22`, padding: "12px 14px", display: "flex", alignItems: "flex-start", gap: 10 }}>
        <div style={{ flex: 1, fontSize: 11, color: accent, wordBreak: "break-all", lineHeight: 1.7, letterSpacing: ".02em", fontFamily: "'DM Mono',monospace" }}>{value}</div>
        <button onClick={() => onCopy(copyKey, value)} style={{ background: copied ? "var(--ws-green-bg)" : "var(--ws-card)", border: `1px solid ${copied ? "var(--ws-green-border)" : "var(--ws-border)"}`, padding: "7px 10px", cursor: "crosshair", flexShrink: 0, color: copied ? "var(--ws-green)" : "var(--ws-text-faint)", display: "flex", alignItems: "center", gap: 5, fontSize: 10, fontFamily: "'DM Mono',monospace", letterSpacing: ".08em", transition: "all .2s" }}>
          {copied ? <><IcoCheck /> Copied</> : <><IcoCopy /> Copy</>}
        </button>
      </div>
    </div>
  );
}

export default function WalletSetup({ session, onComplete }) {
  const { theme, isDark } = useTheme();
  const { isMobile }      = useBreakpoint();
  const c                 = t(theme);

  const [step, setStep]         = useState(0);
  const [wallet, setWallet]     = useState(null); // { unifiedAddress, viewingKey, sessionToken, expiresAt }
  const [error, setError]       = useState(null);
  const [retrying, setRetrying] = useState(false);
  const [copied, setCopied]     = useState({});
  const [downloaded, setDl]     = useState(false);
  const [checks, setChecks]     = useState({ addr: false, vk: false, understood: false });
  const [tick, setTick]         = useState(0);
  const isNewUser               = session?.isNew;

  const termLines = isNewUser ? [
    "importing ed25519 keypair...",
    "computing sha-256(privkey) → 32-byte seed...",
    "initialising webzjs wasm runtime...",
    "creating zip-32 orchard key hierarchy...",
    "deriving orchard spending key...",
    "deriving orchard full viewing key...",
    "encoding unified address (utest1...)...",
    "encoding unified viewing key (uviewtest1...)...",
    "issuing session token...",
    "private key discarded — wallet cached server-side ✓",
  ] : [
    "importing ed25519 keypair...",
    "re-deriving orchard wallet from private key...",
    "issuing fresh session token...",
    "private key discarded — session ready ✓",
  ];

  useEffect(() => {
    if (step !== 0) return;
    const timer = setInterval(() => setTick(n => Math.min(n + 1, termLines.length - 1)), 420);
    return () => clearInterval(timer);
  }, [step]);

  useEffect(() => { callBackend(); }, []);

  const callBackend = async () => {
    setError(null); setRetrying(false);
    if (!session?.privateKey || !session?.publicKey) {
      setError("Session keys missing. Please go back and log in again.");
      return;
    }

    try {
      // Private key is sent ONCE here — server derives wallet, returns token
      const endpoint = isNewUser ? "/wallet/create" : "/wallet/restore";
      const res  = await fetch(`${API}${endpoint}`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          publicKey:  session.publicKey,
          privateKey: session.privateKey,
          // Private key is used on the server to derive the wallet seed,
          // then immediately discarded. Only the sessionToken is stored.
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `Server error ${res.status}`);

      // Validate address and viewing key prefixes
      if (!data.unifiedAddress?.startsWith("u1") && !data.unifiedAddress?.startsWith("utest1")) {
        throw new Error(`Unexpected address format: ${data.unifiedAddress?.slice(0, 20)}`);
      }
      if (data.viewingKey && !data.viewingKey?.startsWith("uview") && !data.viewingKey?.startsWith("uviewtest1")) {
        throw new Error(`Unexpected viewing key format: ${data.viewingKey?.slice(0, 20)}`);
      }
      if (!data.sessionToken) {
        throw new Error("No session token returned from server.");
      }
      if (!Array.isArray(data.mnemonic) || data.mnemonic.length !== 24) {
        throw new Error("Invalid mnemonic returned from server.");
      }

      setWallet({
        unifiedAddress: data.unifiedAddress,  // utest1...
        viewingKey:     data.viewingKey,       // uviewtest1...
        mnemonic:       data.mnemonic,         // string[] 24-word BIP-39 phrase
        birthdayHeight: data.birthdayHeight,   // testnet block height at creation
        sessionToken:   data.sessionToken,     // used for all future requests
        expiresAt:      data.expiresAt,
        network:        data.network,
      });

      // Small delay so terminal animation completes
      setTimeout(() => setStep(isNewUser ? 1 : 2), 700);

    } catch (err) {
      console.error("[WalletSetup]", err);
      setError(err.message);
    }
  };

  const copy = (key, val) => {
    navigator.clipboard.writeText(val);
    setCopied(p => ({ ...p, [key]: true }));
    setTimeout(() => setCopied(p => ({ ...p, [key]: false })), 2000);
  };

  const downloadWallet = () => {
    const data = JSON.stringify({
      zpayroll:       true,
      network:        "testnet",
      unifiedAddress: wallet.unifiedAddress,
      viewingKey:     wallet.viewingKey,
      mnemonic:       Array.isArray(wallet.mnemonic) ? wallet.mnemonic.join(" ") : wallet.mnemonic,
      birthdayHeight: wallet.birthdayHeight,
      warning:        "KEEP THIS FILE PRIVATE. Anyone with your mnemonic or private key can access your funds.",
      note:           "Your wallet auto-restores from your Ed25519 keypair. The mnemonic is provided for compatibility with other Zcash wallets.",
      exported:       new Date().toISOString(),
    }, null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href = url; a.download = "zpayroll-wallet.json"; a.click();
    URL.revokeObjectURL(url);
    setDl(true);
  };

  // Pass wallet data + sessionToken up to App
  const handleComplete = () => onComplete(wallet);

  const allConfirmed = checks.addr && checks.vk && checks.understood;

  const BtnGold  = ({ children, onClick, disabled }) => (
    <button onClick={onClick} disabled={disabled} style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8, background: disabled ? (isDark ? "#1a1500" : "#e8ddb0") : c.gold, color: disabled ? (isDark ? "#333200" : "#aaa") : isDark ? "#050508" : "#fff", border: "none", fontFamily: "'DM Mono',monospace", fontSize: 11, fontWeight: 500, letterSpacing: ".14em", textTransform: "uppercase", padding: "14px 28px", cursor: disabled ? "not-allowed" : "crosshair", transition: "all .15s", width: "100%", clipPath: "polygon(0 0,calc(100% - 10px) 0,100% 10px,100% 100%,10px 100%,0 calc(100% - 10px))" }}>{children}</button>
  );
  const BtnGhost = ({ children, onClick }) => (
    <button onClick={onClick} style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8, background: "transparent", color: c.textMuted, border: `1px solid ${c.borderCard}`, fontFamily: "'DM Mono',monospace", fontSize: 11, letterSpacing: ".12em", textTransform: "uppercase", padding: "13px 20px", cursor: "crosshair", transition: "all .15s", width: "100%" }}>{children}</button>
  );

  const css = `
    ${globalCss(theme)}
    @keyframes ws-blink { 0%,100%{opacity:1} 50%{opacity:0} }
  `;

  return (
    <div style={{
      minHeight: "100vh", background: c.bg, color: c.text,
      fontFamily: "'DM Mono','Courier New',monospace", cursor: "crosshair",
      display: "flex", flexDirection: "column",
      "--ws-inset": c.bgInset, "--ws-card": c.bgCard, "--ws-border": c.border,
      "--ws-green": c.green, "--ws-green-bg": c.greenBg, "--ws-green-border": c.greenBorder,
      "--ws-text-faint": c.textFaint,
    }}>
      <style>{css}</style>

      {/* Grid + scanline */}
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0, backgroundImage: `linear-gradient(${c.gridLine} 1px,transparent 1px),linear-gradient(90deg,${c.gridLine} 1px,transparent 1px)`, backgroundSize: "60px 60px", animation: "g-grid 6s ease-in-out infinite" }} />
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0, overflow: "hidden" }}>
        <div style={{ position: "absolute", left: 0, right: 0, height: 2, background: `linear-gradient(transparent,${c.scanLine},transparent)`, animation: "g-scan 10s linear infinite" }} />
      </div>

      {/* Nav */}
      <nav style={{ position: "relative", zIndex: 10, padding: `18px ${isMobile ? "16px" : "48px"}`, borderBottom: `1px solid ${c.border}`, display: "flex", alignItems: "center", justifyContent: "space-between", background: c.bgNav, backdropFilter: "blur(20px)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 20, height: 20, background: c.gold, clipPath: "polygon(50% 0%,100% 25%,100% 75%,50% 100%,0% 75%,0% 25%)", animation: "g-pulse 3s ease-in-out infinite" }} />
          <span style={{ fontFamily: "'Bebas Neue'", fontSize: 18, letterSpacing: ".05em" }}>ZPAYROLL</span>
          <span style={{ fontSize: 9, color: c.gold, letterSpacing: ".15em", border: `1px solid ${c.goldBorder}`, padding: "2px 6px" }}>TESTNET</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <ThemeToggle />
          {session?.publicKey && (
            <div style={{ display: "flex", alignItems: "center", gap: 7, border: `1px solid ${c.border}`, padding: "6px 12px", background: c.bgCard }}>
              <div style={{ width: 5, height: 5, borderRadius: "50%", background: c.green }} />
              <span style={{ fontSize: 10, color: c.textFaint }}>{session.publicKey.slice(0, 8)}···{session.publicKey.slice(-6)}</span>
            </div>
          )}
        </div>
      </nav>

      {/* Content */}
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: `48px ${isMobile ? "16px" : "24px"}`, position: "relative", zIndex: 1 }}>
        <div style={{ width: "100%", maxWidth: 600 }}>

          {/* ── Step 0 — Terminal ── */}
          {step === 0 && (
            <div style={{ animation: "g-fadeIn .4s ease" }}>
              <div style={{ fontSize: 10, color: c.gold, letterSpacing: ".2em", textTransform: "uppercase", marginBottom: 12 }}>
                Wallet {isNewUser ? "creation" : "restoration"}
              </div>
              <h1 style={{ fontFamily: "'Bebas Neue'", fontSize: isMobile ? 40 : 50, letterSpacing: ".02em", lineHeight: 1, marginBottom: 12 }}>
                {isNewUser ? <>CREATING YOUR<br />ZCASH WALLET</> : <>RESTORING YOUR<br />ZCASH WALLET</>}
              </h1>
              <p style={{ fontSize: 13, color: c.textMuted, lineHeight: 1.7, marginBottom: 36, fontFamily: "'Instrument Serif',serif", fontStyle: "italic" }}>
                {isNewUser
                  ? "Your private key is sent once to derive your Orchard wallet. A session token is returned — your key is never sent again."
                  : "Re-deriving your wallet from your keypair. A fresh session token will be issued."}
              </p>

              {/* Terminal window */}
              <div style={{ background: isDark ? "#030305" : "#1a1a22", border: `1px solid ${c.borderCard}`, position: "relative", overflow: "hidden", marginBottom: error ? 20 : 0 }}>
                <div style={{ background: isDark ? "#080810" : "#111118", borderBottom: `1px solid ${c.borderCard}`, padding: "10px 16px", display: "flex", alignItems: "center", gap: 8 }}>
                  {["#ff5050", "#f4b728", "#7fffb2"].map((col, i) => <div key={i} style={{ width: 10, height: 10, borderRadius: "50%", background: col, opacity: .6 }} />)}
                  <span style={{ fontSize: 10, color: isDark ? "#1e1e28" : "#444455", marginLeft: 8, letterSpacing: ".1em" }}>
                    zpayroll — orchard wallet {isNewUser ? "derivation" : "restoration"}
                  </span>
                </div>
                <div style={{ padding: "20px", minHeight: isMobile ? 200 : 260, fontSize: 12, lineHeight: 2.1 }}>
                  {termLines.slice(0, tick + 1).map((line, i) => (
                    <div key={i} style={{ color: i === termLines.length - 1 ? "#7fffb2" : i === tick ? "#f4b728" : isDark ? "#1e3a1e" : "#3a7a3a", animation: "g-fadeIn .2s ease", display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{ color: isDark ? "#0d1e0d" : "#2a5a2a" }}>$</span>
                      <span>{line}</span>
                      {i === tick && i < termLines.length - 1 && <span style={{ animation: "ws-blink .8s step-end infinite", color: "#f4b728" }}>█</span>}
                    </div>
                  ))}
                  {!error && tick < termLines.length - 1 && (
                    <div style={{ marginTop: 8, display: "flex", gap: 10, alignItems: "center" }}>
                      <Spin size={11} />
                      <span style={{ fontSize: 10, color: isDark ? "#1a1a22" : "#555565", letterSpacing: ".06em" }}>
                        deriving orchard keys · issuing session token...
                      </span>
                    </div>
                  )}
                </div>
                <div style={{ position: "absolute", top: 0, right: 0, width: 1, height: 36, background: c.gold }} />
                <div style={{ position: "absolute", top: 0, right: 0, width: 36, height: 1, background: c.gold }} />
              </div>

              {/* Error state */}
              {error && (
                <div style={{ background: c.redBg, border: `1px solid ${c.redBorder}`, padding: "18px 20px", animation: "g-fadeIn .3s ease" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10, color: c.red }}>
                    <IcoAlert />
                    <span style={{ fontSize: 11, letterSpacing: ".08em", textTransform: "uppercase" }}>Wallet derivation failed</span>
                  </div>
                  <div style={{ fontSize: 12, color: c.red, lineHeight: 1.7, marginBottom: 16, opacity: .85 }}>{error}</div>
                  <BtnGold onClick={() => { setError(null); setTick(0); setRetrying(true); callBackend(); }}>
                    {retrying ? <><Spin size={11} /> Retrying...</> : "Retry →"}
                  </BtnGold>
                </div>
              )}
            </div>
          )}

          {/* ── Step 1 — Show wallet keys ── */}
          {step === 1 && wallet && (
            <div style={{ animation: "g-fadeUp .4s ease" }}>
              <Steps current={0} c={c} />
              <div style={{ fontSize: 10, color: c.gold, letterSpacing: ".2em", textTransform: "uppercase", marginBottom: 12 }}>Step 1 of 2</div>
              <h1 style={{ fontFamily: "'Bebas Neue'", fontSize: isMobile ? 40 : 50, letterSpacing: ".02em", lineHeight: 1, marginBottom: 12 }}>
                YOUR WALLET<br />IS READY
              </h1>
              <p style={{ fontSize: 13, color: c.textMuted, lineHeight: 1.7, marginBottom: 28, fontFamily: "'Instrument Serif',serif", fontStyle: "italic" }}>
                Your Orchard unified address and viewing key. Auto-restore on every login — your keypair is all you need.
              </p>

              <KeyRow label="Unified Address (utest1...) — share to receive ZEC" value={wallet.unifiedAddress} accent={c.blue} copyKey="addr" copied={copied.addr} onCopy={copy} />
              <KeyRow label="Unified Full Viewing Key (uviewtest1...) — share with accountant" value={wallet.viewingKey} accent={c.green} copyKey="vk" copied={copied.vk} onCopy={copy} />

              {/* Seed phrase */}
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 9, letterSpacing: ".16em", textTransform: "uppercase", marginBottom: 7, color: "var(--ws-text-faint)" }}>
                  Seed Phrase (24 words) — never share · back up offline
                </div>
                <div style={{ background: "var(--ws-inset)", border: `1px solid ${c.red}22`, padding: "14px" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 1, background: c.borderGap, marginBottom: 10 }}>
                    {Array.isArray(wallet.mnemonic) && wallet.mnemonic.map((word, i) => (
                      <div key={i} style={{ background: "var(--ws-card)", padding: "7px 10px", display: "flex", alignItems: "center", gap: 7 }}>
                        <span style={{ fontSize: 9, color: "var(--ws-text-faint)", width: 18, flexShrink: 0 }}>{String(i + 1).padStart(2, "0")}</span>
                        <span style={{ fontSize: 11, color: c.text, letterSpacing: ".02em" }}>{word}</span>
                      </div>
                    ))}
                  </div>
                  <button onClick={() => onCopy("mnemonic", Array.isArray(wallet.mnemonic) ? wallet.mnemonic.join(" ") : "")}
                    style={{ background: copied.mnemonic ? "var(--ws-green-bg)" : "var(--ws-card)", border: `1px solid ${copied.mnemonic ? "var(--ws-green-border)" : "var(--ws-border)"}`, padding: "7px 12px", cursor: "crosshair", color: copied.mnemonic ? "var(--ws-green)" : "var(--ws-text-faint)", display: "inline-flex", alignItems: "center", gap: 6, fontSize: 10, fontFamily: "'DM Mono',monospace", letterSpacing: ".08em", transition: "all .2s" }}>
                    {copied.mnemonic ? <><IcoCheck /> Copied</> : <><IcoCopy /> Copy Phrase</>}
                  </button>
                </div>
                <div style={{ fontSize: 10, color: c.red, marginTop: 6, lineHeight: 1.7 }}>
                  ⚠ Never share your seed phrase. Anyone with it can access your funds.
                </div>
              </div>

              {/* Birthday height */}
              <div style={{ marginBottom: 18 }}>
                <div style={{ fontSize: 9, letterSpacing: ".16em", textTransform: "uppercase", marginBottom: 7, color: "var(--ws-text-faint)" }}>
                  Wallet Birthday Height — note this for faster wallet recovery
                </div>
                <div style={{ background: "var(--ws-inset)", border: `1px solid ${c.gold}22`, padding: "12px 14px", display: "flex", alignItems: "center", gap: 12 }}>
                  <span style={{ fontFamily: "'Bebas Neue'", fontSize: 28, color: c.gold, letterSpacing: ".04em", lineHeight: 1 }}>
                    {wallet.birthdayHeight ?? 0}
                  </span>
                  <div>
                    <div style={{ fontSize: 11, color: c.textMuted }}>Testnet block height at wallet creation</div>
                    <div style={{ fontSize: 10, color: c.textDimmer, marginTop: 3 }}>
                      Use this when importing into other Zcash wallets to avoid scanning from genesis
                    </div>
                  </div>
                  <button onClick={() => onCopy("birthday", String(wallet.birthdayHeight ?? 0))}
                    style={{ background: copied.birthday ? "var(--ws-green-bg)" : "var(--ws-card)", border: `1px solid ${copied.birthday ? "var(--ws-green-border)" : "var(--ws-border)"}`, padding: "7px 10px", cursor: "crosshair", color: copied.birthday ? "var(--ws-green)" : "var(--ws-text-faint)", display: "flex", alignItems: "center", gap: 5, fontSize: 10, fontFamily: "'DM Mono',monospace", letterSpacing: ".08em", transition: "all .2s", marginLeft: "auto", flexShrink: 0 }}>
                    {copied.birthday ? <><IcoCheck /> Copied</> : <><IcoCopy /> Copy</>}
                  </button>
                </div>
              </div>

              {/* Protocol badges */}
              <div style={{ display: "flex", gap: 8, marginBottom: 18, flexWrap: "wrap" }}>
                {[
                  { l: "Protocol", v: "Orchard (NU5+)", col: c.green },
                  { l: "Network",  v: "Zcash Testnet",  col: c.gold  },
                  { l: "Address",  v: "utest1...",       col: c.blue  },
                  { l: "View Key", v: "uviewtest1...",   col: c.green },
                  { l: "Session",  v: "Token-based",     col: c.amber },
                ].map(b => (
                  <div key={b.l} style={{ background: c.bgCard, border: `1px solid ${c.border}`, padding: "5px 10px", display: "flex", gap: 6, alignItems: "center" }}>
                    <span style={{ fontSize: 9, color: c.textFaint, letterSpacing: ".1em", textTransform: "uppercase" }}>{b.l}</span>
                    <span style={{ fontSize: 10, color: b.col }}>{b.v}</span>
                  </div>
                ))}
              </div>

              {/* Session info box */}
              <div style={{ background: c.bgCard, border: `1px solid ${c.border}`, padding: "14px 16px", marginBottom: 22, display: "flex", gap: 12, position: "relative" }}>
                <div style={{ color: c.gold, flexShrink: 0, marginTop: 1 }}><IcoShield /></div>
                <div style={{ fontSize: 12, color: c.textMuted, lineHeight: 1.8 }}>
                  <strong style={{ color: c.text }}>Your private key was used once</strong> to derive this wallet and has been discarded server-side. All future requests use your session token only.
                  Session expires in <strong style={{ color: c.gold }}>8 hours</strong>. Get testnet ZEC at{" "}
                  <a href="https://testnet.zecfaucet.com" target="_blank" rel="noopener noreferrer" style={{ color: c.blue, textDecoration: "none" }}>testnet.zecfaucet.com</a>.
                </div>
                <div style={{ position: "absolute", top: 0, right: 0, width: 1, height: 28, background: c.gold }} />
                <div style={{ position: "absolute", top: 0, right: 0, width: 28, height: 1, background: c.gold }} />
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <BtnGold onClick={downloadWallet}>
                  {downloaded ? <><IcoCheck /> Downloaded</> : <><IcoDown /> Download Wallet Info</>}
                </BtnGold>
                <BtnGhost onClick={() => setStep(2)}>
                  I've noted my details — continue <IcoArrow />
                </BtnGhost>
              </div>
            </div>
          )}

          {/* ── Step 2 — Confirm ── */}
          {step === 2 && wallet && (
            <div style={{ animation: "g-fadeUp .4s ease" }}>
              <Steps current={1} c={c} />
              <div style={{ fontSize: 10, color: c.gold, letterSpacing: ".2em", textTransform: "uppercase", marginBottom: 12 }}>
                {isNewUser ? "Step 2 of 2" : "Wallet restored"}
              </div>
              <h1 style={{ fontFamily: "'Bebas Neue'", fontSize: isMobile ? 40 : 50, letterSpacing: ".02em", lineHeight: 1, marginBottom: 12 }}>
                CONFIRM &amp;<br />ENTER
              </h1>

              {/* Wallet summary */}
              <div style={{ background: c.bgCard, border: `1px solid ${c.borderCard}`, padding: "20px", marginBottom: 24, position: "relative" }}>
                <div style={{ position: "absolute", top: 0, right: 0, width: 1, height: 32, background: c.gold }} />
                <div style={{ position: "absolute", top: 0, right: 0, width: 32, height: 1, background: c.gold }} />
                <div style={{ fontSize: 9, color: c.gold, letterSpacing: ".16em", textTransform: "uppercase", marginBottom: 14 }}>Wallet Summary</div>
                {[
                  { l: "Unified Address", v: `${wallet.unifiedAddress.slice(0, 22)}...`, col: c.blue  },
                  { l: "Viewing Key",     v: `${wallet.viewingKey.slice(0, 22)}...`,     col: c.green },
                  { l: "Seed Phrase",     v: `${Array.isArray(wallet.mnemonic) ? wallet.mnemonic.slice(0,3).join(" ")+"..." : "—"}`, col: c.textMuted },
                  { l: "Birthday Height", v: String(wallet.birthdayHeight ?? 0),           col: c.gold  },
                  { l: "Protocol",        v: "Orchard (NU5+)",                            col: c.green },
                  { l: "Network",         v: "Zcash Testnet",                             col: c.gold  },
                  { l: "Session",         v: "Token issued · expires in 8h",              col: c.amber },
                  { l: "Derivation",      v: "Ed25519 → SHA-256 → ZIP-32",               col: c.textFaint },
                ].map(r => (
                  <div key={r.l} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: `1px solid ${c.border}`, fontSize: 11 }}>
                    <span style={{ color: c.textFaint }}>{r.l}</span>
                    <span style={{ color: r.col, fontFamily: "'DM Mono'", fontSize: 10 }}>{r.v}</span>
                  </div>
                ))}
              </div>

              {isNewUser && (
                <div style={{ border: `1px solid ${c.borderCard}`, background: c.bgCard, marginBottom: 24 }}>
                  {[
                    { k: "addr",       l: "I have copied my unified address (utest1...)" },
                    { k: "vk",         l: "I understand my wallet auto-restores on every login" },
                    { k: "understood", l: "I understand my private key was used once and discarded" },
                  ].map(ck => (
                    <div key={ck.k} style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "14px 18px", borderBottom: `1px solid ${c.border}`, cursor: "crosshair", transition: "background .15s" }}
                      onClick={() => setChecks(p => ({ ...p, [ck.k]: !p[ck.k] }))}
                      onMouseEnter={e => e.currentTarget.style.background = c.bgInset}
                      onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                      <div style={{ width: 18, height: 18, border: `1px solid ${checks[ck.k] ? c.green : c.borderStrong}`, background: checks[ck.k] ? c.greenBg : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "all .2s" }}>
                        {checks[ck.k] && <span style={{ color: c.green, fontSize: 11 }}>✓</span>}
                      </div>
                      <span style={{ fontSize: 12, color: checks[ck.k] ? c.textMuted : c.textFaint, lineHeight: 1.5 }}>{ck.l}</span>
                    </div>
                  ))}
                </div>
              )}

              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <BtnGold onClick={handleComplete} disabled={isNewUser && !allConfirmed}>
                  Enter Workspace <IcoArrow />
                </BtnGold>
                {isNewUser && <BtnGhost onClick={() => setStep(1)}>← Review Wallet Details</BtnGhost>}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
