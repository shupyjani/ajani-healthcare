import { describe, expect, it } from 'vitest';
import {
  activeVisit,
  canEditTasks,
  canReturnToPlanned,
  canTransition,
  demoReducer,
  filteredVisits,
  findVisit,
  initialDemoState,
  nextStatus,
  outstandingTasks,
  primaryVisit,
  progress,
  resultSummary,
  taskLockReason,
  taskProgress,
  todayVisits,
} from '../lib/demoState';

/*
 * The demonstration's rules, tested without rendering anything.
 *
 * These are the cases that would be slow and indirect to drive through the
 * interface: the status sequence in every direction, filtering combined with
 * search, and what reset actually restores.
 */

const reduce = (state, ...actions) => actions.reduce(demoReducer, state);
const statusOf = (state, id) => findVisit(state, id).status;

/* Drives a visit to completed regardless of tasks or preferences, so a case
   about something else does not have to answer dialogs on the way. */
const complete = (state, id) =>
  reduce(
    state,
    { type: 'advance-status', id, confirmed: true },
    { type: 'advance-status', id, confirmed: true },
    { type: 'advance-status', id, confirmed: true },
  );

describe('the opening round', () => {
  it('starts on 2 of 7 complete', () => {
    const { completed, total, remaining, percent } = progress(initialDemoState());

    expect(completed).toBe(2);
    expect(total).toBe(7);
    expect(remaining).toBe(5);
    expect(percent).toBe(29);
  });

  it('opens on Today with no visit drilled into', () => {
    const state = initialDemoState();

    expect(state.tab).toBe('today');
    expect(state.openVisitId).toBeNull();
    expect(state.query).toBe('');
    expect(state.filter).toBe('all');
  });

  it('has Priya Raman arrived, and she is the visit in hand', () => {
    const state = initialDemoState();

    expect(statusOf(state, 'v3')).toBe('arrived');
    expect(primaryVisit(state).name).toBe('Priya Raman');
  });

  it('has two completed and four planned around her', () => {
    const state = initialDemoState();
    const count = (status) => state.visits.filter((v) => v.status === status).length;

    expect(count('completed')).toBe(2);
    expect(count('arrived')).toBe(1);
    expect(count('planned')).toBe(4);
  });
});

describe('the status sequence', () => {
  it('runs planned, en route, arrived, completed and stops', () => {
    expect(nextStatus('planned')).toBe('en-route');
    expect(nextStatus('en-route')).toBe('arrived');
    expect(nextStatus('arrived')).toBe('completed');
    expect(nextStatus('completed')).toBeNull();
  });

  it('permits only the immediate next step', () => {
    expect(canTransition('planned', 'en-route')).toBe(true);
    /* No skipping. */
    expect(canTransition('planned', 'arrived')).toBe(false);
    expect(canTransition('planned', 'completed')).toBe(false);
    expect(canTransition('en-route', 'completed')).toBe(false);
    /* No reversing. */
    expect(canTransition('arrived', 'en-route')).toBe(false);
    expect(canTransition('completed', 'arrived')).toBe(false);
  });

  it('advances one step per action, in order', () => {
    /* Priya starts arrived, and only one visit may be active, so she is
       finished first. The sequence itself is what this case is about. */
    let state = complete(initialDemoState(), 'v3');
    expect(statusOf(state, 'v4')).toBe('planned');

    state = reduce(state, { type: 'advance-status', id: 'v4' });
    expect(statusOf(state, 'v4')).toBe('en-route');

    state = reduce(state, { type: 'advance-status', id: 'v4' });
    expect(statusOf(state, 'v4')).toBe('arrived');

    /* Confirmed, because v4's tasks are untouched and the outstanding-task
       warning is a separate rule with its own cases below. */
    state = reduce(state, { type: 'advance-status', id: 'v4', confirmed: true });
    expect(statusOf(state, 'v4')).toBe('completed');
  });

  it('cannot be advanced past completed however many times it is asked', () => {
    let state = initialDemoState();
    for (let i = 0; i < 6; i += 1) {
      state = reduce(state, { type: 'advance-status', id: 'v1' });
    }
    expect(statusOf(state, 'v1')).toBe('completed');
  });

  it('ignores an advance for a visit that does not exist', () => {
    const state = initialDemoState();
    expect(reduce(state, { type: 'advance-status', id: 'nope' })).toBe(state);
  });
});

