import { useState, useEffect } from "react";
import { useTheme, t, ThemeToggle, Mark, themeVars, uiCss, globalCss } from "./theme";
import { API } from "./apiConfig";

// ─── Icons ────────────────────────────────────────────────────────────────────
const sv = { fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" };
const IcoCopy   = () => <svg width="14" height="14" viewBox="0 0 24 24" {...sv}><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>;
const IcoCheck  = () => <svg width="14" height="14" viewBox="0 0 24 24" {...sv} strokeWidth="2.6"><polyline points="20 6 9 17 4 12"/></svg>;
const IcoDown   = () => <svg width="16" height="16" viewBox="0 0 24 24" {...sv}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>;
const IcoShield = () => <svg width="17" height="17" viewBox="0 0 24 24" {...sv}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>;
const IcoAlert  = () => <svg width="17" height="17" viewBox="0 0 24 24" {...sv}><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>;

const Spin = () => <span style={{ width: 16, height: 16, border: "2px solid currentColor", borderTopColor: "transparent", borderRadius: "50%", animation: "g-spin .75s linear infinite", display: "inline-block", opacity: .8 }} />;

function Progress({ step }) {
  return (
    <div className="zp-progress" role="img" aria-label={`Step ${step + 1} of 3`}>
      {[0, 1, 2].map(i => <i key={i} className={i < step ? "done" : i === step ? "on" : ""} />)}
    </div>
  );
}

function KeyRow({ label, value, color, copied, onCopy }) {
  return (
    <div className="zp-key">
      <div className="zp-label">{label}</div>
      <div className="zp-key-box">
        <div className="zp-key-val" style={{ color }}>{value}</div>
        <button className={`zp-copy ${copied ? "done" : ""}`} onClick={onCopy}>{copied ? <><IcoCheck /> Copied</> : <><IcoCopy /> Copy</>}</button>
      </div>
    </div>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────
export default function WalletSetup({ session, onComplete }) {
  const { theme } = useTheme();
  const c = t(theme);

  const [step, setStep]         = useState(0);
  const [wallet, setWallet]     = useState(null); // { unifiedAddress, viewingKey, mnemonic, birthdayHeight, sessionToken, expiresAt, network }
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
    "starting zingo wallet engine...",
    "creating zip-32 orchard key hierarchy...",
    "deriving orchard spending key...",
    "deriving orchard full viewing key...",
    "encoding unified address (utest1...)...",
    "encoding unified viewing key (uviewtest1...)...",
    "issuing session token...",
    "private key discarded, wallet ready ✓",
  ] : [
    "importing ed25519 keypair...",
    "re-deriving orchard wallet from private key...",
    "issuing fresh session token...",
    "private key discarded, session ready ✓",
  ];

  useEffect(() => {
    if (step !== 0) return;
    const timer = setInterval(() => setTick(n => Math.min(n + 1, termLines.length - 1)), 420);
    return () => clearInterval(timer);
  }, [step]);

  useEffect(() => { callBackend(); }, []);

  // ── Backend call — logic unchanged ──
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

      const text = await res.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch {
        throw new Error(`Invalid server response (${res.status}): ${text.slice(0, 200)}`);
      }
      if (!res.ok) throw new Error(data.error || `Server error ${res.status}`);

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
        unifiedAddress: data.unifiedAddress,
        viewingKey:     data.viewingKey,
        mnemonic:       data.mnemonic,
        birthdayHeight: data.birthdayHeight,
        sessionToken:   data.sessionToken,
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
    navigator.clipboard?.writeText(val);
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

  const handleComplete = () => onComplete(wallet);
  const allConfirmed = checks.addr && checks.vk && checks.understood;
  const phrase = wallet && Array.isArray(wallet.mnemonic) ? wallet.mnemonic.join(" ") : "";

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
          {session?.publicKey && (
            <span className="zp-chip zp-hide-m"><i className="zp-dot" />{session.publicKey.slice(0, 8)}···{session.publicKey.slice(-6)}</span>
          )}
        </div>
      </header>

      <main className="zp-main">
        <div className="zp-card wide">

          {/* ── Deriving ── */}
          {step === 0 && (
            <div>
              <div className="zp-eyebrow">{isNewUser ? "Creating your wallet" : "Restoring your wallet"}</div>
              <h1 className="zp-h">{isNewUser ? "Creating your Zcash wallet" : "Restoring your Zcash wallet"}</h1>
              <p className="zp-p">
                {isNewUser
                  ? "Your private key is sent once to derive your Orchard wallet. You get a session token back, and the key is never sent again."
                  : "Re-deriving your wallet from your keypair. A fresh session token will be issued."}
              </p>

              <div className="zp-term" aria-live="polite">
                <div className="zp-term-bar">
                  {["#ff6a5f", "#f4b728", "#7fffb2"].map(col => <i key={col} style={{ background: col }} />)}
                  <span style={{ marginLeft: 6 }}>orchard wallet {isNewUser ? "derivation" : "restoration"}</span>
                </div>
                <div className="zp-term-body">
                  {termLines.slice(0, tick + 1).map((line, i) => (
                    <div key={i} style={{ color: i === termLines.length - 1 ? "#7fffb2" : i === tick ? "#f4b728" : "#5f7a5f" }}>
                      <span style={{ color: "#4a4636" }}>$</span><span>{line}</span>
                    </div>
                  ))}
                  {!error && tick < termLines.length - 1 && (
                    <div style={{ color: "#8a8470", marginTop: 6 }}><Spin /><span>deriving keys and issuing session token</span></div>
                  )}
                </div>
              </div>

              {error && (
                <div className="zp-note err" role="alert" style={{ flexDirection: "column", gap: 10 }}>
                  <div style={{ display: "flex", gap: 10, alignItems: "center", fontWeight: 700 }}><IcoAlert /> Wallet derivation failed</div>
                  <div style={{ overflowWrap: "anywhere" }}>{error}</div>
                  <button className="zp-btn zp-btn-gold" onClick={() => { setError(null); setTick(0); setRetrying(true); callBackend(); }}>
                    {retrying ? <><Spin /> Retrying</> : "Try again"}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ── Wallet ready ── */}
          {step === 1 && wallet && (
            <div>
              <Progress step={0} />
              <h1 className="zp-h">Your wallet is ready</h1>
              <p className="zp-p">Your Orchard unified address and viewing key. Your wallet restores on every login, so your keypair is all you need.</p>

              <KeyRow label="Unified address (share to receive ZEC)" value={wallet.unifiedAddress} color="var(--blue)" copied={copied.addr} onCopy={() => copy("addr", wallet.unifiedAddress)} />
              <KeyRow label="Unified full viewing key (share with your accountant)" value={wallet.viewingKey} color="var(--green)" copied={copied.vk} onCopy={() => copy("vk", wallet.viewingKey)} />

              <div className="zp-key">
                <div className="zp-label">Seed phrase (24 words). Never share it. Back it up offline.</div>
                <div className="zp-key-box" style={{ borderColor: "var(--red-line)", flexDirection: "column", alignItems: "stretch" }}>
                  <div className="zp-seed">
                    {wallet.mnemonic.map((word, i) => (
                      <div className="zp-word" key={i}><i>{String(i + 1).padStart(2, "0")}</i><span>{word}</span></div>
                    ))}
                  </div>
                  <button className={`zp-copy ${copied.mnemonic ? "done" : ""}`} style={{ alignSelf: "flex-start", marginTop: 8 }} onClick={() => copy("mnemonic", phrase)}>
                    {copied.mnemonic ? <><IcoCheck /> Copied</> : <><IcoCopy /> Copy phrase</>}
                  </button>
                </div>
                <div style={{ fontSize: 13, color: "var(--red)", marginTop: 8 }}>Anyone with this phrase can access your funds.</div>
              </div>

              <div className="zp-key">
                <div className="zp-label">Wallet birthday height</div>
                <div className="zp-key-box" style={{ alignItems: "center" }}>
                  <span style={{ fontFamily: "'Unbounded', sans-serif", fontWeight: 700, fontSize: 24, color: "var(--gold-text)", letterSpacing: "-.02em" }}>{wallet.birthdayHeight ?? 0}</span>
                  <span style={{ flex: 1, fontSize: 13, color: "var(--muted)", lineHeight: 1.5 }}>Testnet block height at creation. Use it when importing into another Zcash wallet to skip scanning from the start.</span>
                  <button className={`zp-copy ${copied.birthday ? "done" : ""}`} onClick={() => copy("birthday", String(wallet.birthdayHeight ?? 0))}>
                    {copied.birthday ? <><IcoCheck /> Copied</> : <><IcoCopy /> Copy</>}
                  </button>
                </div>
              </div>

              <div className="zp-pills">
                {[["Protocol", "Orchard (NU5+)"], ["Network", "Zcash testnet"], ["Session", "Token-based"]].map(([l, v]) => (
                  <span className="zp-pill" key={l}>{l} <b>{v}</b></span>
                ))}
              </div>

              <div className="zp-note">
                <IcoShield />
                <span>
                  <b style={{ color: "var(--text)" }}>Your private key was used once</b> to derive this wallet and has been discarded by the server. Every later request uses your session token only. The session expires in <b style={{ color: "var(--text)" }}>8 hours</b>. Get testnet ZEC at{" "}
                  <a href="https://testnet.zecfaucet.com" target="_blank" rel="noopener noreferrer" style={{ color: "var(--blue)" }}>testnet.zecfaucet.com</a>.
                </span>
              </div>

              <div className="zp-stack">
                <button className="zp-btn zp-btn-gold" onClick={downloadWallet}>{downloaded ? <><IcoCheck /> Downloaded</> : <><IcoDown /> Download wallet info</>}</button>
                <button className="zp-btn zp-btn-ghost" onClick={() => setStep(2)}>I've saved my details, continue</button>
              </div>
            </div>
          )}

          {/* ── Confirm ── */}
          {step === 2 && wallet && (
            <div>
              {isNewUser ? <Progress step={1} /> : <div className="zp-eyebrow">Wallet restored</div>}
              <h1 className="zp-h">Confirm and enter</h1>

              <div className="zp-kv">
                <div><span>Unified address</span><b style={{ color: "var(--blue)", fontFamily: "'DM Mono', monospace", fontSize: 13 }}>{wallet.unifiedAddress.slice(0, 22)}...</b></div>
                <div><span>Viewing key</span><b style={{ color: "var(--green)", fontFamily: "'DM Mono', monospace", fontSize: 13 }}>{(wallet.viewingKey || "—").slice(0, 22)}...</b></div>
                <div><span>Birthday height</span><b>{String(wallet.birthdayHeight ?? 0)}</b></div>
                <div><span>Protocol</span><b>Orchard (NU5+)</b></div>
                <div><span>Network</span><b>Zcash testnet</b></div>
                <div><span>Session</span><b>Token issued, expires in 8h</b></div>
                <div><span>Derivation</span><b>Ed25519 → SHA-256 → ZIP-32</b></div>
              </div>

              {isNewUser && (
                <div className="zp-checks">
                  {[
                    { k: "addr",       l: "I have copied my unified address (utest1...)" },
                    { k: "vk",         l: "I understand my wallet restores on every login" },
                    { k: "understood", l: "I understand my private key was used once and discarded" },
                  ].map(ck => (
                    <button key={ck.k} className={`zp-check ${checks[ck.k] ? "on" : ""}`} role="checkbox" aria-checked={checks[ck.k]} onClick={() => setChecks(p => ({ ...p, [ck.k]: !p[ck.k] }))}>
                      <span className="box">{checks[ck.k] && <IcoCheck />}</span>
                      <span>{ck.l}</span>
                    </button>
                  ))}
                </div>
              )}

              <div className="zp-stack">
                <button className="zp-btn zp-btn-gold" onClick={handleComplete} disabled={isNewUser && !allConfirmed}>Enter workspace</button>
                {isNewUser && <button className="zp-btn zp-btn-ghost" onClick={() => setStep(1)}>Review wallet details</button>}
              </div>
            </div>
          )}

        </div>
      </main>
    </div>
  );
}
