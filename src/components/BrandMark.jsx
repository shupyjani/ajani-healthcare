import React from 'react';
import {
  MARK_BAR,
  MARK_FRAME_PATH,
  MARK_PLATE,
  MARK_VIEWBOX,
} from '../lib/brandMarkGeometry';

/**
 * The Ajani geometric brand mark, with no text.
 *
 * Geometry comes from lib/brandMarkGeometry.js, which is also what the
 * favicon and PWA icons are generated from, so the mark cannot drift between
 * surfaces. Colours come from CSS (see Brand.css), which is how the inverse
 * variant works.
 *
 * Always decorative: it renders aria-hidden and carries no role or label.
 * Naming whatever contains it is the caller's job, and that is what keeps a
 * brand link from announcing its name twice.
 */
function BrandMark({ size = 40, className = 'brand-mark' }) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox={MARK_VIEWBOX}
      focusable="false"
      aria-hidden="true"
    >
      <rect
        x={MARK_PLATE.x}
        y={MARK_PLATE.y}
        width={MARK_PLATE.width}
        height={MARK_PLATE.height}
        rx={MARK_PLATE.rx}
        className="brand-mark-plate"
      />
      <path d={MARK_FRAME_PATH} className="brand-mark-frame" />
      <rect
        x={MARK_BAR.x}
        y={MARK_BAR.y}
        width={MARK_BAR.width}
        height={MARK_BAR.height}
        rx={MARK_BAR.rx}
        className="brand-mark-bar"
      />
    </svg>
  );
}

export default BrandMark;
