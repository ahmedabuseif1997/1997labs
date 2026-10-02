// Price sheet supplied by the owner (AED). Quotes never go below `min` and never above `max`.
// The owner's prices are treated as already including their margin (no cost data is known here).
export const SERVICES = {
  landing:  { en: "Landing page (1 page)", ar: "صفحة هبوط (صفحة واحدة)", min: 2000, max: 3500, weeks: [1, 2] },
  website:  { en: "Business website (up to 5 pages)", ar: "موقع شركة (حتى 5 صفحات)", min: 4500, max: 7500, weeks: [2, 3] },
  redesign: { en: "Website redesign", ar: "إعادة تصميم الموقع", min: 5000, max: 9000, weeks: [2, 4] },
  store:    { en: "Online store (e-commerce)", ar: "متجر إلكتروني", min: 8500, max: 18000, weeks: [4, 6] },
  arabic:   { en: "Arabic version (add-on)", ar: "نسخة عربية (إضافة)", min: 1500, max: 3000, weeks: null },
  seo:      { en: "Google / SEO setup", ar: "تهيئة جوجل وتحسين الظهور", min: 1500, max: 3000, weeks: null },
  chatbot:  { en: "AI chatbot / WhatsApp AI assistant", ar: "مساعد ذكي على واتساب والموقع", min: 5000, max: 12000, weeks: [2, 4] },
  booking:  { en: "Online booking system", ar: "نظام حجوزات أونلاين", min: 7500, max: 15000, weeks: [3, 5] },
  crm:      { en: "CRM setup", ar: "إعداد نظام إدارة العملاء (CRM)", min: 6000, max: 12000, weeks: [2, 4] },
  app:      { en: "Mobile app (iPhone + Android)", ar: "تطبيق جوال (آيفون وأندرويد)", min: 20000, max: 45000, weeks: [6, 12] },
  platform: { en: "Custom web platform / portal", ar: "منصة أو بوابة مخصصة", min: 18000, max: 45000, weeks: [6, 12] },
};
export const MAINTENANCE = { standard: 750, managed: 2000 }; // AED per month
// Owner: typical UAE market price for a professional business website is about 8,000 AED; be 10-15% cheaper.
export const MARKET = { website: 8000 };
export const MARKET_DISCOUNT = { min: 0.10, max: 0.15 };

const round250 = (n) => Math.round(n / 250) * 250;
const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));

/** Price one service at complexity c (0 = simplest, 1 = most complex) as a +/-8% band inside the owner's range. */
export function priceItem(id, c) {
  const s = SERVICES[id];
  if (!s) throw new Error(`unknown service ${id}`);
  let hi = s.max;
  if (MARKET[id]) hi = Math.min(hi, MARKET[id] * (1 - MARKET_DISCOUNT.min)); // stay below market
  const point = s.min + clamp(c, 0, 1) * (hi - s.min);
  const from = clamp(round250(point * 0.92), s.min, hi);
  const to = clamp(round250(point * 1.08), from, hi);
  return { id, from, to, weeks: s.weeks };
}

/** Build the quote from recommended service ids. Delivery for add-ons runs in parallel with the main build. */
export function buildQuote(ids, complexity, { custom = false, core = 2 } = {}) {
  const all = [...new Set(ids)].filter((id) => SERVICES[id]).map((id) => priceItem(id, complexity));
  const items = all.slice(0, core), optional = all.slice(core, core + 3); // optional extras are priced but not added to the total
  const total = items.reduce((t, i) => ({ from: t.from + i.from, to: t.to + i.to }), { from: 0, to: 0 });
  const weeks = items.filter((i) => i.weeks).reduce((w, i) => [Math.max(w[0], i.weeks[0]), Math.max(w[1], i.weeks[1])], [0, 0]);
  const managed = custom || items.some((i) => ["app", "platform", "crm", "booking", "store"].includes(i.id));
  return { currency: "AED", items, optional, total, weeks: weeks[1] ? weeks : null, monthly: managed ? MAINTENANCE.managed : MAINTENANCE.standard, monthlyPlan: managed ? "managed" : "standard" };
}
