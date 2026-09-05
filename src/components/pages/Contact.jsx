import React, { useReducer, useRef } from 'react';
import { FIELDS, INITIAL_STATE, formReducer, toPayload, validate } from '../../lib/contactForm';
import { getEmailConfig } from '../../lib/emailConfig';
import { sendEnquiry } from '../../lib/sendEnquiry';
import { CONTACT_EMAIL } from '../../lib/site';
import './Contact.css';

/*
 * Contact route.
 *
 * The form is rendered from the FIELDS descriptor list in lib/contactForm.js
 * and all of its state lives in a single reducer, so this component contains
 * no per-field state and no per-field markup. Validation, the payload shape
 * and the state machine are unit-testable without rendering anything.
 */
function Contact() {
  const [state, dispatch] = useReducer(formReducer, INITIAL_STATE);
  const { isConfigured } = getEmailConfig();
  const errorSummaryRef = useRef(null);

  const isSending = state.status === 'sending';

  async function handleSubmit(event) {
    event.preventDefault();

    const errors = validate(state.values);
    if (Object.keys(errors).length > 0) {
      dispatch({ type: 'invalid', errors });
      /* Move the user to the summary rather than leaving them at the button. */
      window.requestAnimationFrame(() => errorSummaryRef.current?.focus());
      return;
    }

    dispatch({ type: 'sending' });

    try {
      await sendEnquiry(toPayload(state.values));
      dispatch({ type: 'sent' });
    } catch {
      dispatch({ type: 'failed' });
    }
  }

  return (
    <main id="main-content" tabIndex={-1} className="contact-main">
      <div className="container contact-inner">
        <div className="contact-intro">
          <p className="eyebrow">Contact</p>
          <h1 className="contact-heading">Tell us what you are working through</h1>
          <p className="section-intro">
            Whether it is a workforce pressure, an operational bottleneck or a digital service
            that needs shaping, send us the outline and we will come back to you.
          </p>
          <p className="contact-note">
            Please do not include patient-identifiable information in this form.
          </p>
        </div>

        <form className="contact-form" onSubmit={handleSubmit} noValidate>
          <h2 className="contact-form-heading">Send an enquiry</h2>

          {state.status === 'invalid' && (
            <div
              className="form-status form-status--error"
              role="alert"
              tabIndex={-1}
              ref={errorSummaryRef}
            >
              <p className="form-status-title">Your enquiry has not been sent</p>
              <ul className="form-status-list">
                {FIELDS.filter((field) => state.errors[field.name]).map((field) => (
                  <li key={field.name}>
                    <a href={`#contact-${field.name}`}>{state.errors[field.name]}</a>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {state.status === 'error' && (
            <div className="form-status form-status--error" role="alert">
              <p className="form-status-title">Your enquiry could not be sent</p>
              <p className="form-status-body">
                Something went wrong on the way to our inbox. Please try again in a moment.
              </p>
            </div>
          )}

          {state.status === 'sent' && (
            <div className="form-status form-status--success" role="status">
              <p className="form-status-title">Thank you, your enquiry has been sent</p>
              <p className="form-status-body">
                We have received your message and will reply to the email address you gave.
              </p>
            </div>
          )}

          {/* No email provider configured for this build. The form stays on the
              page but cannot send, so the reader is given a route that works
              rather than a dead end. Nothing here suggests anything was sent. */}
          {!isConfigured && (
            <div className="form-status form-status--error" role="alert">
              <p className="form-status-title">The online form is temporarily unavailable</p>
              <p className="form-status-body">
                You can email{' '}
                <a className="form-status-link" href={`mailto:${CONTACT_EMAIL}`}>
                  {CONTACT_EMAIL}
                </a>{' '}
                instead. Nothing typed into the form below will be sent while it is
                unavailable.
              </p>
            </div>
          )}

          {FIELDS.map((field) => {
            const id = `contact-${field.name}`;
            const errorId = `${id}-error`;
            const hintId = `${id}-hint`;
            const error = state.errors[field.name];
            const describedBy = [error ? errorId : null, field.hint ? hintId : null]
              .filter(Boolean)
              .join(' ');

            const shared = {
              id,
              name: field.name,
              value: state.values[field.name],
              required: field.required,
              autoComplete: field.autoComplete,
              'aria-invalid': error ? 'true' : undefined,
              'aria-describedby': describedBy || undefined,
              onChange: (event) =>
                dispatch({ type: 'edit', field: field.name, value: event.target.value }),
            };

            return (
              <div className="form-field" key={field.name}>
                <label className="form-label" htmlFor={id}>
                  {field.label}
                  {field.required && (
                    <span className="form-required" aria-hidden="true">
                      {' '}
                      *
                    </span>
                  )}
                </label>

                {field.hint && (
                  <p className="form-hint" id={hintId}>
                    {field.hint}
                  </p>
                )}

                {field.type === 'textarea' ? (
                  <textarea className="form-control" rows={field.rows} {...shared} />
                ) : (
                  <input className="form-control" type={field.type} {...shared} />
                )}

                {error && (
                  <p className="form-error" id={errorId}>
                    {error}
                  </p>
                )}
              </div>
            );
          })}

          <p className="form-legend">
            <span aria-hidden="true">*</span> Required fields.
          </p>

          <button
            type="submit"
            className="btn btn--primary contact-submit"
            disabled={isSending || !isConfigured}
          >
            {isSending ? 'Sending your enquiry…' : 'Send enquiry'}
          </button>
        </form>
      </div>
    </main>
  );
}

export default Contact;
