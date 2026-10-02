// Validate a visitor-supplied URL before the worker fetches it.
const PRIVATE_V4 = [/^10\./, /^127\./, /^0\./, /^169\.254\./, /^192\.168\./, /^172\.(1[6-9]|2\d|3[01])\./, /^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./];

export function normaliseUrl(input) {
  let raw = String(input || "").trim();
  if (!raw) return { ok: false, error: "empty" };
  if (raw.length > 300) return { ok: false, error: "too_long" };
  if (!/^https?:\/\//i.test(raw)) raw = "https://" + raw;
  let u;
  try { u = new URL(raw); } catch { return { ok: false, error: "invalid" }; }
  const host = u.hostname.toLowerCase();
  if (!["http:", "https:"].includes(u.protocol)) return { ok: false, error: "protocol" };
  if (u.username || u.password) return { ok: false, error: "credentials" };
  if (u.port && !["80", "443"].includes(u.port)) return { ok: false, error: "port" };
  if (!host.includes(".") || host.endsWith(".local") || host.endsWith(".internal") || host === "localhost") return { ok: false, error: "host" };
  if (/^\d+\.\d+\.\d+\.\d+$/.test(host) && PRIVATE_V4.some((r) => r.test(host))) return { ok: false, error: "private" };
  if (host.startsWith("[")) return { ok: false, error: "ip6" };
  u.hash = "";
  return { ok: true, url: u.toString(), host };
}
