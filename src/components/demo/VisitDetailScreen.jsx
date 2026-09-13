import React, { useEffect, useRef } from 'react';
import StatusBadge from './StatusBadge';
import {
  ADVANCE_LABELS,
  STATUS_ORDER,
  canCancel,
  canEditTasks,
  canReturnToPlanned,
  taskLockReason,
  taskProgress,
} from '../../lib/demoState';
import {
  BackGlyph,
  CancelGlyph,
  ClockGlyph,
  PinGlyph,
  ReferenceGlyph,
  RouteGlyph,
} from './demoIcons';

/*
 * One visit in full.
 *
 * A drill-down, not a tab, so it gets a real back control rather than being
 * folded into the tab set. Focus moves to the screen heading on open — without
 * that a keyboard user's next Tab would resume from the header of the page
 * rather than from the screen they just opened — and the caller restores focus
 * to the row they came from when it closes.
 */
function VisitDetailScreen({
  visit,
  onBack,
  onToggleTask,
  onAdvance,
  onRequestReturn,
  onRequestCancel,
}) {
  const headingRef = useRef(null);
  const actionRef = useRef(null);
  const { done, total } = taskProgress(visit);
  const tasksEditable = canEditTasks(visit);
  const lockReason = taskLockReason(visit);
  const advanceLabel = ADVANCE_LABELS[visit.status];
  const step = STATUS_ORDER.indexOf(visit.status) + 1;

  useEffect(() => {
    headingRef.current?.focus();
    // visit.id is a re-run trigger, not a value the effect body reads: it is
    // what moves focus again when one detail screen replaces another.
    // oxlint-disable-next-line react/exhaustive-effect-dependencies
  }, [visit.id]);

  /*
   * Recover focus when a status change removes the control that had it.
   * Returning to Planned takes away the "Return to Planned" button the dialog
   * was opened from, so restoring focus to it is impossible and the browser
   * would leave focus on <body>. Only fires when focus was genuinely lost, so
   * ordinary progression — where the primary button is reused and keeps focus
   * — is untouched.
   */
  useEffect(() => {
    if (document.activeElement === document.body) {
      actionRef.current?.focus();
    }
    // visit.status is the trigger: the effect reacts to the change, it does
    // not read the value.
    // oxlint-disable-next-line react/exhaustive-effect-dependencies
  }, [visit.status]);

  return (
    <div className="demo-screen-body">
      <div className="demo-detail-bar">
        <button type="button" className="demo-back" onClick={onBack}>
          <BackGlyph />
          <span className="visually-hidden">Back to the visit list</span>
        </button>
        <h3 className="demo-screen-title demo-screen-title--detail" tabIndex={-1} ref={headingRef}>
          {visit.name}
        </h3>
      </div>

      <section className="demo-card" aria-labelledby="demo-visit-summary">
        <div className="demo-current-head">
          <p className="demo-current-label" id="demo-visit-summary">
            Visit
          </p>
          <StatusBadge status={visit.status} />
        </div>

        <p className="demo-current-type">
          {visit.type}
          {visit.priority && <span className="demo-tag-priority">Priority</span>}
        </p>

        <dl className="demo-detail-list">
          <div className="demo-detail-row">
            <dt>
              <ReferenceGlyph /> Visit reference
            </dt>
            <dd>{visit.reference}</dd>
          </div>
          <div className="demo-detail-row">
            <dt>
              <ClockGlyph /> Scheduled
            </dt>
            <dd>
              {visit.start}–{visit.end} · {visit.duration}
            </dd>
          </div>
          <div className="demo-detail-row">
            <dt>
              <RouteGlyph /> Travel
            </dt>
            <dd>{visit.travel} from the previous call</dd>
          </div>
          <div className="demo-detail-row">
            <dt>
              <PinGlyph /> Location
            </dt>
            <dd>
              {visit.address}
              <br />
              {visit.district}
              <br />
              {visit.postcode}
            </dd>
          </div>
        </dl>
      </section>

      {visit.cancellation && (
        <section className="demo-card demo-card--cancelled" aria-labelledby="demo-cancelled-heading">
          <h4 className="demo-section-title" id="demo-cancelled-heading">
            Cancellation
          </h4>
          <dl className="demo-detail-list">
            <div className="demo-detail-row">
              <dt>
                <CancelGlyph /> Reason
              </dt>
              <dd>{visit.cancellation.reason}</dd>
            </div>
            {visit.cancellation.note && (
              <div className="demo-detail-row">
                <dt>
                  <ReferenceGlyph /> Note
                </dt>
                <dd>{visit.cancellation.note}</dd>
              </div>
            )}
          </dl>
        </section>
      )}

      <section className="demo-card" aria-labelledby="demo-tasks-heading">
        <div className="demo-section-head">
          <h4 id="demo-tasks-heading" className="demo-section-title">
            Tasks
          </h4>
          <span className="demo-section-meta">
            {done} of {total} done
          </span>
        </div>

        {/* Stated in words, not signalled by colour: the disabled attribute
            carries it to assistive technology and this carries it to everyone
            else. Tied to each control by aria-describedby so it is heard when
            the control is reached, not only when the card is. */}
        {lockReason && (
          <p className="demo-task-lock" id="demo-task-lock">
            {lockReason}
          </p>
        )}

        <ul className="demo-tasks">
          {visit.tasks.map((task) => (
            <li className="demo-task" key={task.id}>
              <input
                id={`demo-task-${task.id}`}
                className="demo-task-check"
                type="checkbox"
                checked={task.done}
                disabled={!tasksEditable}
                aria-describedby={
                  [task.hint ? `demo-task-${task.id}-hint` : null, lockReason ? 'demo-task-lock' : null]
                    .filter(Boolean)
                    .join(' ') || undefined
                }
                onChange={() => onToggleTask(visit.id, task.id)}
              />
              <label className="demo-task-label" htmlFor={`demo-task-${task.id}`}>
                {task.label}
              </label>
              {task.hint && (
                <p className="demo-task-hint" id={`demo-task-${task.id}-hint`}>
                  {task.hint}
                </p>
              )}
            </li>
          ))}
        </ul>
      </section>

      {visit.notes.length > 0 && (
        <section className="demo-card" aria-labelledby="demo-notes-heading">
          <h4 id="demo-notes-heading" className="demo-section-title">
            Operational notes
          </h4>
          <ul className="demo-notes">
            {visit.notes.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
        </section>
      )}

      <div className="demo-actions demo-actions--stacked">
        {advanceLabel ? (
          <button
            type="button"
            ref={actionRef}
            className="demo-button demo-button--primary"
            onClick={() => onAdvance(visit.id)}
          >
            {advanceLabel}
          </button>
        ) : (
          visit.status === 'completed' && (
            <p className="demo-complete-note">
              This visit is complete. Its status cannot be changed again.
            </p>
          )
        )}
        {/* The one way back: a practitioner redirected before they arrive.
            Secondary throughout — the primary action is still to carry on. */}
        {canReturnToPlanned(visit) && (
          <button
            type="button"
            className="demo-button demo-button--quiet"
            onClick={() => onRequestReturn(visit.id)}
          >
            Return to Planned
          </button>
        )}

        {/* Cancelling is available while a visit is still ahead of the
            practitioner — planned or en route — and never once they have
            arrived or the record is closed. Secondary throughout. */}
        {canCancel(visit) && (
          <button
            type="button"
            className="demo-button demo-button--quiet"
            onClick={() => onRequestCancel(visit.id)}
          >
            Cancel visit
          </button>
        )}

        {visit.status === 'cancelled' ? (
          <p className="demo-step-note">This visit was cancelled and is now closed.</p>
        ) : (
          <p className="demo-step-note">
            Step {step} of {STATUS_ORDER.length} in the visit sequence.
          </p>
        )}
      </div>
    </div>
  );
}

export default VisitDetailScreen;
