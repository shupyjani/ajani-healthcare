import React, { useCallback, useEffect, useRef } from 'react';
import PhoneFrame from '../PhoneFrame';
import DemoTabBar from './DemoTabBar';
import TodayScreen from './TodayScreen';
import VisitsScreen from './VisitsScreen';
import MoreScreen from './MoreScreen';
import VisitDetailScreen from './VisitDetailScreen';
import ConfirmDialog from './ConfirmDialog';
import { activeVisit, findVisit, openVisit } from '../../lib/demoState';
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
  const lastOpenedId = useRef(null);
  const restoreFocusId = useRef(null);
  const detail = openVisit(state);
  const dialog = describeDialog(state);

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

  const onAdvance = useCallback((id) => dispatch({ type: 'advance-status', id }), [dispatch]);

  return (
    <div className="demo-app">
      <PhoneFrame className="demo-phone">
        <div className="demo-screen">
          <div
            className="demo-screen-scroll"
            id={PANEL_ID}
            role="tabpanel"
            aria-labelledby={`demo-tab-${state.tab}`}
            tabIndex={-1}
          >
            {detail ? (
              <VisitDetailScreen
                visit={detail}
                onBack={onBack}
                onToggleTask={(visitId, taskId) =>
                  dispatch({ type: 'toggle-task', visitId, taskId })
                }
                onAdvance={onAdvance}
                onRequestReturn={(id) => dispatch({ type: 'request-return', id })}
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
