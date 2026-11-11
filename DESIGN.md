# ShiftReady design record

## Direction

Night-shift hi-vis. Dark is the brand default; light follows the operating
system unless the reader picks a theme. Amber `#FFB81C` is a fill colour, never
small amber text on a light surface. Body copy is Atkinson Hyperlegible because
a large part of the audience reads English as a second language. Display type is
Barlow Condensed, uppercase.

The reference package is stored in `docs/design/`. `docs/design/theme.css` is
the source of truth for colour and type tokens.

## Tokens

The runtime mapping lives in `site/assets/shiftready.css`. It keeps the old
Clearline semantic names (`--paper`, `--ink`, `--signal`) as aliases so the
existing layouts did not have to be rewritten in one pass.

- Dark: page `#0B1220`, surface `#121B2E`, text `#EEF2F8`, muted `#A9B4C7`,
  amber `#FFB81C`, correct teal `#5EEAD4`, wrong burnt orange `#FF8A65`.
- Light: page `#F6F7F9`, surface `#FFFFFF`, text `#111827`, muted `#4B5565`,
  amber text `#8A5A00`, correct `#0F766E`, wrong `#C2410C`.
- Radii: 8 small, 12 buttons/options, 16 cards, 20 hero cards.
- Width: 1200px maximum; 32px side padding, 20px below 640px.
- Type: Barlow Condensed 600/700/800; Atkinson Hyperlegible 400/700.
- Touch: buttons at least 46–48px; answer options at least 56px.

## Components applied

- Brand mark: amber square with the shield-and-tick placeholder, in the header
  and footer. Same SVG used for the favicon.
- Header: brand, primary navigation, theme toggle, one primary action.
- Buttons: amber primary and outlined ghost. Disabled buttons lose opacity and
  cannot be clicked.
- Study-pass card: amber card with a lanyard slot, qualification name, four unit
  segments and a coverage count. It is on the home page only. It deliberately
  says "question coverage", not "mock-ready", because the bank is still draft.
- Progress: 10px amber track.
- Question card: surface card, 16px radius; answer options 56px tall with letter
  keys; selected is amber; correct is teal with a check; wrong is burnt orange
  with a cross.
- Practice feedback: colour plus a word, with the source quotation and a link to
  the specification. It is announced with `role="status"` and `aria-live`.
- Mock timer: amber pill with tabular numerals.
- Correct-answer moment: one 280ms hi-vis sweep, disabled under
  `prefers-reduced-motion`.
- Footer: OGL attribution and the independent-of-SIA statement.

## Deliberate deviations

- **Static HTML, CSS and vanilla ES modules.** The design instructions suggest
  Vite, React, TypeScript and Tailwind. This repository is already a build-free
  site served by GitHub Pages; adding a framework would add a build step without
  changing what the reader can do. The design tokens and components are the same.
- **One eyebrow per page.** Section labels above the qualification and "how it
  works" sections were removed; the hero keeps the only eyebrow on the home page.
- **No mock-ready claim.** The card reports question coverage. Calling a unit
  mock-ready requires a completed mock result, not just answered questions.
- **One qualification grid.** The second, duplicate "which licence" grid was
  removed. Door Supervisor gets a top rule and a best-attempt label to carry more
  weight than the other cards.
- **No invented product details.** The prototype's "Start free" and similar
  sales language are not used. There is no price, booking, guarantee or claim of
  official exam content.
- **Not yet built:** the `/styleguide` route, settings (theme/text size/reset),
  PWA/offline mode, self-hosted font files, an Open Graph image, and a proper
  404 route. The existing 404 state is a page-level message. These are recorded
  as gaps rather than silently skipped.

## Checks run

- `node --check site/assets/app.js`.
- Browser checks at 1440px and 360px; no page-level horizontal overflow and no
  JavaScript errors on the home, qualification, practice and mock routes.
- Theme toggle verified: system default, explicit dark/light persisted under the
  `theme` key, and the inline head script prevents a first-paint flash.
- Study-pass segments and copy checked against actual browser data.
