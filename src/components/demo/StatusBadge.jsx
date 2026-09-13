import React from 'react';
import { STATUS_LABELS } from '../../lib/demoState';
import { CancelGlyph, CheckGlyph, PinGlyph, RouteGlyph } from './demoIcons';

/*
 * A visit's status.
 *
 * Three signals, always together: the word, a shape, and a colour. The colour
 * is the one a reader can least rely on, so it is never the only difference —
 * Completed carries a tick, Cancelled a crossed circle, En route an arrow,
 * Arrived a pin, and Planned a hollow dot.
 */
const GLYPHS = {
  completed: CheckGlyph,
  cancelled: CancelGlyph,
  arrived: PinGlyph,
  'en-route': RouteGlyph,
};

function StatusBadge({ status }) {
  const Glyph = GLYPHS[status];

  return (
    <span className={`demo-badge demo-badge--${status}`}>
      {Glyph ? <Glyph /> : <span className="demo-badge-dot" aria-hidden="true" />}
      {STATUS_LABELS[status]}
    </span>
  );
}

export default StatusBadge;
