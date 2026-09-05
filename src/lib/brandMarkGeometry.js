/*
 * The Ajani geometric brand mark, described once as plain data.
 *
 * The mark is three elements on a rounded plate:
 *   - an open "A" frame, drawn as two straight legs meeting at an apex;
 *   - a crossbar linking those legs;
 *   - the plate itself.
 *
 * The open frame reads as the "A" of Ajani; the crossbar carries the idea the
 * company is built on, separate strands of healthcare work joined into one
 * structure.
 *
 * This module is the single source of truth for that artwork. The React
 * component in components/BrandMark.jsx renders from it, and
 * scripts/generate-icons.mjs rasterises the same numbers into public/
 * favicon.svg, the PNG icons and favicon.ico. Nothing here is traced from or
 * derived from third-party artwork; every value is an original coordinate.
 */

export const MARK_SIZE = 48;
export const MARK_VIEWBOX = `0 0 ${MARK_SIZE} ${MARK_SIZE}`;

export const MARK_PLATE = { x: 0, y: 0, width: 48, height: 48, rx: 11 };

/* Vertices of the open "A", clockwise from the apex: down the outer edge of
   the right leg, across its foot, up the inner edge to the inner apex, then
   the mirror of that on the left. */
export const MARK_FRAME_POINTS = [
  [24, 8],
  [38, 38],
  [31.5, 38],
  [24, 21.4],
  [16.5, 38],
  [10, 38],
];

export const MARK_FRAME_PATH = `M${MARK_FRAME_POINTS.map(([x, y]) => `${x} ${y}`).join(' L')} Z`;

export const MARK_BAR = { x: 17.6, y: 27.6, width: 12.8, height: 3.8, rx: 1 };

/* Brand colours used when the mark is rasterised, where CSS custom properties
   are not available. These mirror the tokens in src/styles/theme.css. */
export const MARK_COLORS = {
  plate: '#0d4f4c',
  frame: '#d3a252',
  bar: '#fffdf8',
};

/**
 * The mark as a standalone SVG document.
 * Used to write public/favicon.svg so the vector icon and the in-page
 * component can never drift apart.
 */
export function markSvgDocument(colors = MARK_COLORS) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${MARK_VIEWBOX}" width="${MARK_SIZE}" height="${MARK_SIZE}" role="img" aria-label="Ajani Healthcare">
  <title>Ajani Healthcare</title>
  <rect x="${MARK_PLATE.x}" y="${MARK_PLATE.y}" width="${MARK_PLATE.width}" height="${MARK_PLATE.height}" rx="${MARK_PLATE.rx}" fill="${colors.plate}"/>
  <path d="${MARK_FRAME_PATH}" fill="${colors.frame}"/>
  <rect x="${MARK_BAR.x}" y="${MARK_BAR.y}" width="${MARK_BAR.width}" height="${MARK_BAR.height}" rx="${MARK_BAR.rx}" fill="${colors.bar}"/>
</svg>
`;
}
