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
