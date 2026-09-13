import React from 'react';
import StatusBadge from './StatusBadge';
import VisitRow from './VisitRow';
import {
  ADVANCE_LABELS,
  isInProgress,
  primaryVisit,
  progress,
  progressPhrases,
  progressSummary,
  todayVisits,
} from '../../lib/demoState';
import { PRACTITIONER, SHIFT } from '../../lib/demoVisits';
import { ClockGlyph, PinGlyph, RouteGlyph } from './demoIcons';

/*
 * Today: the shape of the shift, the visit in hand, and the schedule.
 *
 * The progress figure is a bar, a percentage and a plain count together, so
 * the state of the round reads without being decoded — and the bar itself is
 * a progressbar with a value, not a decorated div.
 */
function TodayScreen({ state, onOpen, onAdvance, registerRow }) {
  const { resolved, total, percent } = progress(state);
  const current = primaryVisit(state);
  const schedule = todayVisits(state);

  return (
    <div className="demo-screen-body">
      <h3 className="demo-screen-title">Today</h3>

      <section className="demo-card" aria-labelledby="demo-shift-heading">
        <div className="demo-shift-head">
          <div>
            <h4 id="demo-shift-heading" className="demo-shift-greeting">
              {SHIFT.greeting}
            </h4>
            <p className="demo-shift-date">{SHIFT.date}</p>
          </div>
          <span className="demo-avatar" aria-hidden="true">
            {PRACTITIONER.initials}
          </span>
        </div>

        <dl className="demo-metrics">
          <div className="demo-metric">
            <dt>
              <ClockGlyph /> Shift
            </dt>
            <dd>{SHIFT.hours}</dd>
          </div>
          <div className="demo-metric">
            <dt>
              <RouteGlyph /> Round
            </dt>
            <dd>{PRACTITIONER.round}</dd>
          </div>
        </dl>

        <div className="demo-progress-head">
          <span className="demo-progress-label">Shift progress</span>
          <span className="demo-progress-value">{percent}%</span>
        </div>
        <div
          className="demo-progress-track"
          role="progressbar"
          aria-valuenow={resolved}
          aria-valuemin={0}
          aria-valuemax={total}
          aria-label={`Shift progress, ${progressSummary(state)}`}
        >
          <span className="demo-progress-fill" style={{ width: `${percent}%` }} />
        </div>
        {/*
          One span per phrase, each held together by white-space: nowrap, with
          the separators as ordinary text between them. Wrapping can therefore
          only happen at a dot, never between a number and the word it counts.
          The paragraph's text is still the whole sentence, so what a screen
          reader announces is unchanged.
        */}
        <p className="demo-progress-count">
          {progressPhrases(state).map((phrase, index) => (
            <React.Fragment key={phrase}>
              {index > 0 && ' · '}
              <span className="demo-progress-phrase">{phrase}</span>
            </React.Fragment>
          ))}
        </p>
      </section>

      {current ? (
        <section className="demo-card" aria-labelledby="demo-current-heading">
          <div className="demo-current-head">
            <p className="demo-current-label">
              {isInProgress(current.status) ? 'In progress' : 'Next visit'}
            </p>
            <StatusBadge status={current.status} />
          </div>

          <h4 id="demo-current-heading" className="demo-current-name">
            {current.name}
          </h4>
          <p className="demo-current-type">
            {current.type}
            {current.priority && <span className="demo-tag-priority">Priority</span>}
          </p>

          <dl className="demo-detail-list">
            <div className="demo-detail-row">
              <dt>
                <ClockGlyph /> Scheduled
              </dt>
              <dd>
                {current.start}–{current.end} · {current.duration}
              </dd>
            </div>
            <div className="demo-detail-row">
              <dt>
                <PinGlyph /> Address
              </dt>
              <dd>
                {current.address}, {current.district} {current.postcode}
              </dd>
            </div>
          </dl>

          <div className="demo-actions">
            <button
              type="button"
              className="demo-button demo-button--primary"
              onClick={() => onAdvance(current.id)}
            >
              {ADVANCE_LABELS[current.status]}
            </button>
            <button
              type="button"
              className="demo-button demo-button--quiet"
              onClick={() => onOpen(current.id)}
            >
              Open visit
            </button>
          </div>
        </section>
      ) : (
        <section className="demo-card demo-card--done">
          <h4 className="demo-current-name">Round complete</h4>
          <p className="demo-empty-detail">
            Nothing is left waiting on this round of {total} visits.
          </p>
        </section>
      )}

      <section aria-labelledby="demo-schedule-heading">
        <div className="demo-section-head">
          <h4 id="demo-schedule-heading" className="demo-section-title">
            Schedule
          </h4>
          <span className="demo-section-meta">
            {schedule.length} {schedule.length === 1 ? 'visit' : 'visits'}
          </span>
        </div>

        {schedule.length === 0 ? (
          <p className="demo-empty-detail">
            Completed visits are hidden. Turn them back on under More.
          </p>
        ) : (
          <ul className="demo-rows">
            {schedule.map((visit) => (
              <VisitRow
                key={visit.id}
                visit={visit}
                onOpen={onOpen}
                ref={(node) => registerRow(visit.id, node)}
              />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

export default TodayScreen;
