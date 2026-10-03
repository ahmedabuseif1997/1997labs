// 1997 Labs website-review API (Cloudflare Worker).
import { normaliseUrl } from "./safety.js";
import { analyzeHtml, score, recommend, complexity, BUSINESSES, GOALS } from "./analyze.js";
import { buildQuote } from "./pricing.js";
import { writeReview, fallbackReview, serviceLabel } from "./ai.js";

const MAX_HTML = 1_500_000;

function cors(req, env) {
  const origin = req.headers.get("origin") || "";
  const allowed = (env.ALLOWED_ORIGINS || "https://1997labs.com,https://www.1997labs.com").split(",").map((s) => s.trim());
  return allowed.includes(origin) ? { "access-control-allow-origin": origin, vary: "origin" } : null;
}
const json = (data, status, headers) => new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json", ...headers } });

async function verifyTurnstile(env, token, ip) {
  if (!env.TURNSTILE_SECRET) return env.ALLOW_NO_TURNSTILE === "true";
  if (!token) return false;
  const form = new FormData();
  form.append("secret", env.TURNSTILE_SECRET); form.append("response", token); if (ip) form.append("remoteip", ip);
  const r = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", { method: "POST", body: form });
  return !!(await r.json()).success;
}

/** Per-visitor and site-wide daily limits, so nobody can run up the AI bill. */
async function withinLimits(env, ip, kind = "review") {
  if (!env.LIMITS) return true;
  const day = new Date().toISOString().slice(0, 10);
  const keys = kind === "lead"
    ? [[`lead:${day}:${ip}`, Number(env.LEADS_PER_IP_DAILY || 3)], [`leads:${day}`, Number(env.LEADS_GLOBAL_DAILY || 100)]]
    : [[`ip:${day}:${ip}`, Number(env.PER_IP_DAILY || 5)], [`all:${day}`, Number(env.GLOBAL_DAILY || 300)]];
  const counts = await Promise.all(keys.map(([k]) => env.LIMITS.get(k)));
  if (keys.some(([, max], i) => Number(counts[i] || 0) >= max)) return false;
  await Promise.all(keys.map(([k], i) => env.LIMITS.put(k, String(Number(counts[i] || 0) + 1), { expirationTtl: 172800 })));
  return true;
}

/** Fetch the visitor's page: validates every redirect hop, 8 s timeout, 1.5 MB cap, HTML only. */
export async function fetchSite(url) {
  const started = Date.now();
  let current = url;
  for (let hop = 0; hop < 4; hop++) {
    const res = await fetch(current, { redirect: "manual", headers: { "user-agent": "1997LabsReviewBot/1.0 (+https://1997labs.com)", accept: "text/html" }, signal: AbortSignal.timeout(8000) });
    if (res.status >= 300 && res.status < 400 && res.headers.get("location")) {
      const next = normaliseUrl(new URL(res.headers.get("location"), current).toString());
      if (!next.ok) throw new Error("bad_redirect");
      current = next.url; continue;
    }
    if (!res.ok) throw new Error(`status_${res.status}`);
    if (!/text\/html|application\/xhtml/i.test(res.headers.get("content-type") || "")) throw new Error("not_html");
    const reader = res.body.getReader(); const chunks = []; let size = 0;
    while (true) { const { done, value } = await reader.read(); if (done) break; size += value.length; if (size > MAX_HTML) { await reader.cancel(); break; } chunks.push(value); }
    const html = new TextDecoder().decode(chunks.reduce((a, b) => { const m = new Uint8Array(a.length + b.length); m.set(a); m.set(b, a.length); return m; }, new Uint8Array()));
    return { html, finalUrl: current, responseMs: Date.now() - started };
  }
  throw new Error("too_many_redirects");
}

export async function review(body, env) {
  const lang = body.lang === "ar" ? "ar" : "en";
  const business = BUSINESSES.includes(body.business) ? body.business : "other";
  const goal = GOALS.includes(body.goal) ? body.goal : "customers";
  const hasWebsite = !body.noWebsite;
  let checks = null, scores = null, site = null, reachable = true;
  if (hasWebsite) {
    const u = normaliseUrl(body.url);
    if (!u.ok) return { status: 400, data: { error: "invalid_url" } };
    site = u.host;
    try { const page = await fetchSite(u.url); checks = analyzeHtml(page.html, page); scores = score(checks); }
    catch { reachable = false; }
  }
  const recommended = recommend({ checks, scores: scores || { overall: 0, google: 0 }, business, goal, hasWebsite: hasWebsite && reachable });
  const quote = buildQuote(recommended, complexity({ checks, business, hasWebsite }));
  const facts = { site, reachable, business, goal, scores, checks: checks && { ...checks, title: checks.title.slice(0, 120), description: checks.description.slice(0, 160) }, recommended };
  let text;
  try { text = env.MINIMAX_API_KEY ? await writeReview(env, facts, lang) : fallbackReview(facts, lang); }
  catch { text = fallbackReview(facts, lang); }
  const label = (i) => ({ ...i, label: serviceLabel(i.id, lang), why: text.reasons[i.id] || "" });
  quote.items = quote.items.map(label); quote.optional = quote.optional.map(label);
  return { status: 200, data: { lang, site, reachable, business, goal, scores, summary: text.summary, issues: text.issues, quote, limitedCheck: !!(checks && checks.jsShell) } };
}

