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

const resolvedApi = (() => {
  const runtimeUrl = typeof window !== "undefined" ? window.__ZPAYROLL_CONFIG__?.apiUrl : null;
  const envUrl = import.meta.env.VITE_API_URL;
  const raw = runtimeUrl ?? envUrl;
  const normalized = normalizeUrl(raw);
  return normalized || "/api";
})();

if (typeof window !== "undefined") {
  console.info("[ZPayroll] Resolved API base:", resolvedApi);
  if (resolvedApi === "/api") {
    console.warn("[ZPayroll] VITE_API_URL is not set or invalid. Falling back to /api.");
  }
}

export const API = resolvedApi;
