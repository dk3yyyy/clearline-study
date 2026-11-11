# ShiftReady Design Package: Instructions for the AI Agent

This package holds the approved visual direction for the SIA study and mock-test site, in **dark and light mode**. Your job:

1. **Use it:** build the real site in this visual language.
2. **Copy it faithfully:** the tokens, type, colours and components below are the baseline.
3. **Make it better:** apply the improvements in §6 without losing the identity in §2.

Read `docs/SIA-STUDY-SITE-AGENT-INSTRUCTIONS.md` as well. It covers the content pipeline: sources, licensing, the question bank and site features. This file covers **how it looks and feels**. If the two conflict on content or licensing, that file wins. On visual design, this file wins.

---

## 1. What's in the package

```
DESIGN-AGENT-INSTRUCTIONS.md   ← this file
README.md
reference/
  theme.css          ← design tokens + base styles, light & dark (SOURCE OF TRUTH for colours/type)
  index.html         ← landing page, plain HTML/CSS/JS, theme toggle, working sample question
  app-screens.html   ← phone screens: mock exam question + results with study-pass card
design-source/       ← original canvas files from the design tool (reference only, don't ship)
  Main.dc.html  Main-Light.dc.html  Mock.dc.html  Results.dc.html
docs/
  SIA-STUDY-SITE-AGENT-INSTRUCTIONS.md   ← full site/content build instructions
```

- Open `reference/index.html` and `reference/app-screens.html` in a browser first. Use the toggle in the header to see both themes.
- The `design-source/*.dc.html` files use a proprietary canvas runtime and **will not run on their own**. Use them only to check spacing, copy or layout details. Build from `reference/`.

---

## 2. Identity: what must survive any change

**Theme statement:** *night-shift, hi-vis confidence.* The look should evoke a door supervisor's amber vest under streetlights: serious and trustworthy, never aggressive or "police".

The non-negotiables:
1. **Hi-vis amber `#FFB81C` is the one accent colour.** It is used as a **fill** (primary buttons, progress bars, the timer, the study-pass card) in both themes.
2. **Amber is never text on a light background.** In light mode, amber-coloured text and icons use `--accent-text: #8A5A00`. Text sitting *on* amber is always `#0B1220`.
3. **Dark mode is the brand default.** Light mode follows `prefers-color-scheme`, and the header toggle overrides it and remembers the choice (`localStorage` key `theme`). Set the theme before first paint (inline script in `<head>`) so the page doesn't flash.
4. **Type pairing:** **Barlow Condensed** (600/700/800, uppercase) for display headings, licence names, scores and the timer. **Atkinson Hyperlegible** (400/700) for everything people read, including questions and answers. Atkinson was chosen because many users read English as a second language. Do not swap it for Inter or similar.
5. **The study-pass card** (amber badge-style card with a lanyard slot and unit segments) is the signature element. Keep it, and do not make it resemble the real SIA licence card or use SIA logos.
6. **Feedback colours:** correct uses teal (`--ok`), wrong uses burnt orange (`--bad`). Always pair the colour with an icon or a word ("Correct", "Your answer"), never colour alone.

---

## 3. Tokens (from `reference/theme.css`)

