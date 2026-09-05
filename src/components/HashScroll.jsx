import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { fragmentToId, scrollToSection } from '../lib/sectionNavigation';

/*
 * Scrolls to the section named by the URL fragment whenever the location
 * changes.
 *
 * This is the single place that reacts to a hash, which means one code path
 * covers all of: a section link pressed on the home page, a section link
 * pressed from the contact or not-found route, a /#services URL opened or
 * shared directly, and the browser's back and forward buttons — every one of
 * those is just a new location with a hash.
 *
 * The effect keys on location.key as well as the hash so that returning to the
 * same section through history is still acted on.
 */
function HashScroll() {
  const { hash, key } = useLocation();

  useEffect(() => {
    if (!hash) return undefined;

    /* Decoded defensively: a malformed fragment must not throw out of this
       effect and take the page down with it. */
    const id = fragmentToId(hash);
    if (!id) return undefined;

    /* The common case: the route is already rendered, so this succeeds now. */
    if (scrollToSection(id)) return undefined;

    /* Arriving from another route, the target may be a frame away. One retry
       is enough; a section that is still missing does not exist. */
    const frame = window.requestAnimationFrame(() => scrollToSection(id));
    return () => window.cancelAnimationFrame(frame);
    // key is a re-run trigger, not a value read above: it is what makes
    // returning to the same section through history scroll again.
    // oxlint-disable-next-line react/exhaustive-effect-dependencies
  }, [hash, key]);

  return null;
}

export default HashScroll;
