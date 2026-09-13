/*
 * The Ajani symbol: an ivory "A" with a gold dot on a teal plate.
 *
 * The authority is Symbols/ajani-symbol-colour-transparent.svg in the shared
 * brand pack, and the numbers below are read straight out of it. The pack
 * draws the glyph in a 64-unit square and places it on a 360-unit canvas with
 * `translate(48 48) scale(4.125)`; the same two spaces are kept here, because
 * the 64-unit drawing is the master every size derives from.
 *
 * This module exists because the raster pipeline cannot read an SVG. The
 * in-page component and scripts/generate-icons.mjs both render from these
 * values, so the favicon, the PWA icons, the sharing image and the native app
 * icon are all the same artwork as the file itself.
 *
 * This replaces the earlier gold-open-A-with-ivory-crossbar mark, which is
 * superseded and must not be reintroduced. The two are easy to tell apart: the
 * current one is a solid A with a triangular counter and a separate gold dot,
 * and the plate is teal behind an ivory letter rather than gold on teal.
 */

/* --- The master, in its own 64-unit square ------------------------------- */

export const MASTER_SIZE = 64;

/* Straight-sided throughout, so the A is two polygons rather than a path. */
export const MASTER_A_OUTER = [
  [18, 43], [29.6, 17], [34.8, 17], [46, 43],
  [38.8, 43], [36.8, 38], [27.4, 38], [25.3, 43],
];

/* The triangular counter, wound the other way so it reads as a hole. */
export const MASTER_A_COUNTER = [[29.7, 32], [34.5, 32], [32.1, 25.7]];

export const MASTER_DOT = { cx: 47, cy: 17, r: 5 };

/* --- The same drawing on the pack's 360-unit canvas ---------------------- */

export const MARK_SIZE = 360;
export const MARK_VIEWBOX = `0 0 ${MARK_SIZE} ${MARK_SIZE}`;

export const MARK_PLATE = { x: 48, y: 48, width: 264, height: 264, rx: 66 };

/* How the pack places the 64-unit master on that canvas. */
export const MARK_SCALE = MARK_PLATE.width / MASTER_SIZE;
const place = ([x, y]) => [
  MARK_PLATE.x + x * MARK_SCALE,
  MARK_PLATE.y + y * MARK_SCALE,
];

export const MARK_A_OUTER = MASTER_A_OUTER.map(place);
export const MARK_A_COUNTER = MASTER_A_COUNTER.map(place);
export const MARK_DOT = {
  cx: MARK_PLATE.x + MASTER_DOT.cx * MARK_SCALE,
  cy: MARK_PLATE.y + MASTER_DOT.cy * MARK_SCALE,
  r: MASTER_DOT.r * MARK_SCALE,
};

/*
 * The A as the pack writes it: one path, outer contour then counter, filled
 * with the non-zero rule. Kept as the pack's own string so the component
 * renders the artwork's characters rather than a re-derivation of them.
 */
export const MARK_A_PATH =
  'M18 43 29.6 17h5.2L46 43h-7.2l-2-5H27.4l-2.1 5H18Zm11.7-11h4.8l-2.4-6.3L29.7 32Z';

/* Teal, ivory and gold, exactly as the guide names them. */
export const MARK_COLORS = {
  plate: '#0B5351',
  letter: '#FAF8F1',
  dot: '#D2AA56',
};

/*
 * How much larger the artwork is drawn for the icons the platform masks
 * itself, where the plate has to reach the edges of the canvas instead of
 * sitting inside the pack's padding.
 */
export const MARK_BLEED = MARK_SIZE / MARK_PLATE.width;

/**
 * The mark as a standalone SVG document.
 *
 * public/favicon.svg is copied from the pack rather than written from here, so
 * the vector a browser loads is the supplied file; this is what the in-page
 * component and the tests render from.
 */
export function markSvgDocument(colors = MARK_COLORS) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${MARK_VIEWBOX}" width="${MARK_SIZE}" height="${MARK_SIZE}" role="img" aria-label="Ajani">
  <title>Ajani</title>
  <rect x="${MARK_PLATE.x}" y="${MARK_PLATE.y}" width="${MARK_PLATE.width}" height="${MARK_PLATE.height}" rx="${MARK_PLATE.rx}" fill="${colors.plate}"/>
  <g transform="translate(${MARK_PLATE.x} ${MARK_PLATE.y}) scale(${MARK_SCALE})">
    <path d="${MARK_A_PATH}" fill="${colors.letter}"/>
    <circle cx="${MASTER_DOT.cx}" cy="${MASTER_DOT.cy}" r="${MASTER_DOT.r}" fill="${colors.dot}"/>
  </g>
</svg>
`;
}
