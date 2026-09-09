import React from 'react';
import { TABS } from '../../lib/demoState';
import { MoreGlyph, TodayGlyph, VisitsGlyph } from './demoIcons';

const GLYPHS = { today: TodayGlyph, visits: VisitsGlyph, more: MoreGlyph };

/*
 * The app's three tabs.
 *
 * Built as an ARIA tablist so selection is exposed rather than only drawn:
 * each control reports aria-selected and points at the panel it governs, and
 * the arrow keys move between them the way a tab set should. The active tab is
 * marked by weight and a filled mark as well as by colour.
 */
function DemoTabBar({ tab, panelId, onSelect }) {
  function onKeyDown(event) {
    const index = TABS.findIndex((item) => item.id === tab);
    if (index === -1) return;

    let target = null;
    if (event.key === 'ArrowRight') target = TABS[(index + 1) % TABS.length];
    if (event.key === 'ArrowLeft') target = TABS[(index - 1 + TABS.length) % TABS.length];
    if (event.key === 'Home') [target] = TABS;
    if (event.key === 'End') target = TABS[TABS.length - 1];
    if (!target) return;

    event.preventDefault();
    onSelect(target.id);
  }

  return (
    <div className="demo-tabbar" role="tablist" aria-label="Ajani Mobile sections">
      {TABS.map(({ id, label }) => {
        const Glyph = GLYPHS[id];
        const selected = tab === id;

        return (
          <button
            key={id}
            type="button"
            role="tab"
            id={`demo-tab-${id}`}
            aria-selected={selected}
            aria-controls={panelId}
            tabIndex={selected ? 0 : -1}
            className={`demo-tab${selected ? ' is-selected' : ''}`}
            onClick={() => onSelect(id)}
            onKeyDown={onKeyDown}
          >
            <Glyph />
            <span className="demo-tab-label">{label}</span>
          </button>
        );
      })}
    </div>
  );
}

export default DemoTabBar;
