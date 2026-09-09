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
 * State is in memory only: there is no storage, no request, no service and no
 * account behind any of it, and a reload starts the round again.
 *
 * The companion panel carries everything that is about the demo rather than in
 * it — the introduction, some journeys worth trying, the reset, and the way
 * back to the case study — which keeps that furniture off the phone itself.
 */
/*
 * One connected run through the demonstration rather than five unrelated
 * things to poke at: finish a visit, find one, discover the round only allows
 * one active visit, resequence it, then change how the app behaves.
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
    id: 'search',
    lead: 'Search and filter.',
    body: (
      <>
        Search for <b className="demo-try-ui">“Ivor”</b> by name,{' '}
        <b className="demo-try-ui">“Bramble”</b> by address or{' '}
        <b className="demo-try-ui">“AV-1044”</b> by visit reference, then select{' '}
        <b className="demo-try-ui">“Planned”</b>.
      </>
    ),
  },
  {
    id: 'active',
    lead: 'Keep one visit active.',
    body: (
      <>
        Start travelling to Ivor Bankole, then try to start Halina Nowak. The app will keep
        Ivor active and offer to take you back to his visit.
      </>
    ),
  },
  {
    id: 'priorities',
    lead: 'Change priorities.',
    body: (
      <>
        In Ivor’s visit, choose <b className="demo-try-ui">“Return to Planned”</b>, then start
        travelling to Halina instead.
      </>
    ),
  },
  {
    id: 'preferences',
    lead: 'Adjust preferences.',
    body: (
      <>
        Under <b className="demo-try-ui">“More”</b>, show or hide completed visits and turn
        completion confirmation on.
      </>
    ),
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

        {/* The one statement of what this is. Said once, at the top, where a
            reader meets the demo — and nowhere else on the page. */}
        <Reveal as="p" className="demo-page-lede" variant="up" order={2}>
          Explore a browser-based recreation of selected Ajani Mobile journeys. The native
          iPhone application is built in SwiftUI.
        </Reveal>

        {/*
          Three siblings, laid out on desktop as two rows with the phone
          spanning both: the cue beside the phone's top, the card filling the
          rest of the column beneath it. In source order — cue, phone, card —
          which is also the order they stack in, so nothing needs reordering
          for a narrow screen.
        */}
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
          </Reveal>

          <div className="demo-stage">
            <DemoPhone state={state} dispatch={dispatch} />
          </div>

          <Reveal as="aside" className="demo-companion" variant="up" order={4}>
            <section aria-labelledby="demo-try-heading">
              <h2 id="demo-try-heading" className="demo-companion-title">
                Journeys to try
              </h2>
              <ol className="demo-try-list">
                {JOURNEYS.map(({ id, lead, body }) => (
                  <li key={id}>
                    <b className="demo-try-lead">{lead}</b> {body}
                  </li>
                ))}
              </ol>
            </section>

            <div className="demo-companion-actions">
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
              <p className="demo-reset-status" role="status">
                {state.announcement ?? ''}
              </p>
            </div>

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
