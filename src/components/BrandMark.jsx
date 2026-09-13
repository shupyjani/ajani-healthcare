import React from 'react';
import {
  MARK_A_PATH,
  MARK_COLORS,
  MARK_PLATE,
  MARK_SCALE,
  MASTER_DOT,
} from '../lib/brandMarkGeometry';

/**
 * The Ajani symbol, with no wordmark.
 *
 * Geometry and colour both come from lib/brandMarkGeometry.js, which is also
 * what the favicon, the PWA icons and the native app icon are generated from,
 * so the mark cannot drift between surfaces.
 *
 * The fills are attributes rather than stylesheet rules on purpose. The symbol
 * has one approved colourway — ivory letter, gold dot, teal plate — and
 * painting it here means no surface can quietly restyle it into another one.
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
      /* Cropped to the plate. The pack's canvas pads the badge with 48 units
         of transparent space for standalone use; inline it just shrinks the
         symbol inside whatever box holds it. */
      viewBox={`${MARK_PLATE.x} ${MARK_PLATE.y} ${MARK_PLATE.width} ${MARK_PLATE.height}`}
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
        fill={MARK_COLORS.plate}
      />
      <g transform={`translate(${MARK_PLATE.x} ${MARK_PLATE.y}) scale(${MARK_SCALE})`}>
        {/* One path, outer contour then counter, so the A keeps its hole. */}
        <path d={MARK_A_PATH} className="brand-mark-letter" fill={MARK_COLORS.letter} />
        <circle
          cx={MASTER_DOT.cx}
          cy={MASTER_DOT.cy}
          r={MASTER_DOT.r}
          className="brand-mark-dot"
          fill={MARK_COLORS.dot}
        />
      </g>
    </svg>
  );
}

export default BrandMark;
