import React from 'react';
import './RouteFallback.css';

/**
 * What a lazily-loaded route shows while its chunk is in flight.
 *
 * Three things it has to get right:
 *
 * 1. It renders the same `<main id="main-content">` landmark every route
 *    renders, so the skip link still has its target and the page still has a
 *    main landmark during the load.
 * 2. It reserves height. Without a minimum the footer would ride up to meet
 *    the header and then be shoved back down when the chunk arrives, which is
 *    a layout shift the reader sees.
 * 3. It announces itself politely through `role="status"`, so a screen-reader
 *    user is told the page is loading rather than left in silence.
 *
 * There is no spinner: nothing here animates, which keeps the fallback inside
 * the site's no-ambient-motion rule.
 */
function RouteFallback({ label = 'Loading…' }) {
  return (
    <main id="main-content" tabIndex={-1} className="route-fallback">
      <div className="container">
        <p className="route-fallback-message" role="status">
          {label}
        </p>
      </div>
    </main>
  );
}

export default RouteFallback;