describe('progress and the next visit', () => {
  it('both move as soon as a visit completes', () => {
    let state = initialDemoState();
    expect(progress(state).completed).toBe(2);
    expect(primaryVisit(state).id).toBe('v3');

    state = reduce(state, { type: 'advance-status', id: 'v3', confirmed: true });

    expect(progress(state).completed).toBe(3);
    expect(progress(state).percent).toBe(43);
    expect(primaryVisit(state).id).toBe('v4');
  });

  it('reports no next visit once the round is finished', () => {
    let state = initialDemoState();
    /* In order, finishing each before starting the next — which is the only
       way the round can legally be worked. */
    for (const visit of state.visits) {
      state = complete(state, visit.id);
    }

    expect(progress(state).completed).toBe(7);
    expect(progress(state).percent).toBe(100);
    expect(primaryVisit(state)).toBeNull();
  });
});

describe('search and filtering', () => {
  const search = (query) => filteredVisits(reduce(initialDemoState(), { type: 'set-query', query }));

  it('matches on name, reference and address', () => {
    expect(search('priya').map((v) => v.id)).toEqual(['v3']);
    expect(search('AV-1044').map((v) => v.id)).toEqual(['v4']);
    expect(search('Bramble').map((v) => v.id)).toEqual(['v1']);
    expect(search('SV17').map((v) => v.id)).toEqual(['v3', 'v6']);
  });

  it('ignores case and surrounding space', () => {
    expect(search('  ACHEBE ').map((v) => v.id)).toEqual(['v2']);
  });

  it('returns nothing for a term no visit carries', () => {
    expect(search('zzz')).toEqual([]);
  });

  it('filters by each of the four statuses', () => {
    const byFilter = (filter) =>
      filteredVisits(reduce(initialDemoState(), { type: 'set-filter', filter })).map((v) => v.id);

    expect(byFilter('all')).toHaveLength(7);
    expect(byFilter('completed')).toEqual(['v1', 'v2']);
    expect(byFilter('in-progress')).toEqual(['v3']);
    expect(byFilter('planned')).toEqual(['v4', 'v5', 'v6', 'v7']);
  });

  it('treats en route as in progress alongside arrived', () => {
    /* v3 is completed first, so v4 may start; the filter must then catch an
       en-route visit as readily as an arrived one. */
    const started = reduce(complete(initialDemoState(), 'v3'), {
      type: 'advance-status',
      id: 'v4',
    });
    expect(statusOf(started, 'v4')).toBe('en-route');

    const filtered = reduce(started, { type: 'set-filter', filter: 'in-progress' });
    expect(filteredVisits(filtered).map((v) => v.id)).toEqual(['v4']);
  });

  it('applies the search and the filter together', () => {
    const state = reduce(
      initialDemoState(),
      { type: 'set-query', query: 'Selby Vale' },
      { type: 'set-filter', filter: 'planned' },
    );
    expect(filteredVisits(state).map((v) => v.id)).toEqual(['v4', 'v7']);
  });

  it('summarises the result count, including when there is none', () => {
    const plain = initialDemoState();
    expect(resultSummary(plain, 7)).toBe('Showing all 7 visits');

    const narrowed = reduce(plain, { type: 'set-filter', filter: 'completed' });
    expect(resultSummary(narrowed, 2)).toBe('Showing 2 of 7 visits');
    expect(resultSummary(narrowed, 0)).toBe('No visits match this search');
  });
});

