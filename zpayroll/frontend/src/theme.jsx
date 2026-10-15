/**
 * ZPayroll — Shared Theme System (v2: Zcash black + gold)
 *
 * Provides light/dark tokens, responsive breakpoints,
 * and a useTheme hook consumed by all screens.
 *
 * Dark  = Zcash black + gold
 * Light = warm paper + gold
 *
 * Token names are unchanged from v1, so existing screens keep working.
 * New tokens: goldFill, onGold, goldText, hero.
 */

import { useState, useEffect, createContext, useContext } from "react";

// ─── Breakpoints ──────────────────────────────────────────────────────────────
export const BP = {
  xs:  360,   // small phones
  sm:  480,   // phones
  md:  768,   // tablets
  lg:  1024,  // small laptops
  xl:  1280,  // desktops
};

export function useBreakpoint() {
  const [width, setWidth] = useState(
    typeof window !== "undefined" ? window.innerWidth : 1280
  );
  useEffect(() => {
    const h = () => setWidth(window.innerWidth);
    window.addEventListener("resize", h);
    return () => window.removeEventListener("resize", h);
  }, []);
  return {
    width,
    isXs:     width <  BP.sm,
    isSm:     width >= BP.xs  && width < BP.md,
    isMobile: width <  BP.md,
    isTablet: width >= BP.md  && width < BP.lg,
    isDesktop:width >= BP.lg,
  };
}

// ─── Colour tokens ────────────────────────────────────────────────────────────
const DARK = {
  // Backgrounds — true Zcash black, warm-tinted surfaces
  bg:           "#000000",
  bgCard:       "#0d0c08",
  bgCardHover:  "#14120b",
  bgInput:      "#0d0c08",
  bgTerminal:   "#050503",
  bgInset:      "#070604",
  bgOverlay:    "rgba(0,0,0,.92)",
  bgNav:        "rgba(10,9,6,.78)",
  bgBanner:     "#140806",

  // Borders
  border:       "#1c1a12",
  borderCard:   "#26231a",
  borderStrong: "#3a3526",
  borderGap:    "#14120c",

  // Text (lifted from v1 so labels and hints are actually readable on black)
  text:         "#f6f1e2",
  textMuted:    "#a8a18c",
  textFaint:    "#7d7765",
  textDimmer:   "#4f4a3b",
  textLowest:   "#2c291f",

  // Accents
  gold:         "#f4b728",
  goldHover:    "#ffd566",
  goldFaint:    "rgba(244,183,40,.07)",
  goldBorder:   "rgba(244,183,40,.4)",
  goldBg:       "rgba(244,183,40,.08)",
  goldFill:     "#f4b728",   // solid gold backgrounds (buttons, panels)
  onGold:       "#15110a",   // text/icons that sit on goldFill
  goldText:     "#f4b728",   // gold used as text
  green:        "#7fffb2",
  greenBg:      "#030a05",
  greenBorder:  "#0a1e0f",
  blue:         "#7fb2ff",
  red:          "#ff6a5f",
  redBg:        "#140806",
  redBorder:    "#2e120e",
  amber:        "#ffb27f",

  // Hero wash
  hero: "radial-gradient(120% 80% at 50% -10%, rgba(244,183,40,.30) 0%, rgba(244,183,40,.08) 40%, transparent 72%)",

  // Terminal
  termFg:       "#1e3a1e",
  termActive:   "#f4b728",
  termDone:     "#7fffb2",
  termCaret:    "#0d1e0d",

  // Grid overlay
  gridLine:     "rgba(244,183,40,.04)",
  scanLine:     "rgba(244,183,40,.025)",

  // Scrollbar
  scrollTrack:  "#000000",
  scrollThumb:  "#f4b728",
};

