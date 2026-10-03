import { test } from "node:test";
import assert from "node:assert/strict";
import { normaliseUrl } from "../src/safety.js";
import { priceItem, buildQuote, SERVICES, MARKET, MARKET_DISCOUNT } from "../src/pricing.js";
import { analyzeHtml, score, recommend } from "../src/analyze.js";
import worker, { review, publicView, sendLead } from "../src/index.js";

test("URL safety: accepts normal sites, blocks private and odd targets", () => {
  assert.equal(normaliseUrl("example.ae").url, "https://example.ae/");
  for (const bad of ["localhost", "http://127.0.0.1", "http://10.0.0.5", "http://192.168.1.1", "ftp://x.com", "http://x.com:8080", "http://user:pw@x.com", "http://[::1]/", "intranet"]) {
    assert.equal(normaliseUrl(bad).ok, false, bad);
  }
});

test("pricing: every quote stays inside the owner's range", () => {
  for (const id of Object.keys(SERVICES)) for (const c of [0, 0.3, 0.6, 1]) {
    const p = priceItem(id, c);
    assert.ok(p.from >= SERVICES[id].min && p.to <= SERVICES[id].max && p.from <= p.to, `${id} @${c}`);
  }
});

test("pricing: business websites stay 10-15% below the market price", () => {
  const cap = MARKET.website * (1 - MARKET_DISCOUNT.min);
  for (const c of [0, 0.5, 1]) assert.ok(priceItem("website", c).to <= cap);
});

test("quote: totals add up and add-ons do not extend delivery", () => {
  const q = buildQuote(["website", "arabic", "seo"], 0.4);
  assert.equal(q.total.from, q.items.reduce((s, i) => s + i.from, 0));
  assert.deepEqual(q.weeks, [2, 3]);
  assert.equal(q.monthly, 750);
  assert.equal(buildQuote(["store"], 0.4).monthly, 2000);
});

const SAMPLE = `<!doctype html><html><head><title>Best Dental Clinic in Dubai Marina</title>
<meta name="viewport" content="width=device-width"><meta name="description" content="Family dental clinic in Dubai Marina offering check-ups, whitening and implants.">
<link rel="icon" href="/f.png"></head><body><h1>Smile</h1><img src="a.jpg"><a href="https://wa.me/971500000000">WhatsApp</a>
<p>${"Welcome to our clinic. ".repeat(20)}</p></body></html>`;

test("analysis: reads the basics from HTML", () => {
  const c = analyzeHtml(SAMPLE, { finalUrl: "https://clinic.ae/", responseMs: 400 });
  assert.equal(c.viewport, true); assert.equal(c.titleOk, true); assert.equal(c.descriptionOk, true);
  assert.equal(c.h1, 1); assert.equal(c.imagesMissingAlt, 1); assert.equal(c.whatsapp, true); assert.equal(c.arabic, false);
  const s = score(c);
  assert.ok(s.overall > 0 && s.overall <= 100);
  const rec = recommend({ checks: c, scores: s, business: "clinic", goal: "booking", hasWebsite: true });
  assert.ok(rec.includes("booking") && rec.includes("arabic") && rec.length <= 5);
  const q = buildQuote(rec, 0.4);
  assert.ok(q.items.length <= 2 && q.optional.length <= 3);
  assert.equal(q.total.from, q.items.reduce((t, i) => t + i.from, 0), "optional extras are not in the total");
});

test("review: works end to end with the AI unavailable, and never trusts AI prices", async () => {
  const realFetch = globalThis.fetch;
  globalThis.fetch = async (url) => {
    if (String(url).includes("minimax")) return new Response("{\"choices\":[{\"message\":{\"content\":\"{\\\"summary\\\":\\\"Good start.\\\",\\\"issues\\\":[{\\\"title\\\":\\\"No booking\\\",\\\"detail\\\":\\\"Add it.\\\"}],\\\"reasons\\\":{\\\"booking\\\":\\\"Patients book themselves.\\\",\\\"fake\\\":\\\"x\\\"},\\\"price\\\":1}\"}}]}", { status: 200 });
    return new Response(SAMPLE, { status: 200, headers: { "content-type": "text/html" } });
  };
  try {
    const withAi = await review({ url: "clinic.ae", business: "clinic", goal: "booking", lang: "en" }, { MINIMAX_API_KEY: "k" });
    assert.equal(withAi.status, 200);
    assert.equal(withAi.data.summary, "Good start.");
    const booking = withAi.data.quote.items.find((i) => i.id === "booking");
    assert.equal(booking.why, "Patients book themselves.");
    assert.ok(booking.from >= 7500 && booking.to <= 15000);
    const noAi = await review({ noWebsite: true, business: "retail", goal: "sales", lang: "ar" }, {});
    assert.equal(noAi.data.quote.items[0].id, "store");
    assert.match(noAi.data.summary, /[؀-ۿ]/);
  } finally { globalThis.fetch = realFetch; }
});