describe('tasks', () => {
  it('toggle on and off, and only the one asked for', () => {
    let state = initialDemoState();
    expect(taskProgress(findVisit(state, 'v3'))).toEqual({ done: 1, total: 3 });

    state = reduce(state, { type: 'toggle-task', visitId: 'v3', taskId: 'v3t2' });
    expect(taskProgress(findVisit(state, 'v3'))).toEqual({ done: 2, total: 3 });
    expect(findVisit(state, 'v3').tasks[2].done).toBe(false);

    state = reduce(state, { type: 'toggle-task', visitId: 'v3', taskId: 'v3t2' });
    expect(taskProgress(findVisit(state, 'v3'))).toEqual({ done: 1, total: 3 });
  });

  it('leaves other visits alone', () => {
    const state = reduce(initialDemoState(), {
      type: 'toggle-task',
      visitId: 'v3',
      taskId: 'v3t2',
    });
    expect(taskProgress(findVisit(state, 'v4'))).toEqual({ done: 0, total: 3 });
  });
});

describe('preferences change behaviour, not just their own switch', () => {
  it('hides completed visits from Today when asked', () => {
    const state = initialDemoState();
    expect(todayVisits(state)).toHaveLength(7);

    const hidden = reduce(state, {
      type: 'set-preference',
      key: 'showCompletedOnToday',
      value: false,
    });
    expect(todayVisits(hidden).map((v) => v.id)).toEqual(['v3', 'v4', 'v5', 'v6', 'v7']);

    /* The Visits screen is unaffected: the preference is about Today. */
    expect(filteredVisits(hidden)).toHaveLength(7);
  });

  it('holds a completion pending when confirmation is switched on', () => {
    let state = reduce(
      initialDemoState(),
      { type: 'set-preference', key: 'confirmBeforeCompleting', value: true },
      { type: 'toggle-task', visitId: 'v3', taskId: 'v3t2' },
      { type: 'toggle-task', visitId: 'v3', taskId: 'v3t3' },
    );

    state = reduce(state, { type: 'advance-status', id: 'v3' });
    expect(state.pendingCompletion).toEqual({ id: 'v3', reason: 'confirm', outstanding: 0 });
    expect(statusOf(state, 'v3')).toBe('arrived');

    state = reduce(state, { type: 'advance-status', id: 'v3', confirmed: true });
    expect(state.pendingCompletion).toBeNull();
    expect(statusOf(state, 'v3')).toBe('completed');
  });

  it('leaves the visit untouched when a pending completion is cancelled', () => {
    const state = reduce(
      initialDemoState(),
      { type: 'set-preference', key: 'confirmBeforeCompleting', value: true },
      { type: 'toggle-task', visitId: 'v3', taskId: 'v3t2' },
      { type: 'toggle-task', visitId: 'v3', taskId: 'v3t3' },
      { type: 'advance-status', id: 'v3' },
      { type: 'cancel-completion' },
    );

    expect(state.pendingCompletion).toBeNull();
    expect(statusOf(state, 'v3')).toBe('arrived');
  });

  it('confirms nothing before the earlier steps, only before completing', () => {
    const state = reduce(complete(initialDemoState(), 'v3'), {
      type: 'set-preference',
      key: 'confirmBeforeCompleting',
      value: true,
    });

    const started = reduce(state, { type: 'advance-status', id: 'v4' });
    expect(started.pendingCompletion).toBeNull();
    expect(statusOf(started, 'v4')).toBe('en-route');
  });
});

describe('reset', () => {
  it('restores visits, tasks, statuses, search, filter, screen and preferences', () => {
    const dirtied = reduce(
      initialDemoState(),
      { type: 'advance-status', id: 'v3' },
      { type: 'advance-status', id: 'v4' },
      { type: 'toggle-task', visitId: 'v3', taskId: 'v3t2' },
      { type: 'set-query', query: 'priya' },
      { type: 'set-filter', filter: 'completed' },
      { type: 'select-tab', tab: 'more' },
      { type: 'open-visit', id: 'v6' },
      { type: 'set-preference', key: 'showCompletedOnToday', value: false },
      { type: 'set-preference', key: 'confirmBeforeCompleting', value: true },
    );

    const reset = reduce(dirtied, { type: 'reset' });
    const fresh = initialDemoState();

    expect(reset.visits).toEqual(fresh.visits);
    expect(reset.tab).toBe('today');
    expect(reset.openVisitId).toBeNull();
    expect(reset.query).toBe('');
    expect(reset.filter).toBe('all');
    expect(reset.preferences).toEqual(fresh.preferences);
    expect(progress(reset)).toEqual(progress(fresh));
  });

  it('counts itself, so the interface can announce each one', () => {
    let state = initialDemoState();
    expect(state.resetCount).toBe(0);

    state = reduce(state, { type: 'reset' });
    expect(state.resetCount).toBe(1);

    state = reduce(state, { type: 'reset' });
    expect(state.resetCount).toBe(2);
  });

  it('does not let a mutation leak back into the initial data', () => {
    const first = reduce(initialDemoState(), {
      type: 'toggle-task',
      visitId: 'v3',
      taskId: 'v3t2',
    });
    expect(taskProgress(findVisit(first, 'v3')).done).toBe(2);

    /* A fresh state must be untouched by what the previous one did. */
    expect(taskProgress(findVisit(initialDemoState(), 'v3')).done).toBe(1);
  });
});

