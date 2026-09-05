# Ajani Healthcare — website

The company website for **Ajani Healthcare**, a UK-based healthcare company working across
three connected capabilities:

- **Healthcare Workforce** — staffing and workforce support shaped around rota and service
  continuity.
- **Digital Products & UX** — healthcare websites and web applications, UX research and
  interface design, prototypes and internal operational tools.
- **Healthcare Operations & UK Readiness** — workflow and service improvement for care teams,
  and discovery support for health-technology companies preparing a product for NHS and UK
  care settings.

The three are presented on equal footing: Ajani Healthcare solves practical healthcare-delivery
problems through workforce, operational and digital perspectives together.

It also presents the company's own product work: **Ajani Workforce**, a pre-production
platform with a public preview running on synthetic demonstration data, and **Ajani Field
Operations**, an iOS-first planned concept with Android support considered later.

The homepage makes the Ajani Workforce pre-production and synthetic-data disclosure once,
beside the preview link. Fuller technical detail — including the preview's authentication
model — belongs in that product's own repository and documentation, not repeated across this
site.

## Status

**Checkpoint Clean-3.** A non-fork application on an independent Git root: a Vite React
scaffold whose routing, navigation, footer and contact form were implemented for this
repository, carrying its motion system, a dependency-free section navigation, a lint quality
gate, and the three-capability positioning above. Content, branding and design work are carried
forward from the earlier Ajani redesign prototype. See
[docs/checkpoints.md](docs/checkpoints.md) for what each checkpoint covered, and
[PROVENANCE.md](PROVENANCE.md) for where the material comes from.

## Tech stack

Vite · React · React Router · JavaScript / JSX · CSS · Vitest · Testing Library

## Getting started

```bash
npm install
cp .env.example .env.local   # then fill in the EmailJS values
npm run dev
```

## Scripts

| Script | What it does |
| --- | --- |
| `npm run dev` | Start the Vite dev server |
| `npm run build` | Production build into `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm test` | Vitest in watch mode |
| `npm run test:run` | Vitest once, for CI |
| `npm run verify` | `lint`, then `test:run`, then `build` — the combined pre-deploy check |
| `npm run lint` | Oxlint over source, tests, scripts and the Vite config |
| `npm run icons` | Regenerate the favicon and PWA icons from the brand mark |

## Environment

The contact form posts through EmailJS. Three values are required at build time:

```
VITE_EMAILJS_SERVICE_ID
VITE_EMAILJS_TEMPLATE_ID
VITE_EMAILJS_PUBLIC_KEY
```

Copy `.env.example` to `.env.local` and fill them in. Every real env file is ignored by git; only
`.env.example`, which holds blank placeholders, is committed. When the values are absent the form
does not pretend to work: it says the online form is temporarily unavailable, offers
`contact@ajanihealthcare.com` as a mailto fallback, and disables submission.

The EmailJS template must expose exactly these five variables, which are the form's field names:
`name`, `email`, `address`, `subject`, `message`.

## Linting

