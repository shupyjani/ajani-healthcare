/*
 * The motion controller.
 *
 * A single shared IntersectionObserver drives every scroll reveal on the site.
 * There is no animation library involved; this file plus src/styles/motion.css
 * are the whole system.
 *
 * Three rules shape the design:
 *
 * 1. Content is visible unless this module says otherwise. Nothing in the
 *    rendered markup carries a pre-reveal state — the `is-pending` class is
 *    added by script, after mount, and only when motion is actually going to
 *    run. If this file never executes, the page simply shows everything.
 *
 * 2. Reduced motion means no motion, not faster motion. When the user asks for
 *    reduced motion the pending state is never applied at all, so there is no
 *    transform, no delay and nothing to wait for.
 *
 * 3. Nothing may end up permanently hidden. An element already inside the
 *    viewport when it mounts is revealed directly rather than handed to the
 *    observer, which covers both above-the-fold content and pages too short to
 *    scroll — the case where a bottom-anchored element would otherwise never
 *    cross the observer's trigger line.
 */

export const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

/* A small bottom inset so a reveal starts just before the element is fully on
   screen. Kept as a fixed pixel value rather than a percentage: a percentage
   of a short viewport can exceed the remaining scroll distance. */
const OBSERVER_OPTIONS = { root: null, rootMargin: '0px 0px -48px 0px', threshold: 0 };

export function prefersReducedMotion() {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  return window.matchMedia(REDUCED_MOTION_QUERY).matches;
}

export function supportsIntersectionObserver() {
  return typeof window !== 'undefined' && typeof window.IntersectionObserver === 'function';
}

/** Whether reveal animations should run at all for this visit. */
export function motionEnabled() {
  return supportsIntersectionObserver() && !prefersReducedMotion();
}

let observer = null;
const waiting = new Map();

function getObserver() {
  if (observer) return observer;
  observer = new window.IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (entry.isIntersecting) release(entry.target);
    }
  }, OBSERVER_OPTIONS);
  return observer;
}

function release(element) {
  const onReveal = waiting.get(element);
  if (!onReveal) return;

  waiting.delete(element);
  if (observer) observer.unobserve(element);
  onReveal();
}

function isOnScreen(element) {
  if (typeof element.getBoundingClientRect !== 'function') return false;
  const rect = element.getBoundingClientRect();
  const viewportHeight = window.innerHeight || 0;
  return rect.bottom > 0 && rect.top < viewportHeight;
}

/**
 * Reveal `element` once, either now or when it scrolls into view.
 * Returns a cleanup function that cancels a reveal still in flight.
 */
export function revealOnEnter(element, onReveal) {
  waiting.set(element, onReveal);

  let firstFrame = 0;
  let secondFrame = 0;

  if (isOnScreen(element)) {
    /* Two frames, not one. The pending class was applied in a layout effect,
       so the browser has not painted it yet; revealing in the same frame would
       coalesce both styles into one paint and the transition would be skipped
       entirely. Waiting a frame guarantees the "from" state is painted first. */
    firstFrame = window.requestAnimationFrame(() => {
      secondFrame = window.requestAnimationFrame(() => release(element));
    });
  } else {
    getObserver().observe(element);
  }

  return () => {
    if (firstFrame) window.cancelAnimationFrame(firstFrame);
    if (secondFrame) window.cancelAnimationFrame(secondFrame);
    if (waiting.delete(element) && observer) observer.unobserve(element);
  };
}

/* Test seam: the shared observer outlives any one component, so a suite that
   swaps the IntersectionObserver implementation between cases needs a way to
   drop the instance built from the previous one. */
export function resetMotionForTests() {
  if (observer) observer.disconnect();
  observer = null;
  waiting.clear();
}
