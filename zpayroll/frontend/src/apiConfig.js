function normalizeUrl(value) {
  if (!value || typeof value !== "string") return null;
  let trimmed = value.trim();
  while (trimmed.endsWith("/")) trimmed = trimmed.slice(0, -1);
  if (!trimmed) return null;

  if (/^https?:\/\//i.test(trimmed)) {
    try {
      const url = new URL(trimmed);
      if (url.pathname === "" || url.pathname === "/") {
        return `${trimmed}/api`;
      }
      return trimmed;
    } catch {
      return trimmed;
    }
  }

  return trimmed;
}

export const API = (() => {
  const runtimeUrl = typeof window !== "undefined" ? window.__ZPAYROLL_CONFIG__?.apiUrl : null;
  const envUrl = import.meta.env.VITE_API_URL;
  const raw = runtimeUrl ?? envUrl;
  const normalized = normalizeUrl(raw);
  if (normalized) return normalized;
  return "/api";
})();
