import React, { useCallback, useEffect, useRef } from 'react';
import PhoneFrame from '../PhoneFrame';
import DemoTabBar from './DemoTabBar';
import TodayScreen from './TodayScreen';
import VisitsScreen from './VisitsScreen';
import MoreScreen from './MoreScreen';
import VisitDetailScreen from './VisitDetailScreen';
import ConfirmDialog from './ConfirmDialog';
import CancelVisitDialog from './CancelVisitDialog';
import AssistantScreen from './AssistantScreen';
import { activeVisit, demoReducer, findVisit, openVisit } from '../../lib/demoState';
import { askAssistant } from '../../lib/askAssistant';
import './DemoPhone.css';

const PANEL_ID = 'demo-panel';

/*
 * Which question the phone is asking, if any.
 *
 * Kept as one description built from state rather than three conditional
 * dialogs in the tree: the reducer has already decided that at most one of
 * them applies, so the view only has to say it. That is also what guarantees
 * the outstanding-task warning and the confirmation preference can never
 * stack into two dialogs for one tap.
 */
function describeDialog(state) {
  if (state.blockedTransition) {
    const active = activeVisit(state);
    const attempted = findVisit(state, state.blockedTransition.attemptedId);
    if (!active) return null;

    return {
      title: `${active.name} is still active`,
      body:
        `Only one visit can be active at a time. Complete ${active.name}’s visit `
        + `before starting ${attempted ? attempted.name : 'another'}.`,
      cancelLabel: 'Stay here',
      confirmLabel: 'Open active visit',
      cancel: { type: 'dismiss-block' },
      dismiss: { type: 'dismiss-block' },
      confirm: { type: 'open-active-visit' },
    };
  }

  /*
   * Asked before releasing an active visit. Deliberately independent of the
   * completion-confirmation preference: that preference is about finishing a
   * visit, and this is about undoing a start.
   */
  if (state.pendingReturnId) {
    const visit = findVisit(state, state.pendingReturnId);
    if (!visit) return null;

    return {
      title: `Return ${visit.name} to Planned?`,
      body: 'This will release the active visit so another visit can be started.',
      cancelLabel: 'Keep En route',
      confirmLabel: 'Return to Planned',
      cancel: { type: 'cancel-return' },
      dismiss: { type: 'cancel-return' },
      confirm: { type: 'return-to-planned', id: visit.id },
    };
  }

  const pending = state.pendingCompletion;
  if (!pending) return null;

  const visit = findVisit(state, pending.id);
  if (!visit) return null;

  if (pending.reason === 'outstanding') {
    const n = pending.outstanding;
    const one = n === 1;

    return {
      title: `${n} task${one ? '' : 's'} ${one ? 'is' : 'are'} still outstanding`,
      body:
        `Review the checklist for ${visit.name}, or complete this visit with `
        + `${one ? 'that task' : 'those tasks'} outstanding.`,
      cancelLabel: 'Review tasks',
      confirmLabel: `Complete with ${one ? 'task' : 'tasks'} outstanding`,
      cancel: { type: 'review-tasks', id: visit.id },
      /* Escape backs out entirely rather than opening the checklist. */
      dismiss: { type: 'cancel-completion' },
      confirm: { type: 'advance-status', id: visit.id, confirmed: true },
    };
  }

  return {
    title: 'Complete this visit?',
    body: `${visit.name}, ${visit.start}–${visit.end}. Once a visit is completed its status cannot be changed again.`,
    cancelLabel: 'Cancel',
    confirmLabel: 'Complete visit',
    cancel: { type: 'cancel-completion' },
    dismiss: { type: 'cancel-completion' },
    confirm: { type: 'advance-status', id: visit.id, confirmed: true },
  };
}

/*
 * The simulated application inside the phone.
 *
 * This component wires state to screens and owns exactly two pieces of
 * interface state that are not domain state: which row was last opened, so
 * focus can be returned to it, and the pending completion the dialog is for.
 * Everything else is read from the reducer in lib/demoState.js.
 *
 * The phone hardware comes from the shared PhoneFrame and is decorative
 * throughout. The application inside it is not: the tab bar is a real tablist,
 * the rows are buttons, the switches are checkboxes, and each screen is a
 * labelled tabpanel. Nothing here is collapsed into a single element.
 */
