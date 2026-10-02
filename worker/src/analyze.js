// Deterministic checks on a page's HTML. Pure functions so they can be unit-tested.
const count = (re, s) => (s.match(re) || []).length;
const attr = (tag, name) => { const m = tag.match(new RegExp(`${name}\\s*=\\s*["']([^"']*)["']`, "i")); return m ? m[1] : ""; };
const strip = (s) => s.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<[^>]+>/gi, " ").replace(/&[a-z#0-9]+;/gi, " ").replace(/\s+/g, " ").trim();

export function analyzeHtml(html, { finalUrl = "", responseMs = 0 } = {}) {
  const head = (html.match(/<head[\s\S]*?<\/head>/i) || [""])[0];
  const title = strip((html.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [, ""])[1]);
  const metaTags = html.match(/<meta[^>]+>/gi) || [];
  const meta = (key) => { const t = metaTags.find((m) => new RegExp(`(name|property)\\s*=\\s*["']${key}["']`, "i").test(m)); return t ? attr(t, "content") : ""; };
  const imgs = html.match(/<img\b[^>]*>/gi) || [];
  const text = strip(html);
  const lower = html.toLowerCase();
  const c = {
    https: finalUrl.startsWith("https://"),
    responseMs,
    htmlKB: Math.round(html.length / 1024),
    viewport: metaTags.some((m) => /name\s*=\s*["']viewport["']/i.test(m)),
    title, titleOk: title.length >= 15 && title.length <= 65,
    description: meta("description"), descriptionOk: meta("description").length >= 50 && meta("description").length <= 170,
    h1: count(/<h1\b/gi, html),
    images: imgs.length, imagesMissingAlt: imgs.filter((t) => !/\balt\s*=\s*["'][^"']+["']/i.test(t)).length,
    scripts: count(/<script\b[^>]*\bsrc=/gi, html),
    openGraph: !!meta("og:title") && !!meta("og:image"),
    structuredData: /application\/ld\+json/i.test(html),
    favicon: /<link[^>]+rel\s*=\s*["'][^"']*icon/i.test(head),
    arabic: /[؀-ۿ]{3,}/.test(text) || /hreflang\s*=\s*["']ar/i.test(html),
    whatsapp: /wa\.me\/|api\.whatsapp\.com|whatsapp:\/\//i.test(lower),
    phone: /href\s*=\s*["']tel:/i.test(html),
    forms: count(/<form\b/gi, html),
    booking: /\b(book now|booking|appointment|reserve|reservation)\b|احجز|حجز/i.test(text),
    store: /add to cart|checkout|shopping cart|\/cart\b|woocommerce|shopify|سلة/i.test(lower),
    chat: /intercom|tawk\.to|crisp\.chat|livechat|zendesk|drift\.com|chatbot/i.test(lower),
    textChars: text.length,
  };
  c.jsShell = c.textChars < 250 && c.scripts > 0; // content rendered by JavaScript: text checks are limited
  return c;
}

const pct = (parts) => Math.round((parts.filter(Boolean).length / parts.length) * 100);

export function score(c) {
  const s = {
    mobile: pct([c.viewport, c.htmlKB < 400, c.scripts <= 25]),
    google: pct([c.titleOk, c.descriptionOk, c.h1 === 1, c.images === 0 || c.imagesMissingAlt / c.images < 0.3, c.openGraph, c.structuredData]),
    speed: pct([c.responseMs < 800, c.responseMs < 1800, c.htmlKB < 200, c.scripts <= 15]),
    trust: pct([c.https, c.favicon, c.phone || c.whatsapp, c.titleOk]),
    customers: pct([c.whatsapp, c.phone, c.forms > 0, c.booking || c.store, c.chat]),
  };
  s.overall = Math.round((s.mobile + s.google + s.speed + s.trust + s.customers) / 5);
  return s;
}

export const BUSINESSES = ["restaurant", "clinic", "retail", "realestate", "services", "other"];
export const GOALS = ["customers", "booking", "sales", "automation", "design"];

/** Pick services from the owner's list with fixed rules, so every quote is explainable. */
export function recommend({ checks, scores, business, goal, hasWebsite }) {
  const r = [];
  if (!hasWebsite) {
    r.push(goal === "sales" || business === "retail" ? "store" : "website");
  } else if (!checks.viewport || scores.overall < 55 || goal === "design") {
    r.push("redesign");
  }
  if ((goal === "sales" || business === "retail") && !(checks && checks.store) && !r.includes("store")) r.push("store");
  if ((goal === "booking" || ["clinic", "restaurant"].includes(business)) && !(checks && checks.booking)) r.push("booking");
  if (goal === "automation") r.push("crm");
  if (!(checks && (checks.chat || checks.whatsapp)) || goal === "automation") r.push("chatbot");
  if (hasWebsite && scores.google < 60) r.push("seo");
  if (!(checks && checks.arabic)) r.push("arabic");
  return [...new Set(r)].slice(0, 5); // first 2 are the core plan, the rest are optional extras
}

/** 0..1 complexity used to place each price inside the owner's range. */
export function complexity({ checks, business, hasWebsite }) {
  let c = 0.15; // quotes start near the owner's entry price
  if (business === "retail" || business === "realestate") c += 0.15;
  if (hasWebsite && checks && checks.htmlKB > 150) c += 0.1;
  if (hasWebsite && checks && (checks.store || checks.booking)) c += 0.1;
  return Math.min(0.85, c);
}