`npm run lint` runs [Oxlint](https://oxc.rs), the linter the current Vite React scaffold ships
with, over `src`, `scripts` and `vite.config.js`. `.oxlintrc.json` extends the scaffold's config
with the `import`, `jsx-a11y`, `promise` and `vitest` plugins and promotes the `correctness` and
`suspicious` categories to errors.

Two rules are switched off project-wide, both because they contradict the framework rather than
catch a defect:

- `import/no-unassigned-import` — side-effect CSS imports are how Vite loads stylesheets.
- `jsx-a11y/prefer-tag-over-role` — `<div role="status">` is correct ARIA for a form status
  message; `<output>` is for calculation results.

Everywhere else a rule is suppressed it is suppressed on the single line it applies to, with the
reason written next to it. No TypeScript type packages are installed: this is a JavaScript
project.

## Deployment

Built as a static site and served from `dist/`. `public/_redirects` carries the Netlify SPA
fallback (`/*  /index.html  200`) so client-side routes resolve on a hard refresh.

## Motion

Reveal animations are a genuine enhancement, not a layer the content depends on. The rules the
system holds itself to, each covered by a test:

- Nothing in the rendered markup carries a pre-reveal state. `src/lib/motion.js` adds it after
  mount, and only when motion is going to run — so with JavaScript disabled, with no
  `IntersectionObserver`, or under `prefers-reduced-motion`, the page simply shows everything.
- Reveals move `opacity` and `transform` only. No section changes height and no anchor target
  moves, so section navigation lands in the same place with or without motion.
- Section elements are never revealed, only their contents.
- Each reveal runs once and is then unobserved.
- Nothing loops. There is no ambient or infinite animation anywhere.
- Hover adds depth and at most a 1–2px lift; it never carries information, and it never moves an
  element that has `:focus-visible`.

## Section navigation

`/#services`-style links are handled locally by `src/components/SectionLink.jsx` (a React Router
`Link` to a real, shareable href) and `src/components/HashScroll.jsx` (one effect that reacts to
any location carrying a fragment). One code path therefore covers section links from the home
page, section links from another route, a `/#services` URL opened or shared directly, and the
browser's back and forward buttons.

The sticky-header offset is applied in exactly one place: `scroll-padding-top` on `html`,
resolving to 77px — the header's 76px of content plus its 1px bottom border. `scrollIntoView`
honours that scroll padding, so no offset is computed in JavaScript and no `scroll-margin-top` is
set on the targets; either would stack a second offset on the first.

## Accessibility

The structural commitments this codebase holds itself to, each covered by a test:

- One `<h1>` per route, inside a `<main id="main-content">` landmark.
- A skip link that moves focus, not just scroll position, to that landmark.
- Keyboard-reachable navigation with visible `:focus-visible` styling throughout.
- Mobile navigation that closes on `Escape` and returns focus to the control that opened it.
- A closed mobile menu that is **removed from the document**, not merely hidden, so its links
  are neither tabbable nor announced by assistive technology.
- A decorative brand mark that produces no accessible name of its own, so the header's brand
  link is announced once rather than twice.
- Status and error text at 4.5:1 contrast or better against the surface it sits on.
- `prefers-reduced-motion: reduce` honoured site-wide: no reveal transforms, no stagger, no
  hover movement and no smooth scrolling, with all content still shown.
- Section navigation moves focus to the target section, not just the scroll position.

## Assets and licensing

Everything this site renders is HTML and text, CSS, and inline or local SVG defined in this
repository, together with the PNG and ICO application icons generated locally from the brand
geometry. No stock photography and no remote font asset is used.

- **No photography or stock imagery.** The site contains no `<img>` element at all; a test
  enforces this on the home page.
- **No remote fonts.** Type is set in system font stacks (`--font-sans`, `--font-serif`).
- **No CDN scripts or third-party icon packs.** The icon set in `src/components/icons.jsx` is
  drawn locally.
- **Brand mark.** The Ajani geometric mark is Ajani's own, defined as coordinates maintained
  in `src/lib/brandMarkGeometry.js`. `scripts/generate-icons.mjs` rasterises those coordinates
  into `public/favicon.svg`, `favicon.ico`, `favicon-32.png`, `apple-touch-icon.png`,
  `icon-192.png`, `icon-512.png` and `icon-maskable-512.png`. The generator uses only Node's
  built-in `zlib` — no image library, and no network access — so the icons cannot drift from
  the mark and introduce no third-party licence obligation.
- **Hero visual.** Built entirely from markup, CSS and inline SVG. It states no figures: there
  is no chart, percentage or count anywhere on the page, because there is no published
  performance data the site could honestly show.
- **Motion.** The reveal system is local: `src/lib/motion.js` plus `src/styles/motion.css`.
  No animation library is used; the durations, easing and offsets are defined in this
  repository.
- **Dependencies.** Direct runtime: React, React DOM, React Router and the EmailJS browser
  SDK. Direct development: Vite, the React plugin, Oxlint, Vitest, jsdom and Testing Library.
  No other direct dependencies are declared, and a test asserts that list stays closed. Those
  packages bring their own transitive dependencies; everything reaching the production build is
  listed with its licence in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).

## Provenance

This repository has an independent Git root and is not configured as a fork.

The reachable repository contains no identified substantive implementation or visual assets from
the original upstream starter. It carries forward and refines Ajani Healthcare content, branding
and design work developed in the earlier redesign prototype.

The application shell, routing, navigation, footer, contact architecture, motion system, hero
diagram and tests were implemented for this repository. The content sections, the shared design
tokens and the icon set carry forward Ajani's own previously authored work.

[PROVENANCE.md](PROVENANCE.md) records this in full, including what the local comparison audit
examined and the limits of what it establishes.

## Licensing

Copyright © 2026 Ajani Healthcare. All rights reserved.

This repository carries no general open-source licence for Ajani Healthcare's own source code.
The npm package is marked `private`, and no rights to reuse, redistribute or relicense that
source are granted here.

That position applies only to Ajani Healthcare's own material. It does not alter or supersede
the licences of the third-party dependencies this project uses, which remain in force and are
reproduced in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
