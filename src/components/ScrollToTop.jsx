import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/*
 * Route-change scroll behaviour.
 *
 * A single-page app keeps the scroll position across navigations, so moving
 * from halfway down the home page to /contact would otherwise land mid-form.
 * Navigations that carry a hash are left alone: those are section links, and
 * HashScroll is already taking the reader to the right place.
 */
function ScrollToTop() {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    if (hash) return;
    if (typeof window.scrollTo !== 'function') return;
    window.scrollTo(0, 0);
    // pathname is a re-run trigger rather than a value read above: a route
    // change is precisely the event this effect exists to respond to.
    // oxlint-disable-next-line react/exhaustive-effect-dependencies
  }, [pathname, hash]);

  return null;
}

export default ScrollToTop;