describe('navigation state', () => {
  it('leaves an open visit when a tab is chosen', () => {
    const state = reduce(
      initialDemoState(),
      { type: 'open-visit', id: 'v3' },
      { type: 'select-tab', tab: 'visits' },
    );

    expect(state.tab).toBe('visits');
    expect(state.openVisitId).toBeNull();
  });

  it('ignores an action it does not know', () => {
    const state = initialDemoState();
    expect(demoReducer(state, { type: 'nonsense' })).toBe(state);
  });
});

describe('completing with tasks outstanding', () => {
  it('raises a warning carrying the outstanding count, without changing anything', () => {
    /* Priya has one of three ticked, so two remain. */
    const state = reduce(initialDemoState(), { type: 'advance-status', id: 'v3' });

    expect(state.pendingCompletion).toEqual({ id: 'v3', reason: 'outstanding', outstanding: 2 });
    expect(statusOf(state, 'v3')).toBe('arrived');
    expect(progress(state).completed).toBe(2);
  });

  it('counts down as tasks are ticked, and reports one when one remains', () => {
    const nearlyDone = reduce(initialDemoState(), {
      type: 'toggle-task',
      visitId: 'v3',
      taskId: 'v3t2',
    });
    expect(outstandingTasks(findVisit(nearlyDone, 'v3'))).toBe(1);

    const warned = reduce(nearlyDone, { type: 'advance-status', id: 'v3' });
    expect(warned.pendingCompletion.outstanding).toBe(1);
  });

  it('completes when the visitor accepts the outstanding tasks', () => {
    const state = reduce(
      initialDemoState(),
      { type: 'advance-status', id: 'v3' },
      { type: 'advance-status', id: 'v3', confirmed: true },
    );

    expect(statusOf(state, 'v3')).toBe('completed');
    expect(state.pendingCompletion).toBeNull();
    /* The tasks are left as they were: declining one is legitimate. */
    expect(outstandingTasks(findVisit(state, 'v3'))).toBe(2);
  });

  it('sends the visitor to the checklist instead, leaving the visit alone', () => {
    const state = reduce(
      initialDemoState(),
      { type: 'advance-status', id: 'v3' },
      { type: 'review-tasks', id: 'v3' },
    );

    expect(state.pendingCompletion).toBeNull();
    expect(state.openVisitId).toBe('v3');
    expect(statusOf(state, 'v3')).toBe('arrived');
  });

  it('changes nothing at all when the warning is cancelled', () => {
    const before = initialDemoState();
    const after = reduce(
      before,
      { type: 'advance-status', id: 'v3' },
      { type: 'cancel-completion' },
    );

    expect(after.pendingCompletion).toBeNull();
    expect(after.visits).toEqual(before.visits);
    expect(progress(after)).toEqual(progress(before));
  });

  it('asks once, not twice, when the confirmation preference is also on', () => {
    const state = reduce(
      initialDemoState(),
      { type: 'set-preference', key: 'confirmBeforeCompleting', value: true },
      { type: 'advance-status', id: 'v3' },
    );

    /* The outstanding warning is the single question for this attempt. */
    expect(state.pendingCompletion.reason).toBe('outstanding');

    const done = reduce(state, { type: 'advance-status', id: 'v3', confirmed: true });
    expect(statusOf(done, 'v3')).toBe('completed');
    expect(done.pendingCompletion).toBeNull();
  });

  it('falls back to the plain confirmation once every task is ticked', () => {
    const state = reduce(
      initialDemoState(),
      { type: 'set-preference', key: 'confirmBeforeCompleting', value: true },
      { type: 'toggle-task', visitId: 'v3', taskId: 'v3t2' },
      { type: 'toggle-task', visitId: 'v3', taskId: 'v3t3' },
      { type: 'advance-status', id: 'v3' },
    );

    expect(state.pendingCompletion.reason).toBe('confirm');
    expect(state.pendingCompletion.outstanding).toBe(0);
  });

  it('completes immediately when every task is ticked and the preference is off', () => {
    const state = reduce(
      initialDemoState(),
      { type: 'toggle-task', visitId: 'v3', taskId: 'v3t2' },
      { type: 'toggle-task', visitId: 'v3', taskId: 'v3t3' },
      { type: 'advance-status', id: 'v3' },
    );

    expect(state.pendingCompletion).toBeNull();
    expect(statusOf(state, 'v3')).toBe('completed');
  });
});