| Token | Dark | Light | Use |
|---|---|---|---|
| `--bg` | `#0B1220` | `#F6F7F9` | Page background |
| `--bg-alt` | `#0F1829` | `#EEF1F5` | Alternate sections, answer options |
| `--surface` | `#121B2E` | `#FFFFFF` | Cards |
| `--line` | `#1C2741` | `#DDE2EA` | Section dividers |
| `--border` | `#24314D` | `#E3E8EF` | Card borders, progress tracks |
| `--border-option` | `#2A3654` | `#CBD3DF` | Answer option borders |
| `--border-strong` | `#3A4766` | `#B8C2D1` | Ghost buttons, pills |
| `--text` | `#EEF2F8` | `#111827` | Body text |
| `--text-2` | `#C9D2E0` | `#3B4556` | Secondary text |
| `--muted` | `#A9B4C7` | `#4B5565` | Captions, meta |
| `--accent` | `#FFB81C` | `#FFB81C` | Fills (buttons, bars, badge) |
| `--accent-hover` | `#FFC94D` | `#F2A900` | Button hover |
| `--accent-text` | `#FFB81C` | `#8A5A00` | Amber text and icons |
| `--on-accent` | `#0B1220` | `#0B1220` | Text on amber |
| `--ok` / `--ok-bg` / `--ok-border` | `#5EEAD4` / `#0E2A2B` / `#2F7F78` | `#0F766E` / `#E6F6F4` / `#5EB8AE` | Correct |
| `--bad` / `--bad-bg` / `--bad-border` | `#FF8A65` / `#2E1712` / `#8A4A38` | `#C2410C` / `#FDEDE7` / `#E2A48D` | Wrong |

**Radii:** 8 (small/letters), 12 (buttons, options), 16 (cards), 20 (hero cards), 36 (phone frame, mockups only).
**Layout:** max width 1200px, side padding 32px (20px under 640px), section padding 88–96px vertical.
**Touch targets:** minimum 44px; answer options 56–60px tall.

If you use Tailwind, map these to CSS variables (`colors: { bg: 'var(--bg)', ... }`) rather than hardcoding hexes, so both themes work from one class list.

---

## 4. Components to build (copy from the references)

| Component | Where it appears | Notes |
|---|---|---|
| Site header | `index.html` | Brand mark, nav, theme toggle (sun/moon), "Start free" button. Wraps on mobile. |
| Primary / ghost buttons | everywhere | `.btn-primary`, `.btn-ghost` |
| Question card + answer options | hero, practice, mock | States: default, hover, selected (amber), correct (teal), wrong (orange), dimmed. Letters A–D. |
| Feedback panel | practice mode | Title plus explanation plus "Try again". In practice mode it should also show the **source reference** (document and section). |
| Licence card | landing, home | Name, level tag (amber, or neutral for Level 3/Renewal), description, unit count. |
| Step cards | "How it works" | Numbered 01–03 because it really is a sequence. |
| Progress track | everywhere | 10px (8px on phone), amber fill; teal when at or above the pass mark in topic breakdowns. |
| Mock exam top bar | `app-screens.html` | Exit, title, **amber timer** (tabular numbers), question X of Y plus progress. |
| Study-pass card | results, dashboard | Amber card, lanyard slot, unit segments, "N of M units mock-ready". |
| Topic score list | results, drill | Below 70% shows as amber text, at or above 70% as teal. |
| Footer | all pages | OGL attribution plus "not endorsed by the SIA" plus the physical intervention trainer note. **Mandatory.** |

---

## 5. Screens the prototype doesn't cover yet (design them in the same language)

1. **Home/dashboard:** greeting, the study-pass card for the active qualification, "continue where you left off", and weak topics.
2. **Qualification page:** the unit list with progress, plus learn / practise / mock entry points per unit.
3. **Learn mode:** syllabus tree, then an objective page (short note plus a citation list linking to GOV.UK and legislation.gov.uk).
4. **Practice mode:** one question at a time with immediate feedback.
5. **Mock exam:** start screen (rules, question count, time, pass mark), question screen (prototype), "review flagged" screen, submit confirmation, results (prototype), and a full answer review.
6. **Weak-spot drill:** a spaced-repetition queue.
7. **Practical checklists** (Units 2–4).
8. **Settings:** theme (System / Dark / Light), text size, reset progress, export/import progress.
9. **Empty states and errors:** e.g. "No mocks yet. Start your first Unit 1 mock." Errors say what happened and how to fix it, and don't apologise.
10. **404 page.**

---

## 6. Make it better: required improvements

The prototype was a fast first pass. Improve it as follows.

