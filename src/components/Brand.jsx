import React from 'react';
import { BRAND_ARTWORK } from '../lib/brandLockupArtwork';
import './Brand.css';

/*
 * The company lockup, drawn from the approved artwork.
 *
 * The wordmark used to be set in the site's own serif at two sizes. That is a
 * reconstruction of a logo rather than the logo: the supplied files carry
 * outlined lettering with its own widths and spacing, and nothing typed into a
 * stylesheet reproduces them.
 *
 * The shapes below are the approved files' own, transcribed by
 * scripts/generate-brand-lockup.mjs. They are inlined rather than referenced
 * with <img> because this site draws every graphic as inline SVG and loads no
 * image files — a rule its tests enforce on the home page, the services cards,
 * the case study and the demo. Inlining keeps that rule and the artwork both:
 * the geometry is the file's, unscaled and unre-spaced, so the gap between the
 * "j" and HEALTHCARE is whatever the designer set.
 *
 * `variant="inverse"` selects the single-ink white artwork, because the
 * footer's surface is near-black and the colour version's teal lettering would
 * not read on it. The pack's own notes ask for the white version there.
 *
 * Accessible naming is unchanged: exactly one name per lockup. The <title>
 * names it, and a caller whose link already carries a name passes
 * `decorative`, which hides the graphic from the accessibility tree entirely.
 */

function Shape({ shape }) {
  if (shape.tag === 'rect') {
    return (
      <rect
        x={shape.x}
        y={shape.y}
        width={shape.width}
        height={shape.height}
        rx={shape.rx}
        fill={shape.fill}
        stroke={shape.stroke}
        strokeWidth={shape.strokeWidth}
        transform={shape.transform}
      />
    );
  }

  /* The dot. It sits inside the pack's group transform like the letter does. */
  if (shape.tag === 'circle') {
    return (
      <circle
        cx={shape.cx}
        cy={shape.cy}
        r={shape.r}
        fill={shape.fill}
        stroke={shape.stroke}
        strokeWidth={shape.strokeWidth}
        transform={shape.transform}
      />
    );
  }

  return (
    <path
      d={shape.d}
      fill={shape.fill}
      stroke={shape.stroke}
      strokeWidth={shape.strokeWidth}
      transform={shape.transform}
    />
  );
}

function Brand({
  variant = 'default',
  showWordmark = true,
  markSize = 40,
  decorative = false,
}) {
  const key = showWordmark ? (variant === 'inverse' ? 'lockupDark' : 'lockup') : 'symbol';
  const artwork = BRAND_ARTWORK[key];

  /*
   * The pack pads every canvas with 48 units of transparent space so the
   * artwork can be dropped into a document unaided. Inline, that padding is
   * 27% of the height doing nothing, and it was the reason a 40px header
   * lockup rendered a 2.5px descriptor. The view is cropped to the ink so the
   * height that is set is the height the logo occupies.
   *
   * Only the vertical padding is taken. The horizontal padding stays as the
   * logo's clear space, and nothing is scaled independently, so the approved
   * symbol-to-wordmark proportions are untouched.
   */
  const PAD = 48;
  const box = showWordmark
    ? `0 ${PAD} ${artwork.width} ${artwork.height - PAD * 2}`
    : `${PAD} ${PAD} ${artwork.width - PAD * 2} ${artwork.height - PAD * 2}`;
  const drawn = {
    width: showWordmark ? artwork.width : artwork.width - PAD * 2,
    height: artwork.height - PAD * 2,
  };

  /* Height is what is set; width follows the artwork's own ratio, so the
     lockup is never cropped and never stretched. */
  const width = Math.round((markSize * drawn.width) / drawn.height);

  return (
    <svg
      className={`brand brand--${variant} ${showWordmark ? 'brand--lockup' : 'brand--symbol'}`}
      viewBox={box}
      width={width}
      height={markSize}
      role={decorative ? undefined : 'img'}
      aria-hidden={decorative ? 'true' : undefined}
      focusable="false"
    >
      {!decorative && <title>Ajani Healthcare</title>}
      {artwork.shapes.map((shape, index) => (
        // The artwork is a fixed, ordered list; its index is its identity.
        // eslint-disable-next-line react/no-array-index-key
        <Shape key={index} shape={shape} />
      ))}
    </svg>
  );
}

export default Brand;