describe('one active visit at a time', () => {
  it('starts with Priya Raman as the only active visit', () => {
    const state = initialDemoState();

    expect(activeVisit(state).id).toBe('v3');
    expect(state.visits.filter((v) => ['en-route', 'arrived'].includes(v.status))).toHaveLength(1);
  });

  it('rejects a second visit entering en route, changing neither visit', () => {
    const before = initialDemoState();
    const after = reduce(before, { type: 'advance-status', id: 'v4' });

    expect(after.blockedTransition).toEqual({ attemptedId: 'v4', activeId: 'v3' });
    expect(after.visits).toEqual(before.visits);
    expect(statusOf(after, 'v4')).toBe('planned');
    expect(statusOf(after, 'v3')).toBe('arrived');
  });

  it('rejects it just the same when the active visit is en route rather than arrived', () => {
    const enRoute = reduce(complete(initialDemoState(), 'v3'), {
      type: 'advance-status',
      id: 'v4',
    });
    expect(statusOf(enRoute, 'v4')).toBe('en-route');

    const blocked = reduce(enRoute, { type: 'advance-status', id: 'v5' });
    expect(blocked.blockedTransition).toEqual({ attemptedId: 'v5', activeId: 'v4' });
    expect(statusOf(blocked, 'v5')).toBe('planned');
  });

  it('names the active visit so the interface can say which it is', () => {
    const blocked = reduce(initialDemoState(), { type: 'advance-status', id: 'v4' });
    expect(findVisit(blocked, blocked.blockedTransition.activeId).name).toBe('Priya Raman');
  });

  it('opens the active visit on request, and clears the block', () => {
    const state = reduce(
      initialDemoState(),
      { type: 'advance-status', id: 'v4' },
      { type: 'open-active-visit' },
    );

    expect(state.openVisitId).toBe('v3');
    expect(state.blockedTransition).toBeNull();
    expect(statusOf(state, 'v4')).toBe('planned');
  });

  it('dismisses the block without touching a visit', () => {
    const before = initialDemoState();
    const after = reduce(
      before,
      { type: 'advance-status', id: 'v4' },
      { type: 'dismiss-block' },
    );

    expect(after.blockedTransition).toBeNull();
    expect(after.visits).toEqual(before.visits);
  });

  it('never interrupts the active visit to make room', () => {
    const blocked = reduce(initialDemoState(), { type: 'advance-status', id: 'v4' });

    /* Not completed, not paused, not replaced. */
    expect(statusOf(blocked, 'v3')).toBe('arrived');
    expect(activeVisit(blocked).id).toBe('v3');
  });

  it('lets the active visit finish its own sequence unhindered', () => {
    let state = initialDemoState();
    state = reduce(state, { type: 'advance-status', id: 'v3', confirmed: true });
    expect(statusOf(state, 'v3')).toBe('completed');
    expect(activeVisit(state)).toBeNull();
  });

  it('releases the next visit once the active one is completed', () => {
    const freed = reduce(complete(initialDemoState(), 'v3'), {
      type: 'advance-status',
      id: 'v4',
    });

    expect(freed.blockedTransition).toBeNull();
    expect(statusOf(freed, 'v4')).toBe('en-route');
    expect(activeVisit(freed).id).toBe('v4');
  });

  it('restores the single active visit on reset', () => {
    const state = reduce(
      complete(initialDemoState(), 'v3'),
      { type: 'advance-status', id: 'v4' },
      { type: 'reset' },
    );

    expect(activeVisit(state).id).toBe('v3');
    expect(statusOf(state, 'v4')).toBe('planned');
    expect(state.blockedTransition).toBeNull();
    expect(state.pendingCompletion).toBeNull();
  });
});

