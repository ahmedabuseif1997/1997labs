# 1997 Labs — company website

Website for **1997 Labs**, an AI & software company in Dubai. Static HTML in `site/`, with no build step. `.github/workflows/pages.yml` runs the tests on every change and publishes `site/` to GitHub Pages when `main` changes.

## Preview locally

```bash
python -m http.server -d site 8002
python -m pytest                         # checks (pip install -r requirements-dev.txt)   # then open http://localhost:8002
```

## What changed from the delivered project (2 Oct 2026)

| Area | Change |
|---|---|
| Copy | The text that a script rewrote after page load is now written in the HTML; the rewrite script is gone. Visible text and the demo data were verified identical before and after. |
| Dead code | Removed the hidden profile, how-we-work and process sections, their 48 CSS selectors and a hidden "Profile" menu link. Page size 69 KB → 49 KB. |
| Images | Hero is a JPEG (314 KB) instead of a 1.9 MB PNG. Only the two images the page uses are included (the delivered `dist/` had 13 files, about 15 MB). |
| Colour | Replaced the remaining hard-coded red glows and chart gradient with the lime accent; merged three colour blocks into one. |
| Tech identity | "AI & Software Company" beside the logo and in the title, description and share cards; the hero sentence names AI agents, websites, apps and CRM; a visible row of five service icons; plain menu labels (Services, AI & Automation, Results). |
| Search & sharing | New title and description, 1200×630 share image, large-image Twitter card, richer schema.org data, sitemap dates, 404 page. |
| Privacy | Privacy notice page, linked from the footer and the form. The analytics consent banner appears only once an analytics ID is configured. |
| Charts | Example numbers kept, with a visible "Example data · for illustration, not client results" label. |

## Before going live

1. Approve the preview.
2. Enable Pages: Settings → Pages → Build and deployment → Source: GitHub Actions. Then re-run the latest **Deploy to GitHub Pages** workflow (Actions tab).
3. Point `1997labs.com` at GitHub Pages at your registrar: four `A` records on `@` (`185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153`) and a `CNAME` record for `www` to `<your-user>.github.io`. Remove the records that point the domain elsewhere today.
4. Have the privacy notice reviewed by someone qualified in UAE data protection (Federal Decree-Law 45/2021) before launch.
5. Later: add GA4 and Clarity IDs (`ANALYTICS-SETUP.md`), connect the form to a form service or CRM, and add the Arabic version.

## AI website review (chatbot)

A visitor enters their website; the API in `worker/` (Cloudflare Worker) checks the page, prices a plan from the owner's price sheet (`worker/src/pricing.js`) and asks MiniMax to write a plain-language review in English or Arabic. Prices always come from the price sheet, never from the AI. The chat UI is `site/assets/review.js` and stays hidden until `REVIEW_API` is set in that file.

Setup, once:

1. **Cloudflare**: create a free account. Create an API token with the "Edit Cloudflare Workers" template. In GitHub (Settings → Secrets and variables → Actions) add secrets `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`.
2. **Daily limits store**: in Cloudflare, Storage → KV → create a namespace (for example `1997labs-review-limits`). Add its id as the repository **variable** `KV_NAMESPACE_ID`.
3. **Bot check**: in Cloudflare, Turnstile → add a widget for `1997labs.com`. Put the **site key** in `TURNSTILE_SITE_KEY` in `site/assets/review.js`, and add the **secret key** as the secret `TURNSTILE_SECRET`.
4. **AI**: add your MiniMax API key as the secret `MINIMAX_API_KEY`. If your MiniMax account offers a spending limit, set one.
5. **Lead emails** (optional): create a Resend account, verify the domain `1997labs.com` (Resend shows DNS records to add at Namecheap), and add the secret `RESEND_API_KEY`. Without it, leads still arrive on WhatsApp.
6. Run **Actions → Review chatbot → Run workflow**. Copy the `workers.dev` address from the deploy log into `REVIEW_API` in `site/assets/review.js`.

Limits (in `worker/wrangler.toml`): 5 reviews per visitor per day, 300 per day in total, 3 call-back requests per visitor per day. Tests: `cd worker && npm test`.
