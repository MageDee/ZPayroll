/**
 * ZPayroll — Shared Theme System
 * 
 * Provides light/dark tokens, responsive breakpoints,
 * and a useTheme hook consumed by all screens.
 * 
 * Usage:
 *   import { useTheme, t, responsive } from "./theme";
 *   const { theme, toggleTheme, isDark } = useTheme();
 *   <div style={{ background: t(theme).bg, color: t(theme).text }}>
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
  // Backgrounds
  bg:           "#050508",
  bgCard:       "#080810",
  bgCardHover:  "#0a0a14",
  bgInput:      "#080810",
  bgTerminal:   "#030305",
  bgInset:      "#050508",
  bgOverlay:    "rgba(3,3,6,.92)",
  bgNav:        "rgba(5,5,8,.94)",
  bgBanner:     "#0a0303",

  // Borders
  border:       "#0f0f18",
  borderCard:   "#111118",
  borderStrong: "#1a1a22",
  borderGap:    "#0a0a12",

  // Text
  text:         "#e8e4d9",
  textMuted:    "#555565",
  textFaint:    "#282835",
  textDimmer:   "#1e1e28",
  textLowest:   "#141420",

  // Accents (same in both modes)
  gold:         "#f4b728",
  goldHover:    "#fff0b0",
  goldFaint:    "rgba(244,183,40,.04)",
  goldBorder:   "rgba(244,183,40,.4)",
  green:        "#7fffb2",
  greenBg:      "#030a05",
  greenBorder:  "#0a1e0f",
  blue:         "#7fb2ff",
  red:          "#ff5050",
  redBg:        "#0a0303",
  redBorder:    "#200a0a",
  amber:        "#ffb27f",

  // Terminal
  termFg:       "#1e3a1e",
  termActive:   "#f4b728",
  termDone:     "#7fffb2",
  termCaret:    "#0d1e0d",

  // Grid overlay
  gridLine:     "rgba(244,183,40,.04)",
  scanLine:     "rgba(244,183,40,.025)",

  // Scrollbar
  scrollTrack:  "#050508",
  scrollThumb:  "#f4b728",
};

const LIGHT = {
  // Backgrounds
  bg:           "#f5f4ef",
  bgCard:       "#ffffff",
  bgCardHover:  "#faf9f5",
  bgInput:      "#faf9f5",
  bgTerminal:   "#1a1a22",
  bgInset:      "#eeede8",
  bgOverlay:    "rgba(240,239,234,.92)",
  bgNav:        "rgba(245,244,239,.96)",
  bgBanner:     "#fff5f5",

  // Borders
  border:       "#dddcd5",
  borderCard:   "#e0dfd8",
  borderStrong: "#c8c7c0",
  borderGap:    "#e8e7e0",

  // Text
  text:         "#1a1a22",
  textMuted:    "#666675",
  textFaint:    "#888890",
  textDimmer:   "#aaaaaa",
  textLowest:   "#cccccc",

  // Accents — same as dark
  gold:         "#d4960a",   // slightly darker for contrast on white
  goldHover:    "#b37d00",
  goldFaint:    "rgba(212,150,10,.05)",
  goldBorder:   "rgba(212,150,10,.4)",
  green:        "#1a7a44",
  greenBg:      "#f0faf5",
  greenBorder:  "#b8ddc8",
  blue:         "#2a5aaa",
  red:          "#cc2222",
  redBg:        "#fff5f5",
  redBorder:    "#ffcccc",
  amber:        "#b86a00",

  // Terminal (inverted — dark bg in light mode)
  termFg:       "#4a7a4a",
  termActive:   "#d4960a",
  termDone:     "#1a7a44",
  termCaret:    "#2a3a2a",

  // Grid overlay
  gridLine:     "rgba(212,150,10,.06)",
  scanLine:     "rgba(212,150,10,.03)",

  // Scrollbar
  scrollTrack:  "#f5f4ef",
  scrollThumb:  "#d4960a",
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
      title={`Switch to ${isDark ? "light" : "dark"} mode`}
      style={{
        display: "inline-flex", alignItems: "center", gap: 6,
        background: "transparent",
        border: `1px solid ${c.borderStrong}`,
        padding: "6px 12px",
        cursor: "crosshair",
        fontFamily: "'DM Mono', monospace",
        fontSize: 10, letterSpacing: ".1em", textTransform: "uppercase",
        color: c.textMuted,
        transition: "all .2s",
        ...style,
      }}
      onMouseEnter={e => { e.currentTarget.style.color = c.text; e.currentTarget.style.borderColor = c.gold; }}
      onMouseLeave={e => { e.currentTarget.style.color = c.textMuted; e.currentTarget.style.borderColor = c.borderStrong; }}
    >
      {isDark ? "☀ Light" : "☾ Dark"}
    </button>
  );
}

// ─── Global CSS generator ─────────────────────────────────────────────────────
// Returns a <style> string for scrollbars + base resets, themed.
export function globalCss(theme) {
  const c = t(theme);
  return `
    @import url('https://fonts.googleapis.com/css2?family=DM+Mono:ital,wght@0,300;0,400;0,500;1,300&family=Bebas+Neue&family=Instrument+Serif:ital@0;1&display=swap');
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    ::-webkit-scrollbar { width: 2px; }
    ::-webkit-scrollbar-track { background: ${c.scrollTrack}; }
    ::-webkit-scrollbar-thumb { background: ${c.gold}; }

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
