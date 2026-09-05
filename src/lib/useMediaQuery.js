import { useEffect, useState } from 'react';

/**
 * Subscribe to a CSS media query from React.
 *
 * The mobile navigation needs this rather than a CSS-only solution. Hiding a
 * closed menu with `display: none` or the `hidden` attribute would also hide
 * it on desktop, where it must stay available; leaving it in the DOM and
 * hiding it visually would leave its links tabbable and exposed to assistive
 * technology while closed. Knowing in JavaScript whether we are at a mobile
 * width lets the Navbar simply not render the menu when it is closed there.
 *
 * Returns false during server rendering and in environments with no
 * matchMedia, which is the safe default: the desktop navigation is rendered.
 */
export function useMediaQuery(query) {
  const [matches, setMatches] = useState(() => getMatches(query));

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return undefined;
    }

    const list = window.matchMedia(query);
    const onChange = (event) => setMatches(event.matches);

    /* Synchronising with a browser API whose value can change between the
       initial render and this effect running, which is what an effect is for. */
    // oxlint-disable-next-line react/set-state-in-effect
    setMatches(list.matches);

    if (typeof list.addEventListener === 'function') {
      list.addEventListener('change', onChange);
      return () => list.removeEventListener('change', onChange);
    }

    /* Safari < 14 and other older engines. */
    list.addListener(onChange);
    return () => list.removeListener(onChange);
  }, [query]);

  return matches;
}

function getMatches(query) {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false;
  }
  return window.matchMedia(query).matches;
}

/* Matches the Navbar's own breakpoint in Navbar.css. Both must change together. */
export const MOBILE_NAV_QUERY = '(max-width: 900px)';
