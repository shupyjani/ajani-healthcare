import React, { useReducer, useRef } from 'react';
import { Link } from 'react-router-dom';
import DemoPhone from '../demo/DemoPhone';
import Reveal from '../Reveal';
import { ExternalLinkIcon } from '../icons';
import { demoReducer, initialDemoState } from '../../lib/demoState';
import { AJANI_MOBILE_ROUTE, FIELD_OPERATIONS_REPO_URL } from '../../lib/site';
import { useDocumentTitle } from '../../lib/useDocumentTitle';
import './AjaniMobileDemo.css';

/*
 * The Ajani Mobile interactive demonstration.
 *
 * All of the demo's state lives in one reducer here and is passed down, so the
 * phone's screens stay presentational and the rules stay in lib/demoState.js.
 * Round state is in memory only and a reload starts it again. The optional
 * assistant transport receives a read-only snapshot.
 *
 * The companion panel carries everything that is about the demo rather than in
 * it — the introduction, some journeys worth trying, and the way
 * back to the case study — which keeps that furniture off the phone itself.
 */
/*
 * One connected run through the demonstration rather than five unrelated
 * things to poke at: complete a visit, change the active visit, cancel it,
 * then ask about the updated round and follow up on a task.
 *
 * Emphasis is carried by weight first and colour second — the lead phrases are
 * bold as well as teal, and the quoted interface labels are bold alone — so
 * nothing here depends on colour being perceived. None of it is a control.
 */
const JOURNEYS = [
  {
    id: 'complete',
    lead: 'Complete a visit.',
    body: (
      <>
        Open Priya Raman, complete her remaining tasks, then complete the visit and watch
        progress move from <b className="demo-try-count">2 of 7</b> to{' '}
        <b className="demo-try-count">3 of 7</b>.
      </>
    ),
  },
  {
    id: 'priorities',
    lead: 'Change priorities.',
    body: <>Search for <b className="demo-try-ui">“Ivor”</b> in Visits and start travelling. Choose <b className="demo-try-ui">“Return to Planned”</b>, then start travelling to Halina instead.</>,
  },
  {
    id: 'cancel',
    lead: 'Cancel a visit.',
    body: <>Open Halina’s visit, choose <b className="demo-try-ui">“Cancel visit”</b> and select <b className="demo-try-ui">“Family cancelled”</b>. Confirm the cancellation and check the updated progress.</>,
  },
  {
    id: 'round',
    lead: 'Ask about the round.',
    body: <>Under <b className="demo-try-ui">“More”</b>, open <b className="demo-try-ui">“Ajani Assistant”</b> and ask <b className="demo-try-ui">“How many visits are left?”</b> or <b className="demo-try-ui">“Which visits are cancelled?”</b></>,
  },
  {
    id: 'follow-up',
    lead: 'Follow up on a task.',
    body: <>Ask <b className="demo-try-ui">“Does anyone have a walking task?”</b>, then <b className="demo-try-ui">“Has that task been completed?”</b> to check its current state.</>,
  },
];

function AjaniMobileDemo() {
  useDocumentTitle('Ajani Mobile interactive demo | Ajani Healthcare');

  const [state, dispatch] = useReducer(demoReducer, undefined, initialDemoState);
  const resetRef = useRef(null);

  function onReset() {
    dispatch({ type: 'reset' });
    resetRef.current?.focus();
  }

  return (
    <main id="main-content" tabIndex={-1} className="demo-page">
      <div className="container">
        <Reveal as="p" className="eyebrow" variant="label">
          Ajani Field Operations
        </Reveal>
        <Reveal
          as="h1"
          id="demo-heading"
          className="demo-page-title"
          variant="headline"
          order={1}
        >
          Ajani Mobile interactive demo
        </Reveal>

        <div className="demo-layout">
          <Reveal className="demo-cue" variant="up" order={3}>
            {/* A heading, not decoration: it names the region the phone sits
                in, which is what keeps the outline contiguous between the page
                h1 and the app's own screen titles. Styled exactly as the
                eyebrow it replaces. */}
            <h2 className="eyebrow">Interactive preview</h2>
            <p className="demo-cue-line">
              Use the controls inside the phone to explore the round.
            </p>
            <p className="demo-cue-line">The assistant answers questions about the fictional round. When live AI is unavailable, built-in guidance provides responses.</p>
          </Reveal>

          <div className="demo-stage">
            <DemoPhone state={state} dispatch={dispatch} />
          </div>

          <div className="demo-phone-controls">
            <button
              type="button"
              className="btn btn--primary"
              ref={resetRef}
              onClick={onReset}
            >
              Reset demo
            </button>

            {/*
              One live region for anything the demo changes without the
              reader watching: a reset, or a visit released back to Planned.
              The reducer writes the sentence, so what is announced and what
              happened cannot drift apart.
            */}
            <span className="demo-action-label" id="demo-action-label">Latest action</span>
            {/* Named by the visible label rather than by a duplicate of it, so
                the region has one name and one source of truth. */}
            <p className="demo-reset-status" role="status" aria-labelledby="demo-action-label">
              {state.announcement ?? ''}
            </p>
          </div>

          <Reveal as="p" className="demo-page-lede" variant="up" order={2}>
            Explore a browser-based recreation of selected Ajani Mobile journeys. The native
            iPhone application is built in SwiftUI.
          </Reveal>

          <Reveal as="aside" className="demo-companion" variant="up" order={4}>
            <section aria-labelledby="demo-try-heading">
              <h2 id="demo-try-heading" className="demo-companion-title">
                Journeys to try
              </h2>
              <ol className="demo-try-list">
                {JOURNEYS.map(({ id, lead, body }) => (
                  <li key={id}>
                    <div className="demo-try-text"><b className="demo-try-lead">{lead}</b>{' '}{body}</div>
                  </li>
                ))}
              </ol>
            </section>

            <div className="demo-companion-links">
              <Link className="btn btn--outline" to={AJANI_MOBILE_ROUTE}>
                Back to the case study
              </Link>
              <a
                className="btn btn--outline external-link"
                href={FIELD_OPERATIONS_REPO_URL}
                target="_blank"
                rel="noopener noreferrer"
              >
                View native repository
                <ExternalLinkIcon />
                <span className="visually-hidden">(opens in a new tab)</span>
              </a>
            </div>
          </Reveal>
        </div>
      </div>
    </main>
  );
}

export default AjaniMobileDemo;
