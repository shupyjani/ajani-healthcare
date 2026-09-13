import React, { useEffect, useRef, useState } from 'react';
import {
  ASSISTANT_DISCLOSURE,
  ASSISTANT_WELCOME,
  FALLBACK_NOTICE,
  SUGGESTED_QUESTIONS,
} from '../../lib/assistantFallback';
import { ASSISTANT_MESSAGE_LIMIT } from '../../lib/demoState';
import { BackGlyph } from './demoIcons';

/*
 * The assistant, as a screen inside the phone.
 *
 * A drill-down like the visit detail, reached from More and closed by the same
 * back control — not a fourth tab, so Today, Visits and More are untouched.
 *
 * Everything it says is rendered as text. There is no dangerouslySetInnerHTML
 * anywhere in this file and no path by which a reply becomes markup, which is
 * what makes a model response safe to display without sanitising it.
 */
function AssistantScreen({ assistant, onBack, onAsk }) {
  const headingRef = useRef(null);
  const logRef = useRef(null);
  const [draft, setDraft] = useState('');

  const busy = assistant.status === 'thinking';
  const failed = assistant.status === 'error';
  const latestReply = [...assistant.messages].reverse().find(message => message.role === 'assistant');

  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  /* Keep the newest exchange in view without stealing focus from the input. */
  useEffect(() => {
    const log = logRef.current;
    if (log) log.scrollTop = log.scrollHeight;
    // Both are re-run triggers rather than values the effect body reads: a new
    // message or a change of status is what should bring the log to its end.
    // oxlint-disable-next-line react/exhaustive-effect-dependencies
  }, [assistant.messages.length, assistant.status]);

  function submit(event) {
    event.preventDefault();
    const asked = draft.trim();
    if (asked === '' || busy) return;
    setDraft('');
    onAsk(asked);
  }

  return (
    <div className="demo-screen-body">
      <div className="demo-detail-bar">
        <button type="button" className="demo-back" onClick={onBack}>
          <BackGlyph />
          <span className="visually-hidden">Back to More</span>
        </button>
        <h3 className="demo-screen-title demo-screen-title--detail" tabIndex={-1} ref={headingRef}>
          Ajani Assistant
        </h3>
      </div>

      {/* Said once, at the top, before anything is asked. */}
      <p className="demo-assistant-disclosure">{ASSISTANT_DISCLOSURE}</p>

      {latestReply && (
        <p className="demo-assistant-source" role="status" aria-label="Latest reply source">
          {latestReply.mode === 'live' ? 'AI response' : FALLBACK_NOTICE}
        </p>
      )}

      <div
        className="demo-assistant-log"
        ref={logRef}
        role="log"
        aria-label="Assistant conversation"
        aria-busy={busy}
      >
        {assistant.messages.length === 0 ? (
          <p className="demo-assistant-welcome">{ASSISTANT_WELCOME}</p>
        ) : (
          <ul className="demo-assistant-messages">
            {assistant.messages.map((message) => (
              <li
                key={message.id}
                className={`demo-assistant-message demo-assistant-message--${message.role}`}
              >
                <span className="demo-assistant-role">
                  {message.role === 'user' ? 'You' : `Assistant · ${message.mode === 'live' ? 'AI response' : FALLBACK_NOTICE}`}
                </span>
                <span className="demo-assistant-text">{message.text}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* One region for every state the exchange can be in, so a screen reader
          hears the same thing the screen shows. */}
      <p className="demo-assistant-status" role="status">
        {busy ? 'Finding an answer…' : ''}
        {failed ? 'That did not work. Try asking again.' : ''}
      </p>

      <section aria-labelledby="demo-assistant-suggested">
        <h4 className="demo-section-title" id="demo-assistant-suggested">
          Try asking
        </h4>
        <ul className="demo-assistant-suggestions">
          {SUGGESTED_QUESTIONS.map((question) => (
            <li key={question}>
              <button
                type="button"
                className="demo-suggestion"
                disabled={busy}
                onClick={() => onAsk(question)}
              >
                {question}
              </button>
            </li>
          ))}
        </ul>
      </section>

      <form className="demo-assistant-form" onSubmit={submit}>
        <label className="demo-field-label" htmlFor="demo-assistant-input">
          Ask your own question
        </label>
        <div className="demo-assistant-entry">
          <input
            id="demo-assistant-input"
            className="demo-assistant-input"
            type="text"
            value={draft}
            maxLength={ASSISTANT_MESSAGE_LIMIT}
            autoComplete="off"
            placeholder="Ask about the round"
            onChange={(event) => setDraft(event.target.value)}
          />
          {/* Disabled while empty, so an empty question cannot be submitted. */}
          <button
            type="submit"
            className="demo-button demo-button--primary demo-assistant-send"
            disabled={busy || draft.trim() === ''}
          >
            Send
          </button>
        </div>
      </form>
    </div>
  );
}

export default AssistantScreen;