describe('en route may be returned to planned', () => {
  /* v3 completed frees the round, then v4 is started. */
  const enRoute = (state = initialDemoState()) =>
    reduce(complete(state, 'v3'), { type: 'advance-status', id: 'v4' });

  it('is the only status the dedicated action accepts', () => {
    const state = enRoute();

    expect(canReturnToPlanned(findVisit(state, 'v4'))).toBe(true);
    expect(canReturnToPlanned(findVisit(state, 'v3'))).toBe(false); /* completed */
    expect(canReturnToPlanned(findVisit(state, 'v5'))).toBe(false); /* planned */
    expect(canReturnToPlanned(findVisit(initialDemoState(), 'v3'))).toBe(false); /* arrived */
  });

  it('moves an en route visit back, and nothing else about it', () => {
    const before = enRoute();
    const after = reduce(before, { type: 'return-to-planned', id: 'v4' });

    expect(statusOf(after, 'v4')).toBe('planned');

    /* Every other field survives, tasks included. */
    const { status: _wasStatus, ...restBefore } = findVisit(before, 'v4');
    const { status: _isStatus, ...restAfter } = findVisit(after, 'v4');
    expect(restAfter).toEqual(restBefore);
    expect(taskProgress(findVisit(after, 'v4'))).toEqual(taskProgress(findVisit(before, 'v4')));
  });

  it('refuses arrived, completed and planned outright', () => {
    const arrived = initialDemoState(); /* v3 arrived */
    expect(demoReducer(arrived, { type: 'return-to-planned', id: 'v3' })).toBe(arrived);

    const completed = complete(initialDemoState(), 'v3');
    expect(demoReducer(completed, { type: 'return-to-planned', id: 'v3' })).toBe(completed);

    const planned = initialDemoState();
    expect(demoReducer(planned, { type: 'return-to-planned', id: 'v5' })).toBe(planned);
  });

  it('does not loosen the forward rule it sits beside', () => {
    /* canTransition stays strictly forward: the reversal is a separate action,
       not a relaxation of the sequence. */
    expect(canTransition('en-route', 'planned')).toBe(false);
    expect(canTransition('arrived', 'en-route')).toBe(false);
    expect(canTransition('completed', 'arrived')).toBe(false);
    expect(canTransition('planned', 'en-route')).toBe(true);
    expect(canTransition('en-route', 'arrived')).toBe(true);
    expect(canTransition('arrived', 'completed')).toBe(true);
  });

  it('releases the active lock, so another visit may start', () => {
    let state = enRoute();
    expect(activeVisit(state).id).toBe('v4');

    /* Blocked while v4 holds the lock. */
    expect(reduce(state, { type: 'advance-status', id: 'v5' }).blockedTransition).toEqual({
      attemptedId: 'v5',
      activeId: 'v4',
    });

    state = reduce(state, { type: 'return-to-planned', id: 'v4' });
    expect(activeVisit(state)).toBeNull();

    state = reduce(state, { type: 'advance-status', id: 'v5' });
    expect(state.blockedTransition).toBeNull();
    expect(statusOf(state, 'v5')).toBe('en-route');
  });

  it('recomputes Today, the filters and the counts consistently', () => {
    const state = reduce(enRoute(), { type: 'return-to-planned', id: 'v4' });

    /* v3 is complete, so the next visit in hand is v4 again — now planned. */
    expect(primaryVisit(state).id).toBe('v4');
    expect(progress(state)).toEqual({ completed: 3, total: 7, remaining: 4, percent: 43 });

    const planned = reduce(state, { type: 'set-filter', filter: 'planned' });
    expect(filteredVisits(planned).map((v) => v.id)).toEqual(['v4', 'v5', 'v6', 'v7']);

    const inProgress = reduce(state, { type: 'set-filter', filter: 'in-progress' });
    expect(filteredVisits(inProgress)).toEqual([]);
  });

  it('announces what happened', () => {
    const state = reduce(enRoute(), { type: 'return-to-planned', id: 'v4' });
    expect(state.announcement).toBe('Ivor Bankole returned to Planned. No visit is active.');
  });

  it('changes nothing while the question is only pending', () => {
    const before = enRoute();
    const asked = reduce(before, { type: 'request-return', id: 'v4' });

    expect(asked.pendingReturnId).toBe('v4');
    expect(asked.visits).toEqual(before.visits);

    const cancelled = reduce(asked, { type: 'cancel-return' });
    expect(cancelled.pendingReturnId).toBeNull();
    expect(cancelled.visits).toEqual(before.visits);
    expect(statusOf(cancelled, 'v4')).toBe('en-route');
  });

  it('is unaffected by the completion-confirmation preference', () => {
    const withPref = reduce(enRoute(), {
      type: 'set-preference',
      key: 'confirmBeforeCompleting',
      value: true,
    });

    const returned = reduce(withPref, { type: 'return-to-planned', id: 'v4' });
    expect(statusOf(returned, 'v4')).toBe('planned');
    expect(returned.pendingCompletion).toBeNull();
  });

  it('is undone by reset like everything else', () => {
    const state = reduce(
      enRoute(),
      { type: 'return-to-planned', id: 'v4' },
      { type: 'reset' },
    );

    expect(statusOf(state, 'v4')).toBe('planned');
    expect(activeVisit(state).id).toBe('v3');
    expect(state.pendingReturnId).toBeNull();
  });
});

