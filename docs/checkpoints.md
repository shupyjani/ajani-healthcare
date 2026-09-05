# Checkpoints

## Clean-1 — clean structural foundation

A fresh, non-fork Vite React application. What it establishes:

- Vite React (JavaScript) scaffold with a minimal, honest dependency list.
- Routing, application shell, navigation, footer and contact form implemented for this
  repository.
- Ajani Healthcare positioned across three connected capabilities.
- Ajani Workforce presented as a featured pre-production product on synthetic preview data,
  with its live preview and public repository links preserved.
- Ajani Field Operations presented as an iOS-first planned concept, Android considered later.
- A contact form driven by field descriptors and a reducer, sending through EmailJS with the
  existing `name` / `email` / `address` / `subject` / `message` contract, configured entirely
  through environment variables.
- An original geometric brand mark, with favicon and PWA icons generated from it locally.
- Semantic landmarks, one H1 per route, a focus-moving skip link, Escape-to-close mobile
  navigation that is removed from the document when closed, `:focus-visible` styling,
  4.5:1 status text and site-wide reduced-motion support.
- A test suite covering all of the above, plus a combined `npm run verify` command.

## Clean-2 — visual polish, motion and quality gate (this checkpoint)

Adds intentional motion on top of the Clean-1 structure without changing its content or
weakening its accessibility guarantees. Original brief in
[visual-design-plan.md](visual-design-plan.md).

- A local motion system: `src/lib/motion.js` (one shared IntersectionObserver) and
  `src/styles/motion.css`. No animation library.
- Hero entrance on meaningful phrase groups, with the eyebrow entering horizontally, the
  headline settling from a slightly smaller scale, and the visual assembling once.
- Scroll reveals across Services, Products, About, Transparency and the closing CTA, each
  running once, on content only — never on a section element, so anchor targets cannot move.
- Progressive enhancement throughout: no pre-reveal state exists until the controller applies
  it, and none is applied without `IntersectionObserver` or under reduced motion.
- Hover and focus polish on buttons, cards and product panels, with focus-visible untouched.
- `react-router-hash-link` removed and replaced by `SectionLink` and `HashScroll`, built on
  React Router plus `scrollIntoView` and `focus`. Section navigation now also moves focus.
- Oxlint restored as a quality gate, wired into `npm run lint` and `npm run verify`.
- The contact form's unavailable state now offers a `contact@ajanihealthcare.com` mailto
  fallback instead of a dead end.

## Clean-2.2 — positioning, service cards and final motion step (this checkpoint)

Business positioning, not a redesign. The section order, typography and layout are unchanged.

- Ajani Healthcare presented as three equal capabilities — Healthcare Workforce, Digital
  Products & UX, Healthcare Operations & UK Readiness — rather than as a staffing company that
  also does other things.
- Hero headline kept; supporting copy rewritten so the three capabilities read quickly.
- "Umbrella company" removed everywhere. Relationships are described as "Ajani Healthcare",
  "part of Ajani Healthcare" or "an Ajani Healthcare product".
- Service cards gained a pale-teal header panel, a numbered inline-SVG mark and teal bullet
  markers, keeping equal heights, responsive stacking and the existing hover lift.
- The Ajani Workforce pre-production and synthetic-data disclosure is now made once, beside the
  preview link. Removed from the transparency section and the footer; the preview's
  authentication model is no longer advertised on the company homepage.
- Transparency section reframed from disclaimers to four working principles under "How we work".
- "UK" retained in three places only: the hero trust marker, the third service title, and one
  mention of NHS and UK care settings in that service's description.
- Motion slowed a final measured step so overlapping entrances resolve: the hero now settles in
  about 1.84s with the first group starting immediately.
