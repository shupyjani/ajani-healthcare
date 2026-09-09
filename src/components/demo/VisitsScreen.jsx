import React from 'react';
import VisitRow from './VisitRow';
import { FILTERS, filteredVisits, resultSummary } from '../../lib/demoState';
import { SearchGlyph } from './demoIcons';

/*
 * Visits: the whole round, narrowed by search or status.
 *
 * The filters are a radiogroup rather than a row of buttons, because exactly
 * one is active at a time and that is what a screen reader should be told.
 * The result count is a live region, so filtering announces its own outcome
 * instead of changing the list silently.
 */
function VisitsScreen({ state, onOpen, onQuery, onFilter, registerRow }) {
  const visits = filteredVisits(state);
  const summary = resultSummary(state, visits.length);

  return (
    <div className="demo-screen-body">
      <h3 className="demo-screen-title">Visits</h3>

      <div className="demo-search">
        <label className="visually-hidden" htmlFor="demo-search-field">
          Search visits by name, visit reference or address
        </label>
        <span className="demo-search-glyph" aria-hidden="true">
          <SearchGlyph />
        </span>
        <input
          id="demo-search-field"
          className="demo-search-field"
          type="search"
          value={state.query}
          placeholder="Search name, visit reference or address"
          onChange={(event) => onQuery(event.target.value)}
        />
      </div>

      <div className="demo-filters" role="radiogroup" aria-label="Filter visits by status">
        {FILTERS.map(({ id, label }) => {
          const checked = state.filter === id;
          return (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={checked}
              className={`demo-filter${checked ? ' is-active' : ''}`}
              onClick={() => onFilter(id)}
            >
              {label}
            </button>
          );
        })}
      </div>

      <p className="demo-result-count" role="status">
        {summary}
      </p>

      {visits.length === 0 ? (
        <div className="demo-empty">
          <p className="demo-empty-title">Nothing to show</p>
          <p className="demo-empty-detail">
            No visit on this round matches that search and filter. Clear the search or choose
            All to see the full schedule.
          </p>
        </div>
      ) : (
        <ul className="demo-rows">
          {visits.map((visit) => (
            <VisitRow
              key={visit.id}
              visit={visit}
              onOpen={onOpen}
              ref={(node) => registerRow(visit.id, node)}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

export default VisitsScreen;