describe('the Today primary visit', () => {
  const freeRound = () => complete(initialDemoState(), 'v3');

  it('is the active visit whenever there is one', () => {
    /* On load Priya is arrived, and two completed visits sit before her. */
    expect(primaryVisit(initialDemoState()).id).toBe('v3');
  });

  it('prefers the active visit over an earlier planned one', () => {
    /*
     * The reported bug. With v3 finished, v4 is the earliest planned; starting
     * v5 out of order must move the card to v5, not leave it on v4.
     */
    const state = reduce(freeRound(), { type: 'advance-status', id: 'v5' });

    expect(statusOf(state, 'v5')).toBe('en-route');
    expect(statusOf(state, 'v4')).toBe('planned');
    expect(primaryVisit(state).name).toBe('Halina Nowak');
  });

  it('prefers an arrived visit over an earlier planned one too', () => {
    const state = reduce(
      freeRound(),
      { type: 'advance-status', id: 'v5' },
      { type: 'advance-status', id: 'v5' },
    );

    expect(statusOf(state, 'v5')).toBe('arrived');
    expect(primaryVisit(state).id).toBe('v5');
  });

  it('falls back to the earliest planned visit when none is active', () => {
    const state = freeRound();
    expect(activeVisit(state)).toBeNull();
    expect(primaryVisit(state).id).toBe('v4');
  });

  it('returns to the earliest planned visit when the active one is released', () => {
    const started = reduce(freeRound(), { type: 'advance-status', id: 'v5' });
    expect(primaryVisit(started).id).toBe('v5');

    const released = reduce(started, { type: 'return-to-planned', id: 'v5' });

    /* v4 is earlier than v5, so the card goes back to Ivor. */
    expect(activeVisit(released)).toBeNull();
    expect(primaryVisit(released).id).toBe('v4');
    expect(statusOf(released, 'v5')).toBe('planned');
  });

  it('never names a completed visit', () => {
    expect(primaryVisit(freeRound()).status).not.toBe('completed');
  });

  it('is null only once every visit is completed', () => {
    let state = initialDemoState();
    for (const visit of state.visits) {
      state = complete(state, visit.id);
    }
    expect(primaryVisit(state)).toBeNull();
  });
});