### 6.1 Remove generic "AI template" tells
- **Uppercase eyebrow labels above every section** ("PICK YOUR LICENCE", "HOW IT WORKS"): keep at most one per page, or remove them. The section headings already say it.
- **Middle-dot meta strings** ("Door Supervisor · Security Officer · CCTV…", "Unit 1 · Mock 3 · Results"): rewrite them as plain sentences or proper UI (chips, breadcrumbs).
- **One coloured word in the headline** ("Pass your SIA exam *first time.*" in amber): try a stronger treatment. For example, make the headline itself the hero element with the live question beside it, or use a single solid colour with the amber reserved for the CTA.
- **Identical card grid:** the licence grid and the step cards look the same. Give Door Supervisor (the most common licence) more weight, or turn the steps into a horizontal timeline.
- **The arrow on every button:** keep it on the main CTA only.

### 6.2 One memorable moment (not lots of animation)
- On a correct answer, play a single, short "hi-vis" sweep across the option (≤300ms, using `transform`/`opacity` only), and respect `prefers-reduced-motion`.
- No fade-in-on-scroll on every section.

### 6.3 Real product quality
- **Mobile first.** Test at 360px wide. The landing hero question must fit without horizontal scroll.
- **Accessibility:** WCAG 2.2 AA. Visible focus rings (already in `theme.css`), keyboard-operable answers, `aria-live` for feedback, a skip link, and correct heading order. Check contrast for every token pair in both themes, with a test, not by eye.
- **Mock exam:** a real countdown that persists across reloads, a warning at 10 minutes and at 1 minute (text plus colour, not colour alone), flag/unflag, a question navigator grid, and a confirmation before submit.
- **PWA:** installable, works offline for downloaded question sets. Users revise on buses with poor signal.
- **Performance:** self-host the two fonts (subset, `font-display: swap`). Target Lighthouse 95+ on mobile.
- **Readable English:** keep sentences short (B1–B2 level). Add a glossary tooltip for legal terms (e.g. "affray", "reasonable force").
- **Text size setting:** 100% / 115% / 130%, applied via a root font-size variable.

### 6.4 Brand polish
- Replace the placeholder name **"ShiftReady"** if the owner chooses another. Keep the name in one config constant.
- Design a proper logo mark (the shield-plus-tick is a placeholder) and a favicon / app icon set in both themes.
- Create an Open Graph social image (1200×630) in the dark theme.

### 6.5 Honesty and compliance (from the content instructions)
- Never say "real exam questions" or "guaranteed pass".
- No SIA logos, and no imitation of the real SIA licence card.
- The example data in the prototype (79%, topic scores) must be replaced by real user data, or labelled "Example".

---

## 7. Build steps
1. Scaffold the site per `docs/SIA-STUDY-SITE-AGENT-INSTRUCTIONS.md` §5 (Vite + React + TypeScript + Tailwind, Cloudflare Pages).
2. Port `reference/theme.css` tokens into the global CSS and Tailwind config **first**. Add a `ThemeProvider` (system / dark / light, persisted, no flash).
3. Build the components in §4 as reusable components, with a simple `/styleguide` route showing every component in both themes.
4. Rebuild the landing page from `reference/index.html`, applying §6.1.
5. Build the app screens (§5), starting with mock exam and results from `reference/app-screens.html`.
6. Apply §6.2–6.4.
7. Run checks: contrast test for all token pairs, keyboard walk-through, 360px screenshots of every route in both themes, and Lighthouse mobile.
8. Write `DESIGN.md` in the repo recording the final tokens, components and any deviations from this file, with reasons.

## 8. Definition of done (design)
- Every route works and looks right in **both** themes at 360px, 768px and 1280px+.
- The theme follows the system by default; the toggle persists; there is no flash on load.
- All token pairs pass WCAG AA (4.5:1 text, 3:1 large text and UI).
- Every item in §6.1 has been addressed, each with a one-line note in `DESIGN.md`.
- The `/styleguide` route exists and shows all components in both themes.
