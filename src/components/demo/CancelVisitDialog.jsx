import React, { useEffect, useId, useRef, useState } from 'react';
import { CANCELLATION_NOTE_LIMIT, CANCELLATION_REASONS, validateCancellation } from '../../lib/demoState';

/*
 * Cancelling a visit.
 *
 * The other dialogs in this demo ask a yes/no question and are served by
 * ConfirmDialog. This one collects a reason and an optional note, so it is its
 * own component — but it follows exactly the same modal conventions: a real
 * role="dialog" with aria-modal, named by its heading, focus moved in on open
 * and handed back on close, Tab kept inside, Escape dismissing without
 * changing anything, and the phone behind it marked inert.
 *
 * Validation is not duplicated here. The sentence comes from the same
 * validateCancellation the reducer uses, so the dialog cannot allow something
 * the reducer would refuse, or refuse something it would allow.
 */
function CancelVisitDialog({ visit, onConfirm, onDismiss }) {
  const dialogRef = useRef(null);
  const firstFieldRef = useRef(null);
  const errorRef = useRef(null);
  const openerRef = useRef(null);
  const fieldId = useId();

  const [reason, setReason] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState(null);

  const noteRequired = reason === 'Other';

  useEffect(() => {
    openerRef.current = document.activeElement;
    firstFieldRef.current?.focus();

    return () => {
      const opener = openerRef.current;
      if (opener && opener.isConnected && typeof opener.focus === 'function') {
        opener.focus();
      }
    };
  }, []);

  /* Escape and the focus trap, on the document rather than the dialog node:
     the same arrangement the site header uses, and it catches a key pressed
     before focus has settled inside. */
  useEffect(() => {
    function onKeyDown(event) {
      if (event.key === 'Escape') {
        event.preventDefault();
        onDismiss();
        return;
      }

      if (event.key !== 'Tab') return;

      const focusable = dialogRef.current?.querySelectorAll(
        'button, [href], input, textarea, select',
      );
      if (!focusable || focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onDismiss]);

  function onSubmit(event) {
    event.preventDefault();

    const problem = validateCancellation({ reason, note });
    if (problem) {
      setError(problem);
      /* Move to the message rather than leaving the reader at the button. */
      window.requestAnimationFrame(() => errorRef.current?.focus());
      return;
    }

    setError(null);
    onConfirm({ reason, note });
  }

  return (
    <div className="demo-dialog-layer">
      <div className="demo-dialog-scrim" />
      <div
        className="demo-dialog demo-dialog--form"
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${fieldId}-title`}
        ref={dialogRef}
      >
        <h4 className="demo-dialog-title" id={`${fieldId}-title`}>
          Cancel visit for {visit.name}?
        </h4>

        <form onSubmit={onSubmit} noValidate>
          {error && (
            <p
              className="demo-dialog-error"
              role="alert"
              tabIndex={-1}
              ref={errorRef}
              id={`${fieldId}-error`}
            >
              {error}
            </p>
          )}

          <fieldset className="demo-fieldset">
            <legend className="demo-legend">Reason</legend>
            {CANCELLATION_REASONS.map((option, index) => (
              <label className="demo-choice" key={option} htmlFor={`${fieldId}-${index}`}>
                <input
                  id={`${fieldId}-${index}`}
                  type="radio"
                  name={`${fieldId}-reason`}
                  value={option}
                  checked={reason === option}
                  ref={index === 0 ? firstFieldRef : undefined}
                  onChange={() => {
                    setReason(option);
                    setError(null);
                  }}
                />
                <span>{option}</span>
              </label>
            ))}
          </fieldset>

          <label className="demo-field-label" htmlFor={`${fieldId}-note`}>
            Operational note{noteRequired ? '' : ' (optional)'}
          </label>
          <textarea
            id={`${fieldId}-note`}
            className="demo-note-field"
            rows={2}
            value={note}
            maxLength={CANCELLATION_NOTE_LIMIT}
            required={noteRequired}
            aria-describedby={`${fieldId}-note-hint`}
            onChange={(event) => {
              setNote(event.target.value);
              setError(null);
            }}
          />
          <p className="demo-field-hint" id={`${fieldId}-note-hint`}>
            {noteRequired
              ? `Required for “Other”. Up to ${CANCELLATION_NOTE_LIMIT} characters.`
              : `Up to ${CANCELLATION_NOTE_LIMIT} characters.`}
          </p>

          <div className="demo-dialog-actions">
            <button type="button" className="demo-button demo-button--quiet" onClick={onDismiss}>
              Keep visit
            </button>
            <button type="submit" className="demo-button demo-button--danger">
              Cancel visit
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default CancelVisitDialog;