describe('tasks may only be recorded on arrival', () => {
  const freeRound = () => complete(initialDemoState(), 'v3');

  it('permits editing for an arrived visit only', () => {
    const state = initialDemoState();
    expect(canEditTasks(findVisit(state, 'v3'))).toBe(true); /* arrived */
    expect(canEditTasks(findVisit(state, 'v4'))).toBe(false); /* planned */
    expect(canEditTasks(findVisit(state, 'v1'))).toBe(false); /* completed */

    const enRoute = reduce(freeRound(), { type: 'advance-status', id: 'v4' });
    expect(canEditTasks(findVisit(enRoute, 'v4'))).toBe(false);
  });

  it('still toggles for an arrived visit', () => {
    const state = reduce(initialDemoState(), {
      type: 'toggle-task',
      visitId: 'v3',
      taskId: 'v3t2',
    });
    expect(taskProgress(findVisit(state, 'v3'))).toEqual({ done: 2, total: 3 });
  });

  it('returns the identical state object for a planned visit', () => {
    const state = initialDemoState();
    /* Identity, not equality: nothing is rebuilt and nothing re-renders. */
    expect(demoReducer(state, { type: 'toggle-task', visitId: 'v4', taskId: 'v4t1' })).toBe(state);
  });

  it('returns the identical state object for an en route visit', () => {
    const state = reduce(freeRound(), { type: 'advance-status', id: 'v4' });
    expect(statusOf(state, 'v4')).toBe('en-route');
    expect(demoReducer(state, { type: 'toggle-task', visitId: 'v4', taskId: 'v4t1' })).toBe(state);
  });

  it('returns the identical state object for a completed visit', () => {
    const state = initialDemoState();
    expect(statusOf(state, 'v1')).toBe('completed');
    expect(demoReducer(state, { type: 'toggle-task', visitId: 'v1', taskId: 'v1t1' })).toBe(state);
  });

  it('returns the identical state object for a visit that does not exist', () => {
    const state = initialDemoState();
    expect(demoReducer(state, { type: 'toggle-task', visitId: 'nope', taskId: 'x' })).toBe(state);
  });

  it('explains why a checklist is locked, in the words the interface uses', () => {
    const state = initialDemoState();
    expect(taskLockReason(findVisit(state, 'v3'))).toBeNull();
    expect(taskLockReason(findVisit(state, 'v4'))).toBe(
      'Task completion becomes available after arrival.',
    );
    expect(taskLockReason(findVisit(state, 'v1'))).toBe(
      'This completed visit’s checklist is read-only.',
    );

    const enRoute = reduce(freeRound(), { type: 'advance-status', id: 'v4' });
    expect(taskLockReason(findVisit(enRoute, 'v4'))).toBe(
      'Task completion becomes available after arrival.',
    );
  });

  it('keeps the outstanding-task warning working for an arrived visit', () => {
    const state = reduce(initialDemoState(), { type: 'advance-status', id: 'v3' });
    expect(state.pendingCompletion).toEqual({ id: 'v3', reason: 'outstanding', outstanding: 2 });
  });

  it('does not clear or alter task information when en route returns to planned', () => {
    /* Arrive, record a task, then go back out to en route is impossible — so
       the case that matters is a visit started and released with whatever it
       already carried. */
    const started = reduce(freeRound(), { type: 'advance-status', id: 'v4' });
    const before = findVisit(started, 'v4').tasks;

    const released = reduce(started, { type: 'return-to-planned', id: 'v4' });
    expect(findVisit(released, 'v4').tasks).toEqual(before);
    expect(taskProgress(findVisit(released, 'v4'))).toEqual({ done: 0, total: 3 });
  });

  it('preserves ticks recorded on arrival when the visit is completed', () => {
    const state = reduce(
      initialDemoState(),
      { type: 'toggle-task', visitId: 'v3', taskId: 'v3t2' },
      { type: 'advance-status', id: 'v3', confirmed: true },
    );

    expect(statusOf(state, 'v3')).toBe('completed');
    expect(taskProgress(findVisit(state, 'v3'))).toEqual({ done: 2, total: 3 });
    /* And they are now frozen. */
    expect(demoReducer(state, { type: 'toggle-task', visitId: 'v3', taskId: 'v3t3' })).toBe(state);
  });
});
