# 1997 Labs site — notes for Claude

Read this before working here; it replaces re-reading the whole page.

- Site lives in `site/`. One page (`index.html`, ~50 KB, inline CSS and JS), plus `privacy.html`, `404.html`, `robots.txt`, `sitemap.xml`, `assets/`.
- Brand rules and what to preserve: `CLAUDE-HANDOFF.md`. Positioning and palette: `1997-LABS-BRAND-PROFILE.md`.
- Copy is in the HTML. Never add a script that rewrites page text after load.
- Accent colour is `var(--accent)` (`#B8FF3D`). Do not reintroduce red (`#FF3B30`).
- Keep the "AI & Software Company" descriptor next to the logo and in the title and description.
- Example chart numbers must keep the "not client results" label.
- Tests: `python -m pytest` (assets, links, descriptor, colours, metadata, image budget under 400 KB each and 1 MB total).
- Inspect `index.html` with targeted `grep` or short scripts instead of reading it whole. Check visuals with one screenshot per change, not repeated loops.
- Domain: `https://1997labs.com/` (owner confirmed). Hosting: a new GitHub repository with GitHub Pages, created only after the owner approves the preview.
- WhatsApp number lives in one constant, `WHATSAPP_NUMBER`, near the end of `site/index.html`; the three WhatsApp buttons stay hidden if it is empty.
- "Our work" (`#work`) shows client projects as screenshots (`site/assets/work-*.webp`, 1200 px wide, WebP q80) with no links. The owner confirmed they built them; only state facts visible in the projects.
- The owner reviews screenshots before every deploy. Work on a branch and merge to `main` (which deploys) only after approval.
- Token protocol (owner's standing rule): send detailed test/build output to `logs/unit_<id>.log` (gitignored), never into chat; run only the checks for files you changed while iterating, and the full `python -m pytest` once per batch; report in the short STATUS / SUMMARY / UNITS / FILES / ISSUES / LOG format; no repo-wide searching when the file paths are known.
- Chatbot: `worker/` (Cloudflare Worker, MiniMax). Prices only from `worker/src/pricing.js` (owner's sheet; business websites capped 10% below the 8,000 AED market price). Quote = up to 2 core items + up to 3 optional extras (not in the total), priced near the owner's entry prices. UI: `site/assets/review.js`, hidden until `REVIEW_API` is set. Prices are NEVER shown to visitors while `SHOW_PRICES` (worker/wrangler.toml) is "false": the visitor sees the plan, and the full priced quote is emailed to the owner to approve and send themselves. All prices are in AED, excl. 5% VAT (quote email and the price view).
