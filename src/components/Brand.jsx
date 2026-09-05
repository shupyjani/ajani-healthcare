import React from 'react';
import BrandMark from './BrandMark';
import './Brand.css';

/**
 * Shared Ajani product-family lockup: the geometric mark plus the
 * "Ajani Healthcare" wordmark. `variant="inverse"` is used on dark surfaces.
 *
 * Accessible naming rule for this component: the mark is always decorative.
 * Exactly one accessible name is produced, either by the visible wordmark or,
 * when the wordmark is suppressed, by a visually hidden label. A link or
 * button wrapping <Brand /> therefore never announces "Ajani Healthcare"
 * twice.
 */
function Brand({ variant = 'default', showWordmark = true, markSize = 40 }) {
  return (
    <span className={`brand brand--${variant}`}>
      <BrandMark size={markSize} />
      {showWordmark ? (
        <span className="brand-wordmark">
          <span className="brand-wordmark-primary">Ajani</span>
          <span className="brand-wordmark-secondary">Healthcare</span>
        </span>
      ) : (
        <span className="visually-hidden">Ajani Healthcare</span>
      )}
    </span>
  );
}

export default Brand;
