import React, { useEffect, useRef } from 'react';

/*
 * The completion confirmation.
 *
 * A real modal: role="dialog" with aria-modal, named by its own heading and
 * described by its body. Focus moves in when it opens and back to whatever
 * opened it when it closes, Escape cancels, and Tab is kept inside — otherwise
 * a keyboard user would tab straight out into a phone they cannot currently
 * act on.
 *
 * Keys are handled through a document listener rather than a JSX onKeyDown,
 * the same way the site header handles Escape. A listener bound to the dialog
 * element would be a keyboard handler on a non-interactive node, and it would
 * miss any key pressed before focus had settled inside.
 */
function ConfirmDialog({
  title,
  body,
  cancelLabel,
  confirmLabel,
  onConfirm,
  onCancel,
  /*
   * What Escape does, when that is not what the secondary button does.
   * "Review tasks" navigates to a checklist, which is the right thing for a
   * deliberate press and the wrong thing for a dismissal — Escape must leave
   * the demo exactly as it found it.
   */
  onDismiss = onCancel,
}) {
  const dialogRef = useRef(null);
  const confirmRef = useRef(null);
  /* Whatever had focus when the dialog opened, so it can be handed back. */
  const openerRef = useRef(null);

  useEffect(() => {
    openerRef.current = document.activeElement;
    confirmRef.current?.focus();

    return () => {
      const opener = openerRef.current;
      if (opener && opener.isConnected && typeof opener.focus === 'function') {
        opener.focus();
      }
    };
  }, []);

  useEffect(() => {
    function onKeyDown(event) {
      if (event.key === 'Escape') {
        event.preventDefault();
        onDismiss();
        return;
      }

      if (event.key !== 'Tab') return;

      const focusable = dialogRef.current?.querySelectorAll('button');
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

  return (
    <div className="demo-dialog-layer">
      <div className="demo-dialog-scrim" />
      <div
        className="demo-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="demo-dialog-title"
        aria-describedby="demo-dialog-body"
        ref={dialogRef}
      >
        <h4 className="demo-dialog-title" id="demo-dialog-title">
          {title}
        </h4>
        <p className="demo-dialog-body" id="demo-dialog-body">
          {body}
        </p>
        <div className="demo-dialog-actions">
          <button type="button" className="demo-button demo-button--quiet" onClick={onCancel}>
            {cancelLabel}
          </button>
          <button
            type="button"
            className="demo-button demo-button--primary"
            ref={confirmRef}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ConfirmDialog;
