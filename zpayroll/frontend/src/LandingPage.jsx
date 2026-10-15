import { useState, useEffect, useRef } from "react";
import { useTheme, t, ThemeToggle, globalCss } from "./theme";

// ─── Content ──────────────────────────────────────────────────────────────────
const SAMPLE_RUN = [
  { name: "Amara Osei",  role: "Lead engineer", amount: "0.45", initials: "AO" },
  { name: "Tunde Bello", role: "Designer",      amount: "0.32", initials: "TB" },
  { name: "Lena Park",   role: "Support",       amount: "0.28", initials: "LP" },
];

const STEPS = [
  { title: "Create your keys",     body: "Generate an Ed25519 keypair in your browser. No email, no password. Save the keys, because there is no reset." },
  { title: "Fund your wallet",     body: "ZPayroll derives a private Orchard wallet from your keys. Send it testnet ZEC from the faucet." },
  { title: "Add your team",        body: "Enter each employee's unified address and their salary per cycle." },
  { title: "Run payroll",          body: "Every payment is a shielded transaction. Require M-of-N co-signers if you want approval before funds move." },
  { title: "Share a viewing key",  body: "Give your accountant read-only access to every payment, with no ability to spend." },
];

const COMPARE = [
  { label: "On-chain",  bad: "All amounts public",   good: "zk-SNARK shielded" },
  { label: "Identity",  bad: "Email and password",   good: "Ed25519 keypair"   },
  { label: "Custody",   bad: "Platform holds funds", good: "Self-custodial"    },
  { label: "Geography", bad: "Bank rails required",  good: "Borderless ZEC"    },
];

// ─── Small pieces ─────────────────────────────────────────────────────────────
function Mark({ size = 28 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" fill="none" aria-hidden="true">
      <path d="M14 2 25 8v12l-11 6L3 20V8z" fill="var(--gold-fill)" />
      <path d="M9.5 10.5h9l-9 7h9" stroke="var(--on-gold)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="4" y="11" width="16" height="10" rx="3" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </svg>
  );
}

function scrollToId(id) {
  const el = document.getElementById(id);
  if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
}