/** Prices stay internal until the owner turns SHOW_PRICES on: visitors see the plan, never the amounts. */
export function publicView(data, showPrices) {
  if (showPrices) return data;
  const strip = (i) => ({ id: i.id, label: i.label, why: i.why, weeks: i.weeks });
  return { ...data, quote: { items: data.quote.items.map(strip), optional: data.quote.optional.map(strip), weeks: data.quote.weeks, pricesHidden: true } };
}

/** A visitor asks for their quote: the full priced quote is emailed to the owner to approve, never to the visitor. */
export async function sendLead(env, body) {
  const clean = (v, n) => String(v || "").replace(/[\r\n]+/g, " ").trim().slice(0, n);
  const name = clean(body.name, 80), contact = clean(body.contact, 120), id = clean(body.reviewId, 64);
  if (!name || !contact) return { status: 400, data: { error: "missing_contact" } };
  if (!id || !env.LIMITS) return { status: 400, data: { error: "missing_review" } };
  const stored = await env.LIMITS.get(`review:${id}`);
  if (!stored) return { status: 404, data: { error: "review_expired" } };
  if (!env.RESEND_API_KEY) return { status: 503, data: { error: "email_not_configured" } };
  const r = JSON.parse(stored), q = r.quote, aed = (n) => Number(n).toLocaleString("en-US");
  const line = (i) => `- ${i.label}: ${aed(i.from)}–${aed(i.to)} AED${i.weeks ? ` (${i.weeks[0]}–${i.weeks[1]} weeks)` : ""}`;
  const text = [
    "QUOTE TO APPROVE. It has NOT been sent to the customer. Reply to them after you approve it.", "",
    `Name: ${name}`, `Contact: ${contact}`, `Language: ${r.lang}`, `Website: ${r.site || "none yet"}`, `Business: ${r.business}`, `Goal: ${r.goal}`,
    `Score: ${r.scores ? r.scores.overall + "/100" : "-"}`, "", `Review: ${r.summary}`, "",
    "Plan (AED, excl. 5% VAT):", ...q.items.map(line), `Total: ${aed(q.total.from)}–${aed(q.total.to)} AED excl. 5% VAT`,
    ...(q.optional.length ? ["", "Optional extras (not in the total):", ...q.optional.map(line)] : []),
    "", `Hosting & maintenance: ${aed(q.monthly)} AED/month excl. 5% VAT (${q.monthlyPlan})`, `Delivery: ${q.weeks ? q.weeks[0] + "–" + q.weeks[1] + " weeks" : "-"}`,
  ].join("\n");
  const replyTo = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact) ? { reply_to: contact } : {};
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST", headers: { authorization: `Bearer ${env.RESEND_API_KEY}`, "content-type": "application/json" },
    body: JSON.stringify({ from: env.LEAD_FROM || "1997 Labs Reviews <reviews@1997labs.com>", to: [env.LEAD_TO || "info@1997labs.com"], subject: `Quote to approve: ${name} (${r.site || "new website"})`, text, ...replyTo }),
  });
  if (!res.ok) return { status: 502, data: { error: "email_failed" } };
  await env.LIMITS.put(`lead:${id}`, JSON.stringify({ name, contact, at: new Date().toISOString() }), { expirationTtl: 2592000 });
  return { status: 200, data: { ok: true } };
}

export default {
  async fetch(req, env) {
    const headers = cors(req, env);
    if (!headers) return json({ error: "origin_not_allowed" }, 403, {});
    if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: { ...headers, "access-control-allow-methods": "POST, OPTIONS", "access-control-allow-headers": "content-type", "access-control-max-age": "86400" } });
    const path = new URL(req.url).pathname;
    if (req.method !== "POST" || !["/api/review", "/api/lead"].includes(path)) return json({ error: "not_found" }, 404, headers);
    if (Number(req.headers.get("content-length") || 0) > 8000) return json({ error: "too_large" }, 413, headers);
    let body; try { body = await req.json(); } catch { return json({ error: "bad_json" }, 400, headers); }
    const ip = req.headers.get("cf-connecting-ip") || "unknown";
    if (path === "/api/lead") {
      if (!(await withinLimits(env, ip, "lead"))) return json({ error: "daily_limit" }, 429, headers);
      const r = await sendLead(env, body); return json(r.data, r.status, headers);
    }
    if (!(await verifyTurnstile(env, body.token, ip))) return json({ error: "bot_check_failed" }, 403, headers);
    if (!(await withinLimits(env, ip))) return json({ error: "daily_limit" }, 429, headers);
    const r = await review(body, env);
    if (r.status === 200 && env.LIMITS) {
      r.data.reviewId = crypto.randomUUID(); // the full priced quote is kept server-side for 7 days
      await env.LIMITS.put(`review:${r.data.reviewId}`, JSON.stringify(r.data), { expirationTtl: 604800 });
    }
    return json(r.status === 200 ? publicView(r.data, env.SHOW_PRICES === "true") : r.data, r.status, headers);
  },
};