const LIGHT = {
  // Backgrounds — warm paper
  bg:           "#faf7ee",
  bgCard:       "#ffffff",
  bgCardHover:  "#fdfbf5",
  bgInput:      "#fdfbf5",
  bgTerminal:   "#15130c",
  bgInset:      "#f2eee0",
  bgOverlay:    "rgba(250,247,238,.92)",
  bgNav:        "rgba(255,255,255,.78)",
  bgBanner:     "#fff5f2",

  // Borders
  border:       "#e8e2cf",
  borderCard:   "#e2dbc4",
  borderStrong: "#cfc6a6",
  borderGap:    "#ece6d3",

  // Text
  text:         "#15120a",
  textMuted:    "#5c5744",
  textFaint:    "#7a745e",
  textDimmer:   "#a39c82",
  textLowest:   "#cfc8ae",

  // Accents — gold text is deeper so it holds contrast on paper
  gold:         "#9a6700",
  goldHover:    "#7a5200",
  goldFaint:    "rgba(244,183,40,.14)",
  goldBorder:   "rgba(154,103,0,.4)",
  goldBg:       "rgba(244,183,40,.16)",
  goldFill:     "#f4b728",
  onGold:       "#15110a",
  goldText:     "#8a5a00",
  green:        "#1a7a44",
  greenBg:      "#f0faf5",
  greenBorder:  "#b8ddc8",
  blue:         "#2a5aaa",
  red:          "#c62828",
  redBg:        "#fff5f2",
  redBorder:    "#ffd0c8",
  amber:        "#b86a00",

  // Hero wash
  hero: "radial-gradient(120% 80% at 50% -10%, rgba(244,183,40,.55) 0%, rgba(244,183,40,.18) 42%, transparent 74%)",

  // Terminal (inverted — dark bg in light mode)
  termFg:       "#4a7a4a",
  termActive:   "#f4b728",
  termDone:     "#7fffb2",
  termCaret:    "#2a3a2a",

  // Grid overlay
  gridLine:     "rgba(154,103,0,.06)",
  scanLine:     "rgba(154,103,0,.03)",

  // Scrollbar
  scrollTrack:  "#faf7ee",
  scrollThumb:  "#d9a21e",
};

export const t = (theme) => theme === "dark" ? DARK : LIGHT;

// ─── Theme context ────────────────────────────────────────────────────────────
export const ThemeContext = createContext({ theme: "dark", toggleTheme: () => {} });

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    if (typeof window === "undefined") return "dark";
    const saved = localStorage.getItem("zpayroll-theme");
    if (saved) return saved;
    return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
  });

  useEffect(() => {
    localStorage.setItem("zpayroll-theme", theme);
  }, [theme]);

  const toggleTheme = () => setTheme(p => p === "dark" ? "light" : "dark");

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, isDark: theme === "dark" }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}

// ─── Theme toggle button ──────────────────────────────────────────────────────
export function ThemeToggle({ style = {} }) {
  const { theme, toggleTheme, isDark } = useTheme();
  const c = t(theme);
  return (
    <button
      onClick={toggleTheme}
      aria-label={`Switch to ${isDark ? "light" : "dark"} mode`}
      title={`Switch to ${isDark ? "light" : "dark"} mode`}
      style={{
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        width: 38, height: 38, flexShrink: 0,
        background: "transparent",
        border: `1px solid ${c.borderStrong}`,
        borderRadius: 999,
        cursor: "pointer",
        color: c.text,
        transition: "border-color .2s, color .2s, background .2s",
        ...style,
      }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = c.gold; e.currentTarget.style.color = c.goldText; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = c.borderStrong; e.currentTarget.style.color = c.text; }}
    >
      {isDark ? (
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
        </svg>
      ) : (
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
        </svg>
      )}
    </button>
  );
}