// ─── Hero demo: what the chain sees vs what the employer sees ────────────────
function PayrollPreview() {
  const [view, setView] = useState("you");
  const touched = useRef(false);

  // One orchestrated moment: after a beat, flip to the public view once.
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = setTimeout(() => { if (!touched.current) setView("chain"); }, 3400);
    return () => clearTimeout(id);
  }, []);

  const pick = (v) => { touched.current = true; setView(v); };
  const hidden = view === "chain";

  return (
    <div className="lp-preview">
      <div className="lp-preview-head">
        <div className="lp-seg" role="group" aria-label="Choose who is looking at this payroll run">
          <button aria-pressed={!hidden} className={!hidden ? "on" : ""} onClick={() => pick("you")}>You see</button>
          <button aria-pressed={hidden} className={hidden ? "on" : ""}  onClick={() => pick("chain")}>The blockchain sees</button>
        </div>
        <span className="lp-sample">Sample data</span>
      </div>

      <div key={view} className="lp-swap" aria-live="polite">
        {SAMPLE_RUN.map((e) => (
          <div className="lp-row" key={e.name}>
            <div className="lp-row-l">
              <span className={`lp-avatar ${hidden ? "lock" : ""}`}>{hidden ? <LockIcon /> : e.initials}</span>
              <span className="lp-row-text">
                <span className="lp-row-name">{hidden ? "Shielded recipient" : e.name}</span>
                <span className="lp-row-sub">{hidden ? "Address not visible" : e.role}</span>
              </span>
            </div>
            {hidden
              ? <span className="lp-redact" role="img" aria-label="Amount hidden" />
              : <span className="lp-amt">{e.amount} <small>ZEC</small></span>}
          </div>
        ))}

        <div className="lp-total">
          <span>{hidden ? "Memo and proof" : "Total sent"}</span>
          <strong>{hidden ? "Encrypted, valid" : "1.05 ZEC"}</strong>
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function LandingPage({ onEnter }) {
  const { theme } = useTheme();
  const c = t(theme);

  const vars = {
    "--bg": c.bg, "--card": c.bgCard, "--inset": c.bgInset, "--nav": c.bgNav,
    "--line": c.border, "--line-strong": c.borderStrong,
    "--text": c.text, "--muted": c.textMuted, "--faint": c.textFaint,
    "--gold": c.gold, "--gold-fill": c.goldFill, "--on-gold": c.onGold, "--gold-text": c.goldText,
    "--green": c.green, "--red": c.red, "--hero": c.hero,
    "--grad": theme === "dark"
      ? "linear-gradient(90deg,#ffe9a8 0%,#f4b728 55%,#d9981a 100%)"
      : "linear-gradient(90deg,#b87800 0%,#8a5a00 100%)",
  };

  return (
    <div className="lp" style={vars}>
      <style>{`
        ${globalCss(theme)}

        .lp { background: var(--bg); color: var(--text); font-family: 'Plus Jakarta Sans', system-ui, sans-serif; min-height: 100vh; overflow-x: hidden; line-height: 1.6; }
        .lp button { font-family: inherit; }
        .lp-wrap { max-width: 1120px; margin: 0 auto; padding: 0 clamp(16px, 4vw, 40px); }
        .lp-display { font-family: 'Unbounded', 'Plus Jakarta Sans', sans-serif; font-weight: 700; letter-spacing: -0.03em; }

        /* ── Nav ── */
        .lp-nav { position: fixed; top: 12px; left: 50%; transform: translateX(-50%); z-index: 50;
          width: min(1120px, calc(100% - 24px)); display: flex; align-items: center; justify-content: space-between; gap: 12px;
          padding: 8px 8px 8px 16px; border-radius: 999px; background: var(--nav); border: 1px solid var(--line-strong);
          -webkit-backdrop-filter: blur(16px); backdrop-filter: blur(16px); }
        .lp-brand { display: flex; align-items: center; gap: 10px; }
        .lp-brand-name { font-family: 'Unbounded', sans-serif; font-weight: 700; font-size: 17px; letter-spacing: -0.01em; }
        .lp-badge { font-size: 11px; font-weight: 700; color: var(--gold-text); border: 1px solid var(--line-strong); border-radius: 999px; padding: 2px 9px; }
        .lp-links { display: flex; gap: 4px; }
        .lp-link { background: none; border: none; color: var(--muted); font-size: 14px; font-weight: 600; padding: 8px 14px; border-radius: 999px; cursor: pointer; transition: color .2s, background .2s; }
        .lp-link:hover { color: var(--text); background: var(--inset); }
        .lp-nav-r { display: flex; align-items: center; gap: 8px; }

        /* ── Buttons ── */
        .lp-btn { display: inline-flex; align-items: center; justify-content: center; gap: 8px; min-height: 48px; padding: 0 26px;
          border-radius: 999px; border: 1px solid transparent; font-size: 15px; font-weight: 700; cursor: pointer; text-decoration: none;
          transition: transform .15s, filter .2s, background .2s, border-color .2s; }
        .lp-btn:active { transform: scale(.98); }
        .lp-btn-gold { background: var(--gold-fill); color: var(--on-gold); box-shadow: 0 8px 28px -10px var(--gold-fill); }
        .lp-btn-gold:hover { filter: brightness(1.08); }
        .lp-btn-ghost { background: transparent; color: var(--text); border-color: var(--line-strong); }
        .lp-btn-ghost:hover { border-color: var(--gold); }
        .lp-btn-sm { min-height: 40px; padding: 0 18px; font-size: 14px; box-shadow: none; }
        .lp-btn-dark { background: var(--on-gold); color: #fff; }
        .lp-btn-dark:hover { filter: brightness(1.25); }

        /* ── Hero ── */
        .lp-hero { background: var(--hero); text-align: center; padding: 132px 0 72px; }
        .lp-h1 { font-size: clamp(25px, 7vw, 80px); line-height: 1.1; max-width: 1000px; margin: 0 auto; text-wrap: balance; }
        .lp-h1 span { display: block; }
        .lp-h1 .lp-grad { display: block; width: fit-content; margin: 0 auto; background: var(--grad); -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; color: var(--gold-text); }
        .lp-sub { max-width: 560px; margin: 24px auto 0; color: var(--muted); font-size: clamp(16px, 2.2vw, 19px); text-wrap: balance; }
        .lp-cta { display: flex; justify-content: center; gap: 12px; flex-wrap: wrap; margin-top: 32px; }
        .lp-note { margin-top: 14px; font-size: 13px; color: var(--faint); }

        .lp-h1, .lp-sub, .lp-cta, .lp-note, .lp-preview { animation: g-fadeUp .8s ease both; }
        .lp-sub { animation-delay: .12s; } .lp-cta { animation-delay: .2s; } .lp-note { animation-delay: .24s; } .lp-preview { animation-delay: .32s; }

        /* ── Preview card ── */
        .lp-preview { max-width: 520px; margin: 56px auto 0; text-align: left; background: var(--card); border: 1px solid var(--line-strong);
          border-radius: 28px; padding: 14px; box-shadow: 0 30px 80px -40px rgba(0,0,0,.6); }
        .lp-preview-head { display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 2px 4px 14px; flex-wrap: wrap; }
        .lp-seg { display: inline-flex; background: var(--inset); border: 1px solid var(--line); border-radius: 999px; padding: 4px; }
        .lp-seg button { border: none; background: transparent; color: var(--muted); font-size: 13px; font-weight: 700; padding: 8px 14px; border-radius: 999px; cursor: pointer; transition: background .2s, color .2s; }
        .lp-seg button.on { background: var(--gold-fill); color: var(--on-gold); }
        .lp-sample { font-size: 12px; color: var(--faint); }
        .lp-swap { display: grid; gap: 8px; animation: g-fadeIn .35s ease both; }
        .lp-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; background: var(--inset); border: 1px solid var(--line); border-radius: 20px; padding: 14px 16px; min-height: 68px; }
        .lp-row-l { display: flex; align-items: center; gap: 12px; min-width: 0; }
        .lp-avatar { width: 38px; height: 38px; flex-shrink: 0; display: grid; place-items: center; border-radius: 50%; background: var(--gold-fill); color: var(--on-gold); font-size: 13px; font-weight: 800; }
        .lp-avatar.lock { background: transparent; border: 1px dashed var(--line-strong); color: var(--faint); }
        .lp-row-text { display: flex; flex-direction: column; min-width: 0; }
        .lp-row-name { font-weight: 700; font-size: 15px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .lp-row-sub { font-size: 13px; color: var(--faint); }
        .lp-amt { font-family: 'Unbounded', sans-serif; font-weight: 700; font-size: 20px; white-space: nowrap; }
        .lp-amt small { font-family: 'Plus Jakarta Sans', sans-serif; font-weight: 700; font-size: 12px; color: var(--muted); }
        .lp-redact { width: 84px; height: 16px; border-radius: 999px; flex-shrink: 0;
          background: repeating-linear-gradient(135deg, var(--line-strong) 0 6px, transparent 6px 12px); }
        .lp-total { display: flex; align-items: center; justify-content: space-between; padding: 12px 16px 6px; font-size: 14px; color: var(--muted); }
        .lp-total strong { color: var(--text); font-size: 15px; }

        /* ── Sections ── */
        .lp-section { padding: clamp(64px, 10vw, 110px) 0; }
        .lp-h2 { font-size: clamp(22px, 4.4vw, 40px); line-height: 1.14; text-wrap: balance; }
        .lp-lead { color: var(--muted); font-size: 17px; margin-top: 16px; max-width: 440px; }

        .lp-steps { display: grid; grid-template-columns: 1fr; gap: 36px; }
        .lp-steps ol { list-style: none; }
        .lp-step { display: grid; grid-template-columns: 56px 1fr; gap: 8px 16px; padding: 22px 0; border-top: 1px solid var(--line-strong); }
        .lp-step:last-child { border-bottom: 1px solid var(--line-strong); }
        .lp-step-n { font-family: 'Unbounded', sans-serif; font-weight: 700; font-size: 28px; line-height: 1; color: var(--gold-text); }
        .lp-step h3 { font-size: 19px; font-weight: 700; line-height: 1.25; }
        .lp-step p { color: var(--muted); margin-top: 6px; font-size: 15px; }

        .lp-cmp { margin-top: 36px; background: var(--card); border: 1px solid var(--line-strong); border-radius: 28px; padding: clamp(8px, 2vw, 16px); }
        .lp-cmp-head, .lp-cmp-row { display: grid; grid-template-columns: 1fr; gap: 6px; }
        .lp-cmp-head { display: none; }
        .lp-cmp-row { padding: 18px 14px; border-top: 1px solid var(--line); }
        .lp-cmp-row:first-of-type { border-top: none; }
        .lp-cmp-k { font-weight: 700; }
        .lp-cmp-bad, .lp-cmp-good { display: flex; align-items: center; gap: 10px; font-size: 15px; }
        .lp-cmp-bad { color: var(--muted); }
        .lp-cmp-good { color: var(--text); font-weight: 600; }
        .lp-tag { font-size: 12px; font-weight: 700; color: var(--faint); min-width: 70px; }
        .lp-x, .lp-ok { width: 20px; height: 20px; flex-shrink: 0; border-radius: 50%; display: grid; place-items: center; font-size: 11px; font-weight: 800; }
        .lp-x  { border: 1px solid var(--line-strong); color: var(--faint); }
        .lp-ok { background: var(--gold-fill); color: var(--on-gold); }

        .lp-feat { display: grid; grid-template-columns: 1fr; gap: 14px; margin-top: 36px; }
        .lp-card { background: var(--card); border: 1px solid var(--line-strong); border-radius: 28px; padding: clamp(22px, 3vw, 32px); }
        .lp-card h3 { font-family: 'Unbounded', sans-serif; font-weight: 700; font-size: clamp(17px, 2vw, 22px); line-height: 1.2; letter-spacing: -0.02em; }
        .lp-card p { color: var(--muted); margin-top: 10px; font-size: 15px; }
        .lp-main { background-image: var(--hero); background-color: var(--card); }
        .lp-main-grid { display: grid; grid-template-columns: 1fr; gap: 24px; align-items: center; }
        .lp-facts { display: grid; gap: 8px; }
        .lp-fact { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; background: var(--inset); border: 1px solid var(--line); border-radius: 16px; padding: 12px 16px; font-size: 14px; }
        .lp-fact span { color: var(--faint); }
        .lp-fact b { font-weight: 700; text-align: right; }

        /* ── CTA ── */
        .lp-cta-panel { background: var(--gold-fill); color: var(--on-gold); border-radius: 32px; padding: clamp(36px, 6vw, 72px) clamp(24px, 5vw, 64px); text-align: center; }
        .lp-cta-panel h2 { font-family: 'Unbounded', sans-serif; font-weight: 700; font-size: clamp(22px, 4.4vw, 44px); line-height: 1.12; letter-spacing: -0.03em; max-width: 720px; margin: 0 auto; text-wrap: balance; }
        .lp-cta-panel p { margin: 16px auto 28px; max-width: 520px; font-size: 17px; opacity: .8; }

        /* ── Footer ── */
        .lp-foot { padding: 32px 0 40px; }
        .lp-foot-row { display: flex; align-items: center; justify-content: space-between; gap: 14px 24px; flex-wrap: wrap; color: var(--faint); font-size: 13px; }

        /* ── Wider screens ── */
        @media (min-width: 760px) {
          .lp-cmp-head { display: grid; grid-template-columns: 150px 1fr 1fr; padding: 14px 14px 8px; font-size: 13px; font-weight: 700; color: var(--faint); gap: 12px; }
          .lp-cmp-head span:last-child { color: var(--gold-text); }
          .lp-cmp-row { grid-template-columns: 150px 1fr 1fr; align-items: center; gap: 12px; }
          .lp-tag { display: none; }
        }
        @media (min-width: 900px) {
          .lp-steps { grid-template-columns: 5fr 7fr; gap: 64px; align-items: start; }
          .lp-steps-intro { position: sticky; top: 110px; }
          .lp-feat { grid-template-columns: repeat(3, 1fr); }
          .lp-main { grid-column: 1 / -1; }
          .lp-main-grid { grid-template-columns: 1.1fr 1fr; gap: 40px; }
        }
        @media (max-width: 759px) {
          .lp-links { display: none; }
          .lp-badge { display: none; }
        }
        @media (max-width: 420px) {
          .lp-cta .lp-btn, .lp-cta-panel .lp-btn { width: 100%; }
          .lp-seg button { padding: 8px 11px; font-size: 12.5px; }
        }
      `}</style>

      {/* ── Nav ── */}
      <header className="lp-nav">
        <div className="lp-brand">
          <Mark />
          <span className="lp-brand-name">ZPayroll</span>
          <span className="lp-badge">Testnet</span>
        </div>
        <nav className="lp-links" aria-label="Page sections">
          <button className="lp-link" onClick={() => scrollToId("how")}>How it works</button>
          <button className="lp-link" onClick={() => scrollToId("privacy")}>Privacy</button>
          <button className="lp-link" onClick={() => scrollToId("features")}>Features</button>
        </nav>
        <div className="lp-nav-r">
          <ThemeToggle />
          <button className="lp-btn lp-btn-gold lp-btn-sm" onClick={onEnter}>Launch app</button>
        </div>
      </header>

      <main>
        {/* ── Hero ── */}
        <section className="lp-hero">
          <div className="lp-wrap">
            <h1 className="lp-h1 lp-display">
              <span>Pay your team.</span>
              <span className="lp-grad">Keep the numbers private.</span>
            </h1>
            <p className="lp-sub">
              ZPayroll sends salaries as Zcash shielded transactions, so amounts and recipients stay off the public ledger.
            </p>
            <div className="lp-cta">
              <button className="lp-btn lp-btn-gold" onClick={onEnter}>Create workspace</button>
              <button className="lp-btn lp-btn-ghost" onClick={onEnter}>Log in</button>
            </div>
            <p className="lp-note">Testnet demo. No real funds involved.</p>

            <PayrollPreview />
          </div>
        </section>

        {/* ── How it works ── */}
        <section className="lp-section" id="how">
          <div className="lp-wrap lp-steps">
            <div className="lp-steps-intro">
              <h2 className="lp-h2 lp-display">From empty wallet to paid team in five steps</h2>
              <p className="lp-lead">Set up once, then every payroll run is a single action.</p>
            </div>
            <ol>
              {STEPS.map((s, i) => (
                <li className="lp-step" key={s.title}>
                  <span className="lp-step-n">{i + 1}</span>
                  <div>
                    <h3>{s.title}</h3>
                    <p>{s.body}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* ── Comparison ── */}
        <section className="lp-section" id="privacy" style={{ paddingTop: 0 }}>
          <div className="lp-wrap">
            <h2 className="lp-h2 lp-display" style={{ maxWidth: 640 }}>Most crypto payroll is public. This one isn't.</h2>
            <div className="lp-cmp">
              <div className="lp-cmp-head" aria-hidden="true">
                <span />
                <span>Standard crypto payroll</span>
                <span>ZPayroll</span>
              </div>
              {COMPARE.map((r) => (
                <div className="lp-cmp-row" key={r.label}>
                  <div className="lp-cmp-k">{r.label}</div>
                  <div className="lp-cmp-bad"><span className="lp-x" aria-hidden="true">✕</span><span className="lp-tag">Standard</span>{r.bad}</div>
                  <div className="lp-cmp-good"><span className="lp-ok" aria-hidden="true">✓</span><span className="lp-tag">ZPayroll</span>{r.good}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Features ── */}
        <section className="lp-section" id="features" style={{ paddingTop: 0 }}>
          <div className="lp-wrap">
            <h2 className="lp-h2 lp-display" style={{ maxWidth: 640 }}>Built for payroll, not just payments</h2>
            <div className="lp-feat">
              <div className="lp-card lp-main">
                <div className="lp-main-grid">
                  <div>
                    <h3>Shielded by default</h3>
                    <p>Salaries are Orchard shielded transactions. Amounts, senders and recipients stay hidden on-chain, and your employees can't see each other's pay.</p>
                  </div>
                  <div className="lp-facts">
                    <div className="lp-fact"><span>Pool</span><b>Orchard (NU5+)</b></div>
                    <div className="lp-fact"><span>Proofs</span><b>Halo2, no trusted setup</b></div>
                    <div className="lp-fact"><span>Addresses</span><b>Unified (ZIP-316)</b></div>
                  </div>
                </div>
              </div>

              <div className="lp-card">
                <h3>Auditable on your terms</h3>
                <p>Share a Unified Full Viewing Key with your accountant. They can read every payment and can't move a cent.</p>
              </div>
              <div className="lp-card">
                <h3>Approvals before funds move</h3>
                <p>Require M of N co-signers to approve a payroll run. Each signs in their own browser.</p>
              </div>
              <div className="lp-card">
                <h3>Your wallet, your funds</h3>
                <p>Every workspace gets its own wallet. ZPayroll never holds or controls your funds.</p>
              </div>
            </div>
          </div>
        </section>

        {/* ── CTA ── */}
        <section style={{ paddingBottom: "clamp(48px, 8vw, 96px)" }}>
          <div className="lp-wrap">
            <div className="lp-cta-panel">
              <h2>Run your first private payroll</h2>
              <p>Create your keys, fund a testnet wallet and send shielded payments in about five minutes.</p>
              <button className="lp-btn lp-btn-dark" onClick={onEnter}>Create workspace</button>
            </div>
          </div>
        </section>
      </main>

      {/* ── Footer ── */}
      <footer className="lp-foot">
        <div className="lp-wrap">
          <div className="lp-foot-row">
            <div className="lp-brand"><Mark size={22} /><span className="lp-brand-name" style={{ fontSize: 15, color: "var(--muted)" }}>ZPayroll</span></div>
            <span>Built for the Zcash hackathon. Testnet only.</span>
            <span>Powered by Zcash and ZingoLib</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