function DemoPhone({ state, dispatch }) {
  /* id -> row node, so closing a detail can return focus where it came from. */
  const rowRefs = useRef(new Map());
  const panelRef = useRef(null);
  /* Read inside the async ask handler, never during render. Kept current in an
     effect rather than assigned while rendering, so a re-render cannot observe
     a half-written ref. */
  const stateRef = useRef(state);
  const lastOpenedId = useRef(null);
  const restoreFocusId = useRef(null);
  const detail = openVisit(state);
  const dialog = describeDialog(state);
  const cancelling = state.pendingCancelId ? findVisit(state, state.pendingCancelId) : null;

  const onOpen = useCallback(
    (id) => {
      lastOpenedId.current = id;
      dispatch({ type: 'open-visit', id });
    },
    [dispatch],
  );

  /* Screens register their rows through this rather than being handed the Map,
     so the ref is only ever touched inside a callback and never read while
     rendering. */
  const registerRow = useCallback((id, node) => {
    if (node) rowRefs.current.set(id, node);
    else rowRefs.current.delete(id);
  }, []);

  const onBack = useCallback(() => {
    restoreFocusId.current = lastOpenedId.current;
    dispatch({ type: 'close-visit' });
  }, [dispatch]);

  /*
   * Returning focus to the row that opened the detail, once the list it lives
   * in has rendered again. Done in an effect rather than in the handler
   * because the row does not exist at the moment Back is pressed.
   *
   * "Where practical" is the honest caveat: the row is gone if the visit was
   * just completed and the Today preference hides finished calls. The tab bar
   * is the fallback, so focus always lands somewhere sensible and never on
   * the removed node or the document body.
   */
  useEffect(() => {
    if (detail || !restoreFocusId.current) return;

    const id = restoreFocusId.current;
    restoreFocusId.current = null;

    const row = rowRefs.current.get(id);
    if (row && row.isConnected) {
      row.focus();
      return;
    }
    document.getElementById(`demo-tab-${state.tab}`)?.focus();
  }, [detail, state.tab]);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  /*
   * A new screen starts at the top.
   *
   * The panel is one scrolling box shared by every screen, so without this a
   * reader who had scrolled down through a long assistant conversation would
   * arrive at Today already scrolled past the shift summary.
   */
  const screenKey = `${state.tab}|${state.openVisitId ?? ''}|${state.assistant.open}`;
  useEffect(() => {
    if (panelRef.current) panelRef.current.scrollTop = 0;
    // screenKey is a re-run trigger, not a value the effect body reads.
    // oxlint-disable-next-line react/exhaustive-effect-dependencies
  }, [screenKey]);

  const onAdvance = useCallback((id) => dispatch({ type: 'advance-status', id }), [dispatch]);

  /*
   * One question, one answer.
   *
   * The state passed to askAssistant is the snapshot it reads from; the only
   * thing dispatched back is the conversation. No branch of this can change a
   * visit, a task or a preference.
   */
  const onAsk = useCallback(
    (question) => {
      const current = stateRef.current;
      const pending = demoReducer(current, { type: 'assistant-ask', question });
      if (pending === current) return;
      stateRef.current = pending;
      dispatch({ type: 'assistant-ask', question });

      /*
       * The id this ask will carry, so the reply can be matched to it.
       *
       * Only one question is ever in flight — the form and the suggestions are
       * both disabled while the assistant is thinking — so the next id is the
       * current one plus one. A reply that arrives after a Reset, or after a
       * newer question, no longer matches and the reducer drops it.
       */
      const requestId = pending.assistant.requestId;

      askAssistant(question, current)
        .then(({ text, mode, context }) => dispatch({ type: 'assistant-reply', text, mode, context, requestId }))
        .catch(() => dispatch({ type: 'assistant-error', requestId }));
    },
    [dispatch],
  );

  return (
    <div className="demo-app">
      <PhoneFrame className="demo-phone">
        <div className="demo-screen">
          <div
            className="demo-screen-scroll"
            ref={panelRef}
            id={PANEL_ID}
            role="tabpanel"
            aria-labelledby={`demo-tab-${state.tab}`}
            tabIndex={-1}
          >
            {state.assistant.open ? (
              <AssistantScreen
                assistant={state.assistant}
                onBack={() => {
                  dispatch({ type: 'close-assistant' });
                  window.requestAnimationFrame(() =>
                    document.getElementById(`demo-tab-${state.tab}`)?.focus(),
                  );
                }}
                onAsk={onAsk}
              />
            ) : detail ? (
              <VisitDetailScreen
                visit={detail}
                onBack={onBack}
                onToggleTask={(visitId, taskId) =>
                  dispatch({ type: 'toggle-task', visitId, taskId })
                }
                onAdvance={onAdvance}
                onRequestReturn={(id) => dispatch({ type: 'request-return', id })}
                onRequestCancel={(id) => dispatch({ type: 'request-cancel', id })}
              />
            ) : (
              <>
                {state.tab === 'today' && (
                  <TodayScreen
                    state={state}
                    onOpen={onOpen}
                    onAdvance={onAdvance}
                    registerRow={registerRow}
                  />
                )}
                {state.tab === 'visits' && (
                  <VisitsScreen
                    state={state}
                    onOpen={onOpen}
                    onQuery={(query) => dispatch({ type: 'set-query', query })}
                    onFilter={(filter) => dispatch({ type: 'set-filter', filter })}
                    registerRow={registerRow}
                  />
                )}
                {state.tab === 'more' && (
                  <MoreScreen
                    state={state}
                    onPreference={(key, value) =>
                      dispatch({ type: 'set-preference', key, value })
                    }
                    onOpenAssistant={() => dispatch({ type: 'open-assistant' })}
                  />
                )}
              </>
            )}
          </div>

          <DemoTabBar
            tab={state.tab}
            panelId={PANEL_ID}
            onSelect={(tab) => dispatch({ type: 'select-tab', tab })}
          />

          {cancelling && (
            <CancelVisitDialog
              visit={cancelling}
              onConfirm={({ reason, note }) =>
                dispatch({ type: 'cancel-visit', id: cancelling.id, reason, note })
              }
              onDismiss={() => dispatch({ type: 'dismiss-cancel' })}
            />
          )}

          {dialog && (
            <ConfirmDialog
              title={dialog.title}
              body={dialog.body}
              cancelLabel={dialog.cancelLabel}
              confirmLabel={dialog.confirmLabel}
              onConfirm={() => dispatch(dialog.confirm)}
              onCancel={() => dispatch(dialog.cancel)}
              onDismiss={() => dispatch(dialog.dismiss)}
            />
          )}
        </div>
      </PhoneFrame>
    </div>
  );
}

export default DemoPhone;
