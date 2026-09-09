import React, { forwardRef } from 'react';
import StatusBadge from './StatusBadge';
import { PinGlyph } from './demoIcons';

/*
 * One visit in a list.
 *
 * A real <button>, not a tappable div: it is operable from the keyboard, it
 * announces itself as a button, and its accessible name names the person and
 * the time rather than reading the whole card out.
 */
const VisitRow = forwardRef(function VisitRow({ visit, onOpen }, ref) {
  return (
    <li className="demo-row-item">
      <button
        type="button"
        ref={ref}
        className="demo-row"
        onClick={() => onOpen(visit.id)}
      >
        <span className="demo-row-head">
          <span className="demo-row-time">
            {visit.start}–{visit.end}
          </span>
          <StatusBadge status={visit.status} />
        </span>

        <span className="demo-row-name">{visit.name}</span>

        <span className="demo-row-type">
          {visit.type}
          {visit.priority && <span className="demo-tag-priority">Priority</span>}
        </span>

        <span className="demo-row-address">
          <PinGlyph />
          {visit.address}, {visit.district} {visit.postcode}
        </span>
      </button>
    </li>
  );
});

export default VisitRow;
