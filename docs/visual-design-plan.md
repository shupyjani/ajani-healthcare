# Visual design plan — Checkpoint Clean-2

> **Status: delivered.** This brief was implemented in Checkpoint Clean-2. It is kept as the
> record of what was asked for; see [checkpoints.md](checkpoints.md) for what was built and the
> README's Motion and Section navigation sections for how it works.

The finished Ajani Healthcare landing page should feel alive and premium, with **intentional
motion that communicates hierarchy rather than decoration**.

This is a planned visual-polish checkpoint that sits *on top of* the Clean-1 structural
foundation. It is not a reason to compromise the content or the accessibility work already in
place: every guarantee listed in the README's Accessibility section must still hold, and its
tests must still pass, after this work lands.

## 1. Hero entrance

- The eyebrow and primary content reveal smoothly from a slight offset.
- The main heading begins slightly smaller and settles into its final scale.
- Supporting text and CTA buttons follow with a restrained stagger.
- The right-side operational visual fades and scales into position.
- Movement stays subtle and polished, never theatrical.

## 2. Scroll-reveal behaviour

- Services, Products, About and Transparency content reveals as it enters the viewport.
- Cards may use a small stagger.
- Do not animate every individual word or paragraph.
- Do not use movement that changes document layout or interferes with anchor scrolling.
  In particular, nothing may alter the height of a section above a scroll target while a hash
  navigation is in flight; `scroll-padding-top` on `html` remains the single anchor-offset
  mechanism (see `src/styles/theme.css`).

## 3. Interaction polish

- Buttons, links, cards and navigation get clear hover and focus transitions.
- Visible keyboard focus stays strong. Transitions must not soften, delay or obscure the
  `:focus-visible` outline.
- Mobile navigation animates open and closed **without leaving hidden links keyboard-focusable**.
  The current implementation removes the closed menu from the document entirely; any exit
  animation must keep that property, which means animating on the way in and either accepting an
  instant close or deferring unmount behind a state that is also inert to Tab and assistive
  technology.

## 4. Accessibility and performance

- Support `prefers-reduced-motion: reduce`.
- Reduced-motion users receive **the same content**, with transforms, delays and non-essential
  transitions disabled. Scroll-revealed content must be visible for these users without waiting
  on an observer.
- Use CSS transitions and keyframes plus a small native `IntersectionObserver` only.
- Do not add AOS, an animation library, remote fonts or external assets.
- Avoid infinite animations, except for an extremely subtle decorative effect where it genuinely
  earns its place.

## 5. Verification

Check the motion at desktop and narrow mobile widths, and confirm:

- Section anchor links still land at the correct boundary.
- The Contact route still opens at the top.
- **No content is hidden before JavaScript runs** — reveal styles must be applied by script, so
  the no-JS and pre-hydration renderings show everything.
- The production build and the test suite remain clean.

## Suggested implementation shape

- A `useReveal` hook wrapping a single shared `IntersectionObserver`, adding a class on entry.
- A `.is-revealed` / `.will-reveal` class pair, with `.will-reveal` applied from JavaScript on
  mount rather than sitting in the initial HTML, so nothing is hidden without script.
- Motion tokens in `theme.css` (`--motion-fast`, `--motion-base`, `--motion-stagger`, easing)
  so durations are tuned in one place.
- The existing `@media (prefers-reduced-motion: reduce)` block in `theme.css` already neutralises
  durations globally; extend it to also force the revealed state rather than relying on the
  observer.
