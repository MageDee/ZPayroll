export const API = (() => {
  if (typeof window !== "undefined" && window.__ZPAYROLL_CONFIG__?.apiUrl) {
    return window.__ZPAYROLL_CONFIG__.apiUrl;
  }
  return import.meta.env.VITE_API_URL || "/api";
})();
