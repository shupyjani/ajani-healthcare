import { prefersReducedMotion } from './motion';

/*
 * Section navigation.
 *
 * Replaces the react-router-hash-link dependency with React Router's own Link
 * plus two native browser APIs: Element.scrollIntoView and Element.focus.
 *
 * Offsetting under the sticky header is deliberately *not* done here. The site
 * has exactly one offset mechanism — `scroll-padding-top: var(--scroll-offset)`
 * on `html`, which resolves to the 77px header (76px of content plus its 1px
 * bottom border) — and scrollIntoView honours the scroll padding of the
 * scrollport. Computing an offset in JavaScript, or adding scroll-margin-top to
 * the targets, would stack a second offset on top of the first and leave a
 * strip of the previous section showing. See the note in src/styles/theme.css.
 */

/** The route-relative href for a home-page section. */
export function sectionHref(id) {
  return `/#${id}`;
}

/**
 * The section id named by a URL fragment.
 *
 * decodeURIComponent throws a URIError on any invalid percent-escape, and
 * "#100%", "#%" and "#%zz" are all enough to do it. Thrown from the effect
 * that reads the location, that error takes the whole application down — every
 * route, not just this one — on a URL the reader only mistyped.
 *
 * A fragment that cannot be decoded cannot name one of our sections either, so
 * the raw text is returned instead: the lookup misses harmlessly and the page
 * renders as it should.
 */
export function fragmentToId(hash) {
  if (!hash) return '';

  const raw = hash.startsWith('#') ? hash.slice(1) : hash;
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

/**
 * Scroll a section into view and move focus to it.
 *
 * Focus is the half that a plain fragment link gets wrong: without it a
 * keyboard user's next Tab resumes from the header rather than from the
 * section they just asked for, and a screen reader announces nothing. The
 * target is given tabindex="-1" on demand so it can receive programmatic focus
 * without ever entering the tab order.
 *
 * Returns false when the section is not in the document, which is how the
 * caller knows to try again after the destination route has rendered.
 */
export function scrollToSection(id) {
  if (typeof document === 'undefined') return false;

  const target = document.getElementById(id);
  if (!target) return false;

  if (!target.hasAttribute('tabindex')) {
    target.setAttribute('tabindex', '-1');
  }

  if (typeof target.focus === 'function') {
    /* preventScroll keeps focus from jumping the page instantly; the smooth
       scroll below is what actually moves the reader. */
    target.focus({ preventScroll: true });
  }

  if (typeof target.scrollIntoView === 'function') {
    target.scrollIntoView({
      behavior: prefersReducedMotion() ? 'auto' : 'smooth',
      block: 'start',
    });
  }

  return true;
}

/** True for clicks the browser should handle itself, such as open-in-new-tab. */
export function isModifiedClick(event) {
  return (
    event.metaKey ||
    event.ctrlKey ||
    event.shiftKey ||
    event.altKey ||
    (event.button !== undefined && event.button !== 0)
  );
}
