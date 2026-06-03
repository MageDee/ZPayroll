import { useState, useEffect, useRef } from "react";
import { useTheme, useBreakpoint, t, ThemeToggle, pagePadding, globalCss } from "./theme";

export default function LandingPage({ onEnter }) {
  const { theme, isDark }       = useTheme();
  const { width, isMobile, isTablet } = useBreakpoint();
  const c                       = t(theme);
  const pad                     = pagePadding(width);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [scrollY, setScrollY]   = useState(0);
  const [glitching, setGlitching] = useState(false);
  const [mobileNav, setMobileNav] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const onMouse  = e => setMousePos({ x: e.clientX, y: e.clientY });
    const onScroll = () => setScrollY(ref.current?.scrollTop || 0);
    const gi = setInterval(() => { setGlitching(true); setTimeout(() => setGlitching(false), 120); }, 4000);
    window.addEventListener("mousemove", onMouse);
    ref.current?.addEventListener("scroll", onScroll);
    return () => { window.removeEventListener("mousemove", onMouse); clearInterval(gi); };
  }, []);

  const features = [
    { number: "01", title: "Cryptographic Identity", body: "No email. No password. Your identity is an Ed25519 keypair generated in your browser, held only by you." },
    { number: "02", title: "Shielded Payroll",        body: "Salaries are Orchard shielded transactions. Amounts, senders and recipients are cryptographically hidden." },
    { number: "03", title: "Zero Custody",            body: "Your wallet is derived in-browser. Your keys never touch our servers. You hold them — always." },
    { number: "04", title: "Borderless by Default",   body: "Pay anyone, anywhere, with no bank rails, no SWIFT fees. ZEC settles in ~75 seconds." },
  ];

  const problems = [
    { label: "On-chain",  bad: "All amounts public",   good: "zk-SNARK shielded"  },
    { label: "Identity",  bad: "Email + password",      good: "Ed25519 keypair"    },
    { label: "Custody",   bad: "Platform holds funds",  good: "Self-custodial"     },
    { label: "Geography", bad: "Bank rails required",   good: "Borderless ZEC"     },
  ];

  const heroSize   = isMobile ? "clamp(64px,18vw,100px)" : isTablet ? "clamp(80px,13vw,130px)" : "clamp(100px,13vw,180px)";
  const sectionPad = isMobile ? "60px 0" : "100px 0";

  return (
    <div ref={ref} style={{ background: c.bg, color: c.text, fontFamily: "'DM Mono','Courier New',monospace", overflowX: "hidden", cursor: "crosshair", minHeight: "100vh", position: "relative" }}>
      <style>{`
        ${globalCss(theme)}

        /* cursor glow — desktop only */
        .lp-cursor { position:fixed;pointer-events:none;z-index:9999;width:260px;height:260px;border-radius:50%;background:radial-gradient(circle,${c.goldFaint} 0%,transparent 70%);transition:transform .1s ease; }

        /* scrollbar */
        ::-webkit-scrollbar { width:2px; }
        ::-webkit-scrollbar-track { background:${c.scrollTrack}; }
        ::-webkit-scrollbar-thumb { background:${c.gold}; }

        /* hero headline */
        .hero-word { display:block;font-family:'Bebas Neue',sans-serif;font-size:${heroSize};line-height:.88;letter-spacing:-.02em;animation:g-fadeUp .8s ease both; }
        .hero-word.d1{animation-delay:.1s} .hero-word.d2{animation-delay:.2s} .hero-word.d3{animation-delay:.3s}

        /* glitch */
        .glitch { position:relative;display:inline-block; }
        .glitch::before,.glitch::after { content:attr(data-text);position:absolute;inset:0;font-family:'Bebas Neue',sans-serif;font-size:inherit;line-height:inherit; }
        .glitch.on::before { animation:g-glitch1 .12s steps(1) forwards;color:${c.gold}; }
        .glitch.on::after  { animation:g-glitch2 .12s steps(1) forwards; }

        /* nav */
        .lp-nav-link { background:none;border:none;cursor:crosshair;font-family:'DM Mono',monospace;font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:${c.textMuted};transition:color .2s;padding:0; }
        .lp-nav-link:hover { color:${c.text}; }

        /* buttons */
        .lp-btn-gold { display:inline-flex;align-items:center;gap:10px;background:${c.gold};color:${isDark?"#050508":"#fff"};border:none;font-family:'DM Mono',monospace;font-size:13px;font-weight:500;letter-spacing:.12em;text-transform:uppercase;padding:16px 36px;cursor:crosshair;transition:all .15s;clip-path:polygon(0 0,calc(100% - 12px) 0,100% 12px,100% 100%,12px 100%,0 calc(100% - 12px)); }
        .lp-btn-gold:hover { background:${c.goldHover};transform:translate(-2px,-2px);box-shadow:4px 4px 0 ${c.gold}; }
        .lp-btn-ghost { display:inline-flex;align-items:center;gap:10px;background:transparent;color:${c.text};border:1px solid ${c.borderStrong};font-family:'DM Mono',monospace;font-size:13px;letter-spacing:.1em;text-transform:uppercase;padding:15px 28px;cursor:crosshair;transition:all .15s; }
        .lp-btn-ghost:hover { border-color:${c.gold};color:${c.gold}; }

        /* stat block */
        .stat-block { border-left:2px solid ${c.gold};padding-left:18px; }

        /* comparison */
        .compare-row { display:grid;grid-template-columns:${isMobile?"1fr":"160px 1fr 1fr"};gap:${isMobile?"8px":"0"};border-bottom:1px solid ${c.border};padding:14px 0;transition:background .15s; }
        .compare-row:hover { background:${c.bgInset}; }
        .badge { font-size:10px;letter-spacing:.1em;text-transform:uppercase;padding:4px 10px;border:1px solid; }
        .badge-bad  { color:${c.red};border-color:${c.redBorder};background:${c.redBg}; }
        .badge-good { color:${c.green};border-color:${c.greenBorder};background:${c.greenBg}; }

        /* feature card */
        .feature-card { border-top:1px solid ${c.border};padding:${isMobile?"28px 0":"40px 0"};transition:border-color .2s; }
        .feature-card:hover { border-top-color:${c.gold}; }

        /* ticker */
        .ticker-item { display:inline-flex;align-items:center;gap:20px;padding:0 20px;white-space:nowrap;font-size:10px;letter-spacing:.16em;text-transform:uppercase;color:${c.textDimmer}; }
        .ticker-dot  { width:3px;height:3px;background:${c.gold};border-radius:50%;flex-shrink:0; }

        /* mobile nav */
        .mobile-nav-btn { background:none;border:none;cursor:crosshair;font-size:20px;color:${c.textMuted};padding:4px; }

        /* grid bg */
        .lp-grid { position:fixed;inset:0;pointer-events:none;z-index:0;background-image:linear-gradient(${c.gridLine} 1px,transparent 1px),linear-gradient(90deg,${c.gridLine} 1px,transparent 1px);background-size:60px 60px;animation:g-grid 6s ease-in-out infinite; }
        .lp-scan  { position:fixed;inset:0;pointer-events:none;z-index:0;overflow:hidden; }
        .lp-scan-line { position:absolute;left:0;right:0;height:2px;background:linear-gradient(transparent,${c.scanLine},transparent);animation:g-scan 10s linear infinite; }

        /* responsive tweaks */
        @media (max-width:767px) {
          .lp-btn-gold,.lp-btn-ghost { width:100%;justify-content:center;font-size:12px;padding:14px 20px; }
          .cta-row { flex-direction:column; }
          .stat-row { gap:28px; }
          .compare-row { grid-template-columns:1fr; }
          .feature-grid { grid-template-columns:1fr!important; }
          .hero-sub { font-size:14px!important; }
          .section-head-row { flex-direction:column;gap:16px; }
          .footer-row { flex-direction:column;gap:12px;text-align:center; }
          .cta-banner { margin:0 16px 80px!important;padding:48px 28px!important; }
        }
        @media (min-width:768px) and (max-width:1023px) {
          .feature-grid { grid-template-columns:60px 1fr 1fr!important; }
        }
      `}</style>

      {/* Cursor glow — desktop only */}
      {!isMobile && (
        <div className="lp-cursor" style={{ transform: `translate(${mousePos.x - 130}px,${mousePos.y - 130}px)` }} />
      )}

      {/* Backgrounds */}
      <div className="lp-grid" />
      <div className="lp-scan"><div className="lp-scan-line" /></div>

      {/* ── Nav ── */}
      <nav style={{ position: "sticky", top: 0, zIndex: 50, background: c.bgNav, backdropFilter: "blur(20px)", borderBottom: `1px solid ${c.border}`, padding: `0 ${isMobile ? "16px" : "48px"}`, display: "flex", alignItems: "center", justifyContent: "space-between", height: 60 }}>
        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 22, height: 22, background: c.gold, clipPath: "polygon(50% 0%,100% 25%,100% 75%,50% 100%,0% 75%,0% 25%)", animation: "g-pulse 3s ease-in-out infinite" }} />
          <span style={{ fontFamily: "'Bebas Neue'", fontSize: 20, letterSpacing: ".05em" }}>ZPAYROLL</span>
          <span style={{ fontSize: 9, color: c.gold, letterSpacing: ".15em", border: `1px solid ${c.goldBorder}`, padding: "2px 6px" }}>TESTNET</span>
        </div>

        {/* Desktop nav */}
        {!isMobile && (
          <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
            {["How it works", "Privacy", "Zcash"].map(l => <button key={l} className="lp-nav-link">{l}</button>)}
          </div>
        )}

        {/* Right controls */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <ThemeToggle />
          {!isMobile && (
            <>
              <button className="lp-btn-ghost" onClick={onEnter} style={{ padding: "9px 18px", fontSize: 10 }}>Log in</button>
              <button className="lp-btn-gold"  onClick={onEnter} style={{ padding: "10px 22px", fontSize: 10 }}>Launch App →</button>
            </>
          )}
          {isMobile && (
            <button className="mobile-nav-btn" onClick={() => setMobileNav(p => !p)}>☰</button>
          )}
        </div>
      </nav>

      {/* Mobile menu */}
      {isMobile && mobileNav && (
        <div style={{ position: "fixed", inset: 0, top: 60, background: c.bgNav, backdropFilter: "blur(20px)", zIndex: 49, padding: "32px 24px", display: "flex", flexDirection: "column", gap: 16, animation: "g-fadeIn .2s ease" }}>
          {["How it works", "Privacy", "Zcash"].map(l => (
            <button key={l} className="lp-nav-link" style={{ fontSize: 16, padding: "12px 0", borderBottom: `1px solid ${c.border}`, textAlign: "left" }}>{l}</button>
          ))}
          <button className="lp-btn-gold" onClick={() => { setMobileNav(false); onEnter(); }} style={{ marginTop: 16 }}>Launch App →</button>
          <button className="lp-btn-ghost" onClick={() => { setMobileNav(false); onEnter(); }}>Log in</button>
        </div>
      )}

      {/* ── Hero ── */}
      <section style={{ maxWidth: 1200, margin: "0 auto", padding: `${isMobile ? "80px" : "120px"} ${pad} 80px`, position: "relative", zIndex: 1 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 32, animation: "g-fadeIn .6s ease" }}>
          <div style={{ width: 28, height: 1, background: c.gold }} />
          <span style={{ fontSize: 10, letterSpacing: ".2em", textTransform: "uppercase", color: c.gold }}>Built on Zcash · Orchard shielded · NU5+</span>
        </div>

        <div style={{ marginBottom: 36 }}>
          {["PRIVATE", "PAYROLL", "ON-CHAIN"].map((w, i) => (
            <span key={w} className={`hero-word d${i + 1}`} style={{ color: i === 2 ? "transparent" : i === 1 ? c.gold : c.text, WebkitTextStroke: i === 2 ? `1px ${c.borderStrong}` : "none" }}>
              {i === 1
                ? <span className={`glitch ${glitching ? "on" : ""}`} data-text="PAYROLL">PAYROLL</span>
                : w}
            </span>
          ))}
        </div>

        <p className="hero-sub" style={{ maxWidth: 480, fontSize: 16, lineHeight: 1.8, color: c.textMuted, fontFamily: "'Instrument Serif',serif", fontStyle: "italic", marginBottom: 40, animation: "g-fadeUp .8s .4s ease both" }}>
          The first payroll platform where salaries are cryptographically hidden. Your employees can't see each other's pay. Neither can we.
        </p>

        <div className="cta-row" style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 72, animation: "g-fadeUp .8s .5s ease both" }}>
          <button className="lp-btn-gold" onClick={onEnter}>Create Workspace →</button>
          <button className="lp-btn-ghost">↓ How it works</button>
        </div>

        {/* Stats */}
        <div className="stat-row" style={{ display: "flex", gap: 44, flexWrap: "wrap", animation: "g-fadeUp .8s .6s ease both" }}>
          {[
            { v: "~75s",     l: "Settlement time"  },
            { v: "0%",       l: "Bank visibility"  },
            { v: "Orchard",  l: "Privacy protocol" },
            { v: "Testnet",  l: "Network"          },
          ].map(s => (
            <div key={s.l} className="stat-block">
              <div style={{ fontFamily: "'Bebas Neue'", fontSize: 30, color: c.text, letterSpacing: ".02em" }}>{s.v}</div>
              <div style={{ fontSize: 10, color: c.textFaint, letterSpacing: ".1em", textTransform: "uppercase", marginTop: 4 }}>{s.l}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Ticker ── */}
      <div style={{ borderTop: `1px solid ${c.border}`, borderBottom: `1px solid ${c.border}`, overflow: "hidden", padding: "12px 0", background: c.bgCard, position: "relative", zIndex: 1 }}>
        <div style={{ display: "flex", animation: "g-marquee 26s linear infinite", width: "max-content" }}>
          {[...Array(7)].map((_, i) => (
            <div key={i} style={{ display: "flex" }}>
              {["SHIELDED PAYROLL", "ZK-SNARK PROOFS", "ED25519 IDENTITY", "ORCHARD PROTOCOL", "ZERO CUSTODY", "ZCASH TESTNET"].map(txt => (
                <div key={txt} className="ticker-item"><div className="ticker-dot" />{txt}</div>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* ── Comparison ── */}
      <section style={{ padding: sectionPad, position: "relative", zIndex: 1 }}>
        <div style={{ maxWidth: 960, margin: "0 auto", padding: `0 ${pad}` }}>
          <div className="section-head-row" style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 40 }}>
            <div>
              <div style={{ fontSize: 10, color: c.gold, letterSpacing: ".18em", textTransform: "uppercase", marginBottom: 10 }}>The difference</div>
              <h2 style={{ fontFamily: "'Bebas Neue'", fontSize: "clamp(36px,6vw,64px)", lineHeight: 1, letterSpacing: ".02em" }}>PAYROLL,<br />REIMAGINED</h2>
            </div>
            {!isMobile && <p style={{ maxWidth: 260, fontSize: 13, color: c.textMuted, lineHeight: 1.7, textAlign: "right" }}>Traditional crypto payroll exposes everything. ZPayroll hides everything — by default.</p>}
          </div>

          {!isMobile && (
            <div style={{ display: "grid", gridTemplateColumns: "160px 1fr 1fr", marginBottom: 8 }}>
              <div />
              <div style={{ fontSize: 9, color: c.textFaint, letterSpacing: ".14em", textTransform: "uppercase", padding: "0 0 10px 16px" }}>Standard Crypto Payroll</div>
              <div style={{ fontSize: 9, color: c.gold,      letterSpacing: ".14em", textTransform: "uppercase", padding: "0 0 10px 16px" }}>ZPayroll</div>
            </div>
          )}

          {problems.map((p, i) => (
            <div key={i} className="compare-row">
              {!isMobile && <span style={{ fontSize: 10, color: c.textFaint, letterSpacing: ".08em", textTransform: "uppercase" }}>{p.label}</span>}
              <div style={{ padding: isMobile ? "0" : "0 16px" }}>
                {isMobile && <div style={{ fontSize: 9, color: c.textFaint, letterSpacing: ".1em", textTransform: "uppercase", marginBottom: 4 }}>{p.label} — before</div>}
                <span className="badge badge-bad">✗ {p.bad}</span>
              </div>
              <div style={{ padding: isMobile ? "0" : "0 16px" }}>
                {isMobile && <div style={{ fontSize: 9, color: c.gold, letterSpacing: ".1em", textTransform: "uppercase", marginBottom: 4 }}>{p.label} — with ZPayroll</div>}
                <span className="badge badge-good">✓ {p.good}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Features ── */}
      <section style={{ padding: sectionPad, position: "relative", zIndex: 1 }}>
        <div style={{ maxWidth: 960, margin: "0 auto", padding: `0 ${pad}` }}>
          <div style={{ fontSize: 10, color: c.gold, letterSpacing: ".18em", textTransform: "uppercase", marginBottom: 48 }}>How it works</div>
          {features.map((f, i) => (
            <div key={i} className="feature-card" style={{ animationDelay: `${i * .1}s` }}>
              <div className="feature-grid" style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "72px 1fr 1fr", gap: isMobile ? 10 : 28, alignItems: "start" }}>
                <div style={{ fontFamily: "'Bebas Neue'", fontSize: isMobile ? 32 : 44, color: c.borderStrong, lineHeight: 1 }}>{f.number}</div>
                <div style={{ fontFamily: "'Bebas Neue'", fontSize: isMobile ? 22 : 26, letterSpacing: ".04em", lineHeight: 1.1, paddingTop: isMobile ? 0 : 4, color: c.text }}>{f.title}</div>
                <div style={{ fontSize: 13, color: c.textMuted, lineHeight: 1.8 }}>{f.body}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA Banner ── */}
      <section className="cta-banner" style={{ margin: `0 ${isMobile ? "16px" : "48px"} 100px`, position: "relative", zIndex: 1, border: `1px solid ${c.border}`, padding: isMobile ? "48px 28px" : "72px 60px", background: isDark ? "linear-gradient(135deg,#080810 0%,#0a0a08 100%)" : "linear-gradient(135deg,#faf9f4 0%,#f0efe8 100%)", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: 0, right: 0, width: 1, height: 60, background: c.gold }} />
        <div style={{ position: "absolute", top: 0, right: 0, width: 60, height: 1, background: c.gold }} />
        <div style={{ maxWidth: 560 }}>
          <div style={{ fontFamily: "'Bebas Neue'", fontSize: isMobile ? "clamp(36px,10vw,52px)" : "clamp(40px,6vw,68px)", lineHeight: .95, letterSpacing: ".02em", marginBottom: 20 }}>
            YOUR TEAM.<br /><span style={{ color: c.gold }}>YOUR PRIVACY.</span>
          </div>
          <p style={{ fontSize: 13, color: c.textMuted, lineHeight: 1.8, marginBottom: 32, fontFamily: "'Instrument Serif',serif", fontStyle: "italic" }}>
            Generate your Ed25519 keypair, create your Zcash wallet, run your first shielded payroll in under 5 minutes.
          </p>
          <button className="lp-btn-gold" onClick={onEnter} style={{ fontSize: isMobile ? 12 : 13, padding: isMobile ? "14px 28px" : "18px 44px" }}>Create Workspace →</button>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer style={{ borderTop: `1px solid ${c.border}`, padding: `28px ${pad}`, position: "relative", zIndex: 1 }}>
        <div className="footer-row" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 18, height: 18, background: c.gold, clipPath: "polygon(50% 0%,100% 25%,100% 75%,50% 100%,0% 75%,0% 25%)" }} />
            <span style={{ fontFamily: "'Bebas Neue'", fontSize: 15, color: c.textFaint, letterSpacing: ".05em" }}>ZPAYROLL</span>
          </div>
          <div style={{ fontSize: 10, color: c.textDimmer, letterSpacing: ".1em" }}>BUILT FOR THE ZCASH HACKATHON · TESTNET ONLY</div>
          <div style={{ fontSize: 10, color: c.textDimmer }}>
            Powered by <span style={{ color: c.gold }}>Zcash</span> + <span style={{ color: c.green }}>WebZjs</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
