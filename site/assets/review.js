/* 1997 Labs AI website review chat. Set REVIEW_API (and TURNSTILE_SITE_KEY) after the worker is deployed;
   until then the chat stays hidden. */
(() => {
  const REVIEW_API = '';          // e.g. https://1997labs-review.<your-subdomain>.workers.dev
  const TURNSTILE_SITE_KEY = '';  // Cloudflare Turnstile site key
  const cfg = window.REVIEW_CONFIG || { api: REVIEW_API, turnstile: TURNSTILE_SITE_KEY };
  if (!cfg.api) return;
  const WA = (typeof WHATSAPP_NUMBER !== 'undefined' ? WHATSAPP_NUMBER : '').replace(/\D/g, '');

  const T = {
    en: {
      launch: 'Free AI website review', short: 'AI review', title: '1997 Labs AI', sub: 'Website review · about 30 seconds', toggle: 'ع', close: 'Close',
      hi: "Hi! I'll review your website in about 30 seconds and give you an estimated price to improve it. What's your website address?",
      urlPh: 'yourwebsite.ae', next: 'Next', noSite: "I don't have a website yet",
      noSiteMsg: "No problem. I'll suggest what to build and estimate the price.",
      business: 'What kind of business is it?', goal: 'What matters most right now?',
      biz: { restaurant: 'Restaurant & café', clinic: 'Clinic & salon', retail: 'Retail & e-commerce', realestate: 'Real estate', services: 'Services & consulting', other: 'Other' },
      goals: { customers: 'More customers', booking: 'Online booking', sales: 'Sell online', automation: 'Less manual work', design: 'Better design' },
      human: 'Last step: a quick check that you are human.', start: 'Review my website', startNoSite: 'Get my estimate',
      steps: ['Opening your website', 'Checking phones and speed', 'Checking Google basics', 'Preparing your estimate'], stepsNoSite: ['Matching your goals', 'Choosing the right services', 'Preparing your estimate'],
      score: 'Website score', cats: { mobile: 'Mobile', google: 'Google', speed: 'Speed', trust: 'Trust', customers: 'Contact' },
      found: 'What we found', rec: 'Recommended plan & estimate', total: 'Estimated total', weeks: (a, b) => `Delivery: ${a}–${b} weeks`,
      monthly: (n) => `Optional hosting & maintenance: ${n} AED/month`, extras: 'Optional extras (not in the total)', note: 'Estimate in AED. Your final price is confirmed after a free call.',
      unreachable: "I couldn't open that website, so this estimate is based on your answers.", limited: 'Your site is built with JavaScript, so some checks were limited.',
      recHidden: 'Recommended plan', quoteHidden: 'Your personal quote: our team checks every quote and sends it to you directly. Where should we send it?', getQuote: 'Send me my quote', quoteSent: 'Thanks! We will send your quote to you directly.',
      waHidden: (r) => `Hi 1997 Labs, I used your AI website review.\nWebsite: ${r.site || 'none yet'}\nScore: ${r.scores ? r.scores.overall + '/100' : '-'}\nRecommended: ${r.quote.items.map((i) => i.label).join(', ')}\nPlease send me a quote.`,
      wa: 'Send to WhatsApp', call: 'Get a call back', name: 'Your name', contact: 'Phone or email', send: 'Send', sent: "Thanks! We'll contact you within one working day.",
      errUrl: 'That address does not look right. Try something like yourwebsite.ae', errLimit: 'You have reached today\'s review limit. Message us on WhatsApp and we will review it for you.',
      errBot: 'The human check failed. Please try again.', err: 'Something went wrong. Please try again, or message us on WhatsApp.', again: 'Review another website',
      waText: (r) => `Hi 1997 Labs, I used your AI website review.\nWebsite: ${r.site || 'none yet'}\nScore: ${r.scores ? r.scores.overall + '/100' : '-'}\nEstimate: ${fmt(r.quote.total.from)}–${fmt(r.quote.total.to)} AED\nPlan: ${r.quote.items.map((i) => i.label).join(', ')}`,
    },
    ar: {
      launch: 'مراجعة مجانية لموقعك بالذكاء الاصطناعي', short: 'مراجعة ذكية', title: 'مساعد 1997 Labs', sub: 'مراجعة الموقع · نحو 30 ثانية', toggle: 'EN', close: 'إغلاق',
      hi: 'مرحبًا! سأراجع موقعك خلال 30 ثانية تقريبًا وأعطيك سعرًا تقديريًا لتحسينه. ما عنوان موقعك؟',
      urlPh: 'yourwebsite.ae', next: 'التالي', noSite: 'ليس لدي موقع بعد', noSiteMsg: 'لا مشكلة. سأقترح ما يجب بناؤه وأقدّر التكلفة.',
      business: 'ما نوع نشاطك التجاري؟', goal: 'ما الأهم بالنسبة لك الآن؟',
      biz: { restaurant: 'مطعم ومقهى', clinic: 'عيادة وصالون', retail: 'تجزئة ومتجر إلكتروني', realestate: 'عقارات', services: 'خدمات واستشارات', other: 'أخرى' },
      goals: { customers: 'عملاء أكثر', booking: 'حجز أونلاين', sales: 'البيع أونلاين', automation: 'عمل يدوي أقل', design: 'تصميم أفضل' },
      human: 'الخطوة الأخيرة: تحقق سريع من أنك لست روبوتًا.', start: 'راجع موقعي', startNoSite: 'احصل على التقدير',
      steps: ['فتح موقعك', 'فحص الجوال والسرعة', 'فحص أساسيات جوجل', 'تجهيز التقدير'], stepsNoSite: ['مطابقة أهدافك', 'اختيار الخدمات المناسبة', 'تجهيز التقدير'],
      score: 'تقييم الموقع', cats: { mobile: 'الجوال', google: 'جوجل', speed: 'السرعة', trust: 'الثقة', customers: 'التواصل' },
      found: 'ما وجدناه', rec: 'الخطة المقترحة والتقدير', total: 'الإجمالي التقديري', weeks: (a, b) => `مدة التنفيذ: ${a}–${b} أسابيع`,
      monthly: (n) => `استضافة وصيانة اختيارية: ${n} درهم شهريًا`, extras: 'إضافات اختيارية (غير محسوبة في الإجمالي)', note: 'تقدير بالدرهم الإماراتي. يتم تأكيد السعر النهائي بعد مكالمة مجانية.',
      unreachable: 'لم أتمكن من فتح هذا الموقع، لذلك بُني التقدير على إجاباتك.', limited: 'موقعك مبني بجافاسكربت، لذلك كانت بعض الفحوصات محدودة.',
      recHidden: 'الخطة المقترحة', quoteHidden: 'عرض السعر الخاص بك: يراجع فريقنا كل عرض ويرسله إليك مباشرة. إلى أين نرسله؟', getQuote: 'أرسلوا لي عرض السعر', quoteSent: 'شكرًا! سنرسل لك عرض السعر مباشرة.',
      waHidden: (r) => `مرحبًا 1997 Labs، استخدمت مراجعة الموقع الذكية.\nالموقع: ${r.site || 'لا يوجد بعد'}\nالتقييم: ${r.scores ? r.scores.overall + '/100' : '-'}\nالخطة المقترحة: ${r.quote.items.map((i) => i.label).join('، ')}\nأرجو إرسال عرض السعر.`,
      wa: 'أرسل عبر واتساب', call: 'اطلب اتصالًا', name: 'اسمك', contact: 'الهاتف أو البريد', send: 'إرسال', sent: 'شكرًا! سنتواصل معك خلال يوم عمل واحد.',
      errUrl: 'هذا العنوان غير صحيح. جرّب مثل yourwebsite.ae', errLimit: 'وصلت إلى حد المراجعات اليوم. راسلنا على واتساب وسنراجعه لك.',
      errBot: 'فشل التحقق. حاول مرة أخرى.', err: 'حدث خطأ. حاول مرة أخرى أو راسلنا على واتساب.', again: 'راجع موقعًا آخر',
      waText: (r) => `مرحبًا 1997 Labs، استخدمت مراجعة الموقع الذكية.\nالموقع: ${r.site || 'لا يوجد بعد'}\nالتقييم: ${r.scores ? r.scores.overall + '/100' : '-'}\nالتقدير: ${fmt(r.quote.total.from)}–${fmt(r.quote.total.to)} درهم\nالخطة: ${r.quote.items.map((i) => i.label).join('، ')}`,
    },
  };
  const fmt = (n) => Number(n).toLocaleString('en-US');
  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
  const ltr = (e) => { e.dir = 'ltr'; return e; };
  const SPARK = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3.5l1.9 4.6 4.6 1.9-4.6 1.9L12 16.5l-1.9-4.6L5.5 10l4.6-1.9z"/></svg>';

  let lang = (document.documentElement.lang || navigator.language || 'en').startsWith('ar') ? 'ar' : 'en';
  let state = {};
  const launch = el('button', 'rv-launch'); launch.type = 'button';
  const panel = el('div', 'rv-panel'); panel.hidden = true; panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-modal', 'false');
  document.body.append(launch, panel);

  function render() {
    const t = T[lang];
    launch.innerHTML = `${SPARK}<span class="rv-full">${t.launch}</span><span class="rv-short">${t.short}</span>`;
    panel.dir = lang === 'ar' ? 'rtl' : 'ltr'; panel.lang = lang; panel.setAttribute('aria-label', t.launch);
    panel.innerHTML = `<div class="rv-head"><span class="rv-orb" aria-hidden="true"></span><div><b>${t.title}</b><small>${t.sub}</small></div>
      <div class="rv-head-actions"><button type="button" class="rv-lang" aria-label="${lang === 'ar' ? 'English' : 'العربية'}">${t.toggle}</button><button type="button" class="rv-close" aria-label="${t.close}">×</button></div></div>
      <div class="rv-body" aria-live="polite"></div><div class="rv-foot"></div>`;
    panel.querySelector('.rv-lang').onclick = () => { lang = lang === 'ar' ? 'en' : 'ar'; render(); start(); };
    panel.querySelector('.rv-close').onclick = close;
  }
  const body = () => panel.querySelector('.rv-body');
  const foot = () => panel.querySelector('.rv-foot');
  const say = (text, who = 'bot') => { const m = el('div', `rv-msg rv-${who}`, text); body().append(m); body().scrollTop = body().scrollHeight; return m; };
  const chips = (options, onPick) => { const box = el('div', 'rv-chips'); Object.entries(options).forEach(([k, v]) => { const b = el('button', '', v); b.type = 'button'; b.onclick = () => { say(v, 'user'); onPick(k); }; box.append(b); }); foot().replaceChildren(box); };

  function start() {
    const t = T[lang]; state = {}; body().replaceChildren(); say(t.hi);
    const row = el('div', 'rv-row'); const input = el('input'); input.type = 'url'; input.id = 'rv-url'; input.placeholder = t.urlPh; input.setAttribute('aria-label', t.urlPh);
    const next = el('button', 'rv-btn primary', t.next); next.type = 'button'; row.append(input, next);
    const noSite = el('button', 'rv-link', t.noSite); noSite.type = 'button';
    const go = () => { const v = input.value.trim(); if (!/^(https?:\/\/)?[^\s/]+\.[^\s]{2,}/i.test(v)) { say(t.errUrl); return; } state.url = v; say(v, 'user'); askBusiness(); };
    next.onclick = go; input.onkeydown = (e) => { if (e.key === 'Enter') go(); };
    noSite.onclick = () => { state.noWebsite = true; say(t.noSite, 'user'); say(t.noSiteMsg); askBusiness(); };
    foot().replaceChildren(row, noSite); input.focus();
  }
  function askBusiness() { const t = T[lang]; say(t.business); chips(t.biz, (k) => { state.business = k; askGoal(); }); }
  function askGoal() { const t = T[lang]; say(t.goal); chips(t.goals, (k) => { state.goal = k; confirm(); }); }
  function confirm() {
    const t = T[lang]; const btn = el('button', 'rv-btn primary', state.noWebsite ? t.startNoSite : t.start); btn.type = 'button';
    btn.onclick = () => submit(); foot().replaceChildren(btn);
    if (cfg.turnstile && window.turnstile) {
      say(t.human); const box = el('div'); foot().prepend(box); btn.disabled = true;
      window.turnstile.render(box, { sitekey: cfg.turnstile, callback: (tok) => { state.token = tok; btn.disabled = false; } });
    }
  }
  async function submit() {
    const t = T[lang]; foot().replaceChildren();
    const labels = state.noWebsite ? t.stepsNoSite : t.steps; const box = el('div', 'rv-msg rv-bot rv-steps');
    const items = labels.map((l) => el('div', '', '○ ' + l)); box.append(...items); body().append(box);
    let i = 0; const tick = setInterval(() => { if (i < items.length) { if (i) { items[i - 1].className = 'done'; items[i - 1].textContent = '✓ ' + labels[i - 1]; } items[i].className = 'on'; i++; } }, 1400);
    try {
      const res = await fetch(cfg.api.replace(/\/$/, '') + '/api/review', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ...state, lang }) });
      const data = await res.json(); clearInterval(tick); box.remove();
      if (!res.ok) { say(res.status === 429 ? t.errLimit : res.status === 403 ? t.errBot : data.error === 'invalid_url' ? t.errUrl : t.err); return again(); }
      showResult(data);
    } catch { clearInterval(tick); box.remove(); say(t.err); again(); }
  }
  function showResult(r) {
    const t = T[lang]; const card = el('div', 'rv-msg rv-result');
    if (r.scores) {
      const s = el('div', 'rv-score'); const ring = el('div', 'rv-ring'); ring.style.setProperty('--v', r.scores.overall); ring.append(el('span', '', String(r.scores.overall)));
      const bars = el('div', 'rv-bars'); bars.append(el('span', 'rv-h', t.score));
      Object.entries(t.cats).forEach(([k, label]) => { const b = el('div', 'rv-bar'); const bar = el('i'); bar.style.setProperty('--w', r.scores[k] + '%'); b.append(el('span', '', label), bar, el('span', '', String(r.scores[k]))); bars.append(b); });
      s.append(ring, bars); card.append(s);
    }
    if (!r.reachable && r.site) card.append(el('p', 'rv-note', t.unreachable));
    if (r.limitedCheck) card.append(el('p', 'rv-note', t.limited));
    if (r.summary) card.append(el('p', '', r.summary));
    if (r.issues && r.issues.length) { card.append(el('span', 'rv-h', t.found)); const ul = el('ul', 'rv-issues'); r.issues.forEach((i) => { const li = el('li'); li.append(el('b', '', i.title), document.createTextNode(i.detail)); ul.append(li); }); card.append(ul); }
    const hidden = !!r.quote.pricesHidden;
    card.append(el('span', 'rv-h', hidden ? t.recHidden : t.rec)); const q = el('div', 'rv-quote');
    if (hidden) {
      [...r.quote.items, ...(r.quote.optional || [])].forEach((i) => { const row = el('div', 'rv-item'); row.append(el('span', '', i.label)); if (i.why) row.append(el('small', '', i.why)); q.append(row); });
      if (r.quote.weeks) q.append(el('span', 'rv-note', t.weeks(r.quote.weeks[0], r.quote.weeks[1])));
      card.append(q);
      const actions = el('div', 'rv-actions');
      if (WA) { const a = el('a', 'rv-btn', t.wa); a.href = `https://wa.me/${WA}?text=${encodeURIComponent(t.waHidden(r))}`; a.target = '_blank'; a.rel = 'noopener'; actions.append(a); }
      card.append(actions); body().append(card); body().scrollTop = card.offsetTop - 12; state.result = r;
      say(t.quoteHidden); askCall(r, true); return;
    }
    r.quote.items.forEach((i) => { const row = el('div', 'rv-item'); row.append(el('span', '', i.label), ltr(el('strong', '', `${fmt(i.from)}–${fmt(i.to)} AED`))); if (i.why) row.append(el('small', '', i.why)); q.append(row); });
    const total = el('div', 'rv-total'); total.append(el('span', '', t.total), ltr(el('strong', '', `${fmt(r.quote.total.from)}–${fmt(r.quote.total.to)} AED`))); q.append(total);
    if (r.quote.weeks) q.append(el('span', 'rv-note', t.weeks(r.quote.weeks[0], r.quote.weeks[1])));
    if (r.quote.optional && r.quote.optional.length) { q.append(el('span', 'rv-h', t.extras)); r.quote.optional.forEach((i) => { const row = el('div', 'rv-item'); row.append(el('span', '', i.label), ltr(el('strong', '', `${fmt(i.from)}–${fmt(i.to)} AED`))); if (i.why) row.append(el('small', '', i.why)); q.append(row); }); }
    q.append(el('span', 'rv-note', t.monthly(fmt(r.quote.monthly))), el('span', 'rv-note', t.note)); card.append(q);
    const actions = el('div', 'rv-actions');
    if (WA) { const a = el('a', 'rv-btn primary', t.wa); a.href = `https://wa.me/${WA}?text=${encodeURIComponent(t.waText(r))}`; a.target = '_blank'; a.rel = 'noopener'; actions.append(a); }
    const callBtn = el('button', 'rv-btn', t.call); callBtn.type = 'button'; callBtn.onclick = () => askCall(r); actions.append(callBtn);
    card.append(actions); body().append(card); body().scrollTop = card.offsetTop - 12; state.result = r; again();
  }
  function askCall(r, quoteMode) {
    const t = T[lang]; const name = el('input'); name.id = 'rv-name'; name.placeholder = t.name; name.setAttribute('aria-label', t.name);
    const contact = el('input'); contact.id = 'rv-contact'; contact.placeholder = t.contact; contact.setAttribute('aria-label', t.contact);
    const send = el('button', 'rv-btn primary', quoteMode ? t.getQuote : t.send); send.type = 'button';
    send.onclick = async () => {
      if (!name.value.trim() || !contact.value.trim()) return;
      send.disabled = true;
      try {
        const res = await fetch(cfg.api.replace(/\/$/, '') + '/api/lead', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ reviewId: r.reviewId, name: name.value, contact: contact.value }) });
        say(res.ok ? (quoteMode ? t.quoteSent : t.sent) : t.err); foot().replaceChildren(); again();
      } catch { say(t.err); send.disabled = false; }
    };
    const row = el('div', 'rv-row'); row.append(contact, send); foot().replaceChildren(name, row); name.focus();
  }
  function again() { const t = T[lang]; const b = el('button', 'rv-link', t.again); b.type = 'button'; b.onclick = start; if (!foot().querySelector('input')) foot().replaceChildren(b); }

  function open() { panel.hidden = false; launch.setAttribute('aria-expanded', 'true'); if (!body().children.length) start(); if (cfg.turnstile && !window.turnstile) { const s = el('script'); s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js'; s.async = true; document.head.append(s); } }
  function close() { panel.hidden = true; launch.setAttribute('aria-expanded', 'false'); launch.focus(); }
  render();
  launch.onclick = () => (panel.hidden ? open() : close());
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !panel.hidden) close(); });
  document.querySelectorAll('[data-open-review]').forEach((a) => a.addEventListener('click', (e) => { e.preventDefault(); open(); }));
})();