// ─── Brand mark ───────────────────────────────────────────────────────────────
export function Mark({ size = 28 }) {
  const { theme } = useTheme();
  const c = t(theme);
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" fill="none" aria-hidden="true" style={{ flexShrink: 0 }}>
      <path d="M14 2 25 8v12l-11 6L3 20V8z" fill={c.goldFill} />
      <path d="M9.5 10.5h9l-9 7h9" stroke={c.onGold} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ─── CSS variables shared by the redesigned screens ───────────────────────────
export function themeVars(theme) {
  const c = t(theme);
  return {
    "--bg": c.bg, "--card": c.bgCard, "--inset": c.bgInset, "--nav": c.bgNav,
    "--line": c.border, "--line-strong": c.borderStrong,
    "--text": c.text, "--muted": c.textMuted, "--faint": c.textFaint,
    "--gold": c.gold, "--gold-fill": c.goldFill, "--on-gold": c.onGold, "--gold-text": c.goldText,
    "--green": c.green, "--green-bg": c.greenBg, "--green-line": c.greenBorder,
    "--red": c.red, "--red-bg": c.redBg, "--red-line": c.redBorder,
    "--blue": c.blue, "--amber": c.amber, "--hero": c.hero,
  };
}

// ─── Shared component styles (.zp-*) for Auth + Wallet setup ─────────────────
export function uiCss() {
  return `
    .zp-page { min-height: 100vh; background: var(--bg); color: var(--text); font-family: 'Plus Jakarta Sans', system-ui, sans-serif; line-height: 1.6; display: flex; flex-direction: column; position: relative; overflow-x: hidden; }
    .zp-page::before { content: ''; position: absolute; left: 0; right: 0; top: 0; height: 560px; background: var(--hero); pointer-events: none; }
    .zp-page button, .zp-page input, .zp-page textarea { font-family: inherit; }

    .zp-nav { position: relative; z-index: 5; margin: 12px auto 0; width: min(1120px, calc(100% - 24px)); display: flex; align-items: center; justify-content: space-between; gap: 10px;
      padding: 8px 8px 8px 16px; border-radius: 999px; background: var(--nav); border: 1px solid var(--line-strong); -webkit-backdrop-filter: blur(16px); backdrop-filter: blur(16px); }
    .zp-brand { display: flex; align-items: center; gap: 10px; min-width: 0; }
    .zp-brand b { font-family: 'Unbounded', sans-serif; font-weight: 700; font-size: 16px; letter-spacing: -0.02em; }
    .zp-badge { font-size: 11px; font-weight: 700; color: var(--gold-text); border: 1px solid var(--line-strong); border-radius: 999px; padding: 2px 9px; }
    .zp-nav-r { display: flex; align-items: center; gap: 8px; }
    .zp-chip { display: inline-flex; align-items: center; gap: 8px; border: 1px solid var(--line-strong); border-radius: 999px; padding: 7px 12px; font-size: 12px; color: var(--muted); font-family: 'DM Mono', monospace; }
    .zp-dot { width: 7px; height: 7px; border-radius: 50%; background: var(--green); flex-shrink: 0; }

    .zp-main { flex: 1; position: relative; z-index: 1; display: flex; justify-content: center; align-items: flex-start; padding: clamp(24px, 6vw, 64px) 12px 56px; }
    .zp-card { width: 100%; max-width: 520px; background: var(--card); border: 1px solid var(--line-strong); border-radius: 28px; padding: clamp(20px, 4vw, 32px); animation: g-fadeUp .45s ease both; }
    .zp-card.wide { max-width: 640px; }
    .zp-h { font-family: 'Unbounded', sans-serif; font-weight: 700; font-size: clamp(22px, 5.4vw, 30px); line-height: 1.16; letter-spacing: -0.03em; text-wrap: balance; }
    .zp-p { color: var(--muted); font-size: 15px; margin-top: 10px; }
    .zp-eyebrow { font-size: 13px; font-weight: 700; color: var(--gold-text); margin-bottom: 10px; }
    .zp-section { margin-top: 24px; }

    .zp-progress { display: flex; gap: 6px; margin-bottom: 22px; }
    .zp-progress i { flex: 1; height: 4px; border-radius: 99px; background: var(--line-strong); transition: background .3s; }
    .zp-progress i.on { background: var(--gold-fill); }
    .zp-progress i.done { background: var(--green); }

    .zp-btn { display: inline-flex; align-items: center; justify-content: center; gap: 8px; width: 100%; min-height: 50px; padding: 0 24px; border-radius: 999px; border: 1px solid transparent;
      font-size: 15px; font-weight: 700; cursor: pointer; transition: transform .15s, filter .2s, border-color .2s; text-decoration: none; }
    .zp-btn:active:not(:disabled) { transform: scale(.985); }
    .zp-btn:disabled { opacity: .45; cursor: not-allowed; }
    .zp-btn-gold { background: var(--gold-fill); color: var(--on-gold); box-shadow: 0 8px 28px -12px var(--gold-fill); }
    .zp-btn-gold:hover:not(:disabled) { filter: brightness(1.08); }
    .zp-btn-ghost { background: transparent; color: var(--text); border-color: var(--line-strong); }
    .zp-btn-ghost:hover:not(:disabled) { border-color: var(--gold); }
    .zp-btn-sm { width: auto; min-height: 40px; padding: 0 16px; font-size: 14px; box-shadow: none; }
    .zp-stack { display: flex; flex-direction: column; gap: 10px; margin-top: 22px; }

    .zp-label { font-size: 13px; font-weight: 700; color: var(--muted); margin-bottom: 7px; }
    .zp-field { margin-top: 16px; }
    .zp-input { width: 100%; background: var(--inset); border: 1px solid var(--line-strong); border-radius: 16px; padding: 13px 15px; color: var(--text); font-family: 'DM Mono', monospace; font-size: 13px; outline: none; resize: none; transition: border-color .2s, box-shadow .2s; }
    .zp-input:focus { border-color: var(--gold); box-shadow: 0 0 0 3px rgba(244,183,40,.18); }
    .zp-input::placeholder { color: var(--faint); }

    .zp-opt { display: flex; align-items: center; gap: 14px; width: 100%; text-align: left; background: var(--inset); border: 1px solid var(--line-strong); border-radius: 22px; padding: 18px; color: var(--text); cursor: pointer; transition: border-color .2s, transform .15s; }
    .zp-opt:hover { border-color: var(--gold); }
    .zp-opt:active { transform: scale(.99); }
    .zp-opt-ico { width: 44px; height: 44px; border-radius: 50%; display: grid; place-items: center; flex-shrink: 0; background: var(--gold-fill); color: var(--on-gold); }
    .zp-opt-ico.alt { background: transparent; border: 1px solid var(--line-strong); color: var(--gold-text); }
    .zp-opt b { display: block; font-size: 16px; line-height: 1.3; }
    .zp-opt span.s { display: block; font-size: 14px; color: var(--muted); margin-top: 3px; line-height: 1.5; }

    .zp-note { display: flex; gap: 12px; align-items: flex-start; border-radius: 18px; padding: 14px 16px; font-size: 14px; line-height: 1.6; border: 1px solid var(--line-strong); background: var(--inset); color: var(--muted); margin-top: 18px; }
    .zp-note svg { flex-shrink: 0; margin-top: 3px; }
    .zp-note.warn { border-color: var(--gold); color: var(--text); }
    .zp-note.warn svg { color: var(--gold-text); }
    .zp-note.err { border-color: var(--red-line); background: var(--red-bg); color: var(--red); }
    .zp-note.ok { border-color: var(--green-line); background: var(--green-bg); color: var(--green); }

    .zp-kv { margin-top: 18px; border: 1px solid var(--line); border-radius: 20px; background: var(--inset); padding: 4px 16px; }
    .zp-kv > div { display: flex; justify-content: space-between; align-items: center; gap: 14px; padding: 11px 0; border-top: 1px solid var(--line); font-size: 14px; }
    .zp-kv > div:first-child { border-top: none; }
    .zp-kv span { color: var(--muted); }
    .zp-kv b { font-weight: 600; text-align: right; overflow-wrap: anywhere; }

    .zp-key { margin-top: 16px; }
    .zp-key-box { display: flex; gap: 10px; align-items: flex-start; background: var(--inset); border: 1px solid var(--line-strong); border-radius: 18px; padding: 12px 12px 12px 15px; }
    .zp-key-val { flex: 1; min-width: 0; font-family: 'DM Mono', monospace; font-size: 12.5px; line-height: 1.7; overflow-wrap: anywhere; word-break: break-all; }
    .zp-copy { display: inline-flex; align-items: center; gap: 6px; flex-shrink: 0; background: transparent; border: 1px solid var(--line-strong); color: var(--text); border-radius: 999px; padding: 7px 12px; font-size: 13px; font-weight: 700; cursor: pointer; transition: border-color .2s, color .2s; }
    .zp-copy:hover { border-color: var(--gold); }
    .zp-copy.done { color: var(--green); border-color: var(--green-line); }

    .zp-check { display: flex; gap: 14px; align-items: flex-start; width: 100%; text-align: left; background: transparent; border: none; border-top: 1px solid var(--line); padding: 15px 4px; cursor: pointer; color: var(--muted); font-size: 14px; line-height: 1.5; }
    .zp-check:first-child { border-top: none; }
    .zp-check:hover { color: var(--text); }
    .zp-check .box { width: 22px; height: 22px; border-radius: 7px; border: 1.5px solid var(--line-strong); display: grid; place-items: center; flex-shrink: 0; margin-top: 1px; transition: background .2s, border-color .2s; color: var(--on-gold); }
    .zp-check.on { color: var(--text); }
    .zp-check.on .box { background: var(--gold-fill); border-color: var(--gold-fill); }
    .zp-checks { margin-top: 20px; border: 1px solid var(--line); border-radius: 20px; background: var(--inset); padding: 2px 16px; }

    .zp-seed { display: grid; grid-template-columns: repeat(2, 1fr); gap: 6px; margin-top: 4px; }
    @media (min-width: 560px) { .zp-seed { grid-template-columns: repeat(4, 1fr); } }
    .zp-word { display: flex; gap: 8px; align-items: baseline; background: var(--card); border: 1px solid var(--line); border-radius: 12px; padding: 8px 10px; font-family: 'DM Mono', monospace; font-size: 13px; }
    .zp-word i { font-style: normal; font-size: 11px; color: var(--faint); width: 18px; flex-shrink: 0; }

    .zp-term { background: #050503; border: 1px solid var(--line-strong); border-radius: 22px; overflow: hidden; margin-top: 24px; }
    .zp-term-bar { display: flex; align-items: center; gap: 7px; padding: 12px 16px; border-bottom: 1px solid #1c1a12; color: #8a8470; font-size: 12px; }
    .zp-term-bar i { width: 10px; height: 10px; border-radius: 50%; opacity: .7; }
    .zp-term-body { padding: 16px 18px 18px; min-height: 230px; font-family: 'DM Mono', monospace; font-size: 12.5px; line-height: 2; }
    .zp-term-body > div { display: flex; gap: 10px; align-items: center; animation: g-fadeIn .2s ease; overflow-wrap: anywhere; }

    .zp-pills { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 18px; }
    .zp-pill { display: inline-flex; gap: 7px; align-items: baseline; border: 1px solid var(--line); border-radius: 999px; padding: 6px 12px; font-size: 13px; color: var(--muted); background: var(--inset); }
    .zp-pill b { color: var(--text); font-weight: 700; }

    @media (max-width: 767px) {
      .zp-input { font-size: 16px; }
      .zp-brand b { font-size: 15px; }
      .zp-hide-m { display: none !important; }
    }
  `;
}

// ─── Global CSS generator ─────────────────────────────────────────────────────
// Returns a <style> string for fonts, scrollbars + base resets, themed.
// NOTE: the @import must stay first in any <style> that includes this string.
export function globalCss(theme) {
  const c = t(theme);
  return `
    @import url('https://fonts.googleapis.com/css2?family=Unbounded:wght@500;600;700&family=Plus+Jakarta+Sans:wght@400;500;600;700&family=DM+Mono:ital,wght@0,300;0,400;0,500;1,300&family=Bebas+Neue&family=Instrument+Serif:ital@0;1&display=swap');
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    :root { color-scheme: ${theme === "dark" ? "dark" : "light"}; }
    html, body { background: ${c.bg}; -webkit-text-size-adjust: 100%; -webkit-tap-highlight-color: transparent; }
    ::-webkit-scrollbar { width: 6px; height: 6px; }
    ::-webkit-scrollbar-track { background: ${c.scrollTrack}; }
    ::-webkit-scrollbar-thumb { background: ${c.scrollThumb}; border-radius: 99px; }

    button:focus-visible, a:focus-visible { outline: 2px solid ${c.gold}; outline-offset: 2px; }

    @keyframes g-spin    { to { transform: rotate(360deg); } }
    @keyframes g-fadeUp  { from { opacity:0; transform:translateY(18px); } to { opacity:1; transform:translateY(0); } }
    @keyframes g-fadeIn  { from { opacity:0; } to { opacity:1; } }
    @keyframes g-slide   { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }
    @keyframes g-grid    { 0%,100%{opacity:.04} 50%{opacity:.08} }
    @keyframes g-scan    { from{transform:translateY(-100%)} to{transform:translateY(100vh)} }
    @keyframes g-pulse   { 0%,100%{opacity:1} 50%{opacity:.35} }
    @keyframes g-marquee { from{transform:translateX(0)} to{transform:translateX(-50%)} }
    @keyframes g-blink   { 0%,100%{opacity:1} 50%{opacity:0} }
    @keyframes g-glitch1 { 0%{clip-path:inset(0 0 95% 0);transform:translate(-4px,0)} 50%{clip-path:inset(40% 0 40% 0);transform:translate(4px,0)} 100%{clip-path:inset(90% 0 0 0);transform:translate(0,0)} }
    @keyframes g-glitch2 { 0%{clip-path:inset(50% 0 30% 0);transform:translate(4px,0)} 50%{clip-path:inset(20% 0 60% 0);transform:translate(-3px,0)} 100%{clip-path:inset(70% 0 10% 0);transform:translate(0,0)} }
    @keyframes g-warn    { 0%,100%{border-color:${c.redBorder}} 50%{border-color:${c.red}40} }

    @media (prefers-reduced-motion: reduce) {
      *, *::before, *::after { animation-duration: .001ms !important; animation-iteration-count: 1 !important; transition-duration: .001ms !important; scroll-behavior: auto !important; }
    }

    /* Responsive helpers */
    .hide-mobile  { display: block; }
    .show-mobile  { display: none;  }
    @media (max-width: 767px) {
      .hide-mobile { display: none;  }
      .show-mobile { display: block; }
    }
  `;
}

// ─── Responsive padding helper ────────────────────────────────────────────────
export function pagePadding(width) {
  if (width < BP.sm)  return "0 16px";
  if (width < BP.md)  return "0 24px";
  if (width < BP.lg)  return "0 32px";
  return "0 48px";
}

// ─── Responsive font size helper ──────────────────────────────────────────────
export function heroFontSize(width) {
  if (width < BP.xs)  return 52;
  if (width < BP.sm)  return 64;
  if (width < BP.md)  return 80;
  if (width < BP.lg)  return 120;
  return 160;
}