test("handler: rejects other websites, and reviews need the bot check", async () => {
  const req = (origin, body) => new Request("https://w.dev/api/review", { method: "POST", headers: { origin, "content-type": "application/json" }, body: JSON.stringify(body) });
  assert.equal((await worker.fetch(req("https://evil.com", {}), {})).status, 403);
  assert.equal((await worker.fetch(req("https://1997labs.com", { url: "x.ae" }), {})).status, 403); // no Turnstile secret configured
});

const fakeKV = () => { const m = new Map(); return { get: async (k) => m.get(k) ?? null, put: async (k, v) => { m.set(k, v); }, m }; };

test("prices stay hidden from visitors until SHOW_PRICES is on", async () => {
  const realFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(SAMPLE, { status: 200, headers: { "content-type": "text/html" } });
  try {
    const kv = fakeKV(); const env = { ALLOW_NO_TURNSTILE: "true", LIMITS: kv };
    const req = new Request("https://w.dev/api/review", { method: "POST", headers: { origin: "https://1997labs.com", "content-type": "application/json" }, body: JSON.stringify({ url: "clinic.ae", business: "clinic", goal: "booking" }) });
    const res = await worker.fetch(req, env); const data = await res.json();
    const text = JSON.stringify(data);
    assert.equal(res.status, 200); assert.equal(data.quote.pricesHidden, true);
    assert.ok(!/"from"|"to"|"total"|"monthly"/.test(text), "no amounts in the public response");
    const stored = JSON.parse(kv.m.get(`review:${data.reviewId}`));
    assert.ok(stored.quote.total.from > 0, "full quote kept server-side");
    assert.ok(publicView(stored, true).quote.total, "SHOW_PRICES=true shows prices");
  } finally { globalThis.fetch = realFetch; }
});

test("quote requests email the full priced quote to the owner only", async () => {
  const kv = fakeKV(); const realFetch = globalThis.fetch; let sent;
  const r = (await (async () => { globalThis.fetch = async () => new Response(SAMPLE, { status: 200, headers: { "content-type": "text/html" } }); return review({ url: "clinic.ae", business: "clinic", goal: "booking" }, {}); })()).data;
  await kv.put("review:abc", JSON.stringify(r));
  globalThis.fetch = async (url, init) => { sent = { url: String(url), body: JSON.parse(init.body) }; return new Response("{}", { status: 200 }); };
  try {
    assert.equal((await sendLead({ LIMITS: kv, RESEND_API_KEY: "k" }, { name: "Sara", contact: "sara@example.com" })).status, 400);
    assert.equal((await sendLead({ LIMITS: kv, RESEND_API_KEY: "k" }, { name: "Sara", contact: "sara@example.com", reviewId: "nope" })).status, 404);
    const ok = await sendLead({ LIMITS: kv, RESEND_API_KEY: "k" }, { name: "Sara", contact: "sara@example.com", reviewId: "abc" });
    assert.equal(ok.status, 200);
    assert.match(sent.url, /api\.resend\.com/);
    assert.deepEqual(sent.body.to, ["info@1997labs.com"]);
    assert.match(sent.body.text, /QUOTE TO APPROVE/); assert.match(sent.body.text, /Total: [\d,]+–[\d,]+ AED excl\. 5% VAT/); assert.match(sent.body.text, /AED\/month excl\. 5% VAT/);
    assert.equal(sent.body.reply_to, "sara@example.com");
  } finally { globalThis.fetch = realFetch; }
});
