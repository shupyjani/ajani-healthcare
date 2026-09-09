import { INITIAL_PREFERENCES, INITIAL_VISITS } from './demoVisits';

/*
 * The demonstration's domain rules, with no React in sight.
 *
 * Everything the interface can do to a visit passes through this reducer, and
 * everything it reads about one comes from a selector below. That split is
 * what makes the interesting parts — the status sequence, filtering, progress
 * — testable without rendering a phone, and it keeps any single component
 * from growing into the whole demo.
 */

/* A visit moves forward one step at a time and stops at completed. There is no
   action anywhere that reverses it or skips a step. */
export const STATUS_ORDER = ['planned', 'en-route', 'arrived', 'completed'];

export const STATUS_LABELS = {
  planned: 'Planned',
  'en-route': 'En route',
  arrived: 'Arrived',
  completed: 'Completed',
};

/* The label on the button that moves a visit to its next status. */
export const ADVANCE_LABELS = {
  planned: 'Start travelling',
  'en-route': 'Mark as arrived',
  arrived: 'Complete visit',
};

export const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'planned', label: 'Planned' },
  { id: 'in-progress', label: 'In progress' },
  { id: 'completed', label: 'Completed' },
];

export const TABS = [
  { id: 'today', label: 'Today' },
  { id: 'visits', label: 'Visits' },
  { id: 'more', label: 'More' },
];

/** The status that follows `status`, or null at the end of the sequence. */
export function nextStatus(status) {
  const index = STATUS_ORDER.indexOf(status);
  if (index === -1 || index === STATUS_ORDER.length - 1) return null;
  return STATUS_ORDER[index + 1];
}

/**
 * Whether a visit may move from `from` to `to`.
 *
 * Only the immediate next status is allowed. This is the single place that
 * decides it, so "no skipping" and "no reversing" are one rule rather than a
 * condition repeated on every button.
 */
export function canTransition(from, to) {
  return nextStatus(from) === to;
}

export function isInProgress(status) {
  return status === 'en-route' || status === 'arrived';
}

function clone(visits) {
  return visits.map((visit) => ({ ...visit, tasks: visit.tasks.map((task) => ({ ...task })) }));
}

export function initialDemoState() {
  return {
    visits: clone(INITIAL_VISITS),
    tab: 'today',
    openVisitId: null,
    query: '',
    filter: 'all',
    preferences: { ...INITIAL_PREFERENCES },
    /*
     * The question a completion is waiting on, or null.
     * { id, reason: 'outstanding' | 'confirm', outstanding: number }
     */
    pendingCompletion: null,
    /*
     * A rejected attempt to start a second visit, or null.
     * { attemptedId, activeId }
     */
    blockedTransition: null,
    /* The visit a return-to-planned is waiting to be confirmed for, or null. */
    pendingReturnId: null,
    /* The most recent thing worth saying out loud, or null. */
    announcement: null,
    /* Bumped by reset so the interface can announce that it happened. */
    resetCount: 0,
  };
}

function mapVisit(state, id, update) {
  return { ...state, visits: state.visits.map((v) => (v.id === id ? update(v) : v)) };
}

export function demoReducer(state, action) {
  switch (action.type) {
    case 'select-tab':
      /* Changing tab leaves any open visit behind: the tab bar is top-level
         navigation, so it should not return to a drilled-down screen. */
      return { ...state, tab: action.tab, openVisitId: null };

    case 'open-visit':
      return { ...state, openVisitId: action.id };

    case 'close-visit':
      return { ...state, openVisitId: null };

    case 'set-query':
      return { ...state, query: action.query };

    case 'set-filter':
      return { ...state, filter: action.filter };

    /*
     * Tasks may only be recorded while the practitioner is at the address.
     *
     * Ticking one from a Planned or En route visit would record work that
     * cannot have happened yet, and ticking one on a completed visit would
     * rewrite a closed record. Both are refused here rather than only in the
     * interface, so a checklist cannot be edited by any route.
     *
     * Refused means the *same* state object comes back, not an equal one:
     * nothing re-renders and nothing is quietly rebuilt.
     */
    case 'toggle-task': {
      const visit = findVisit(state, action.visitId);
      if (!visit || !canEditTasks(visit)) return state;

      return mapVisit(state, visit.id, (v) => ({
        ...v,
        tasks: v.tasks.map((task) =>
          task.id === action.taskId ? { ...task, done: !task.done } : task,
        ),
      }));
    }

    case 'set-preference':
      return {
        ...state,
        preferences: { ...state.preferences, [action.key]: action.value },
      };

    /*
     * The two guarded steps.
     *
     * Starting a visit is rejected outright while another is already active —
     * one practitioner cannot be en route to two places — and the rejection
     * lives here rather than in a disabled button, so it holds whichever
     * screen the attempt came from.
     *
     * Completing is the irreversible step, so it is the one that can pause for
     * a question. Outstanding tasks raise that question on their own, whatever
     * the preference says; the preference alone raises the plainer one. They
     * are deliberately exclusive: two dialogs in a row for a single tap is
     * worse than either.
     */
    case 'advance-status': {
      const visit = findVisit(state, action.id);
      if (!visit) return state;

      const target = nextStatus(visit.status);
      if (!target || !canTransition(visit.status, target)) return state;

      if (target === 'en-route') {
        const active = activeVisit(state);
        if (active && active.id !== visit.id) {
          return {
            ...state,
            blockedTransition: { attemptedId: visit.id, activeId: active.id },
          };
        }
      }

      if (target === 'completed' && !action.confirmed) {
        const outstanding = outstandingTasks(visit);

        if (outstanding > 0) {
          return {
            ...state,
            pendingCompletion: { id: visit.id, reason: 'outstanding', outstanding },
          };
        }

        if (state.preferences.confirmBeforeCompleting) {
          return {
            ...state,
            pendingCompletion: { id: visit.id, reason: 'confirm', outstanding: 0 },
          };
        }
      }

      return {
        ...mapVisit(state, visit.id, (v) => ({ ...v, status: target })),
        pendingCompletion: null,
      };
    }

    case 'cancel-completion':
      return { ...state, pendingCompletion: null };

    /* Leaves the question and opens the checklist it was about. */
    case 'review-tasks':
      return { ...state, pendingCompletion: null, openVisitId: action.id };

    case 'dismiss-block':
      return { ...state, blockedTransition: null };

    case 'request-return':
      return { ...state, pendingReturnId: action.id };

    case 'cancel-return':
      return { ...state, pendingReturnId: null };

    /*
     * The one operational exception to a forward-only sequence: a practitioner
     * redirected before they arrive.
     *
     * Deliberately its own action rather than a relaxation of canTransition,
     * which stays strictly forward. Nothing else may go backwards: planned has
     * nowhere to go, arrived has committed to being at the address, and
     * completed is terminal. Only en route can be undone, because only en
     * route describes something that has not happened yet.
     *
     * The visit keeps its tasks and every other field; only its status moves,
     * which is what releases the single-active lock.
     */
    case 'return-to-planned': {
      const visit = findVisit(state, action.id);
      if (!visit || visit.status !== 'en-route') return state;

      return {
        ...mapVisit(state, visit.id, (v) => ({ ...v, status: 'planned' })),
        pendingReturnId: null,
        announcement: `${visit.name} returned to Planned. No visit is active.`,
      };
    }

    case 'open-active-visit': {
      const active = activeVisit(state);
      if (!active) return { ...state, blockedTransition: null };
      return { ...state, blockedTransition: null, openVisitId: active.id };
    }

    case 'reset': {
      const fresh = initialDemoState();
      const { completed, total } = progress(fresh);

      return {
        ...fresh,
        resetCount: state.resetCount + 1,
        announcement: `Demo reset. ${completed} of ${total} visits complete, Today selected.`,
      };
    }

    default:
      return state;
  }
}

/* --- Selectors --------------------------------------------------------- */

export function findVisit(state, id) {
  return state.visits.find((visit) => visit.id === id) ?? null;
}

export function openVisit(state) {
  return state.openVisitId ? findVisit(state, state.openVisitId) : null;
}

/** Completed count, total and percentage for the shift summary. */
export function progress(state) {
  const total = state.visits.length;
  const completed = state.visits.filter((visit) => visit.status === 'completed').length;
  return {
    completed,
    total,
    remaining: total - completed,
    percent: total === 0 ? 0 : Math.round((completed / total) * 100),
  };
}

/**
 * The visit the Today card leads with.
 *
 * The visit in hand wins outright, and only if there is none does the earliest
 * remaining Planned visit take its place.
 *
 * Taking the first not-completed visit in chronological order looks equivalent
 * and is not: a practitioner who starts a later visit out of order — perfectly
 * legitimate when a round is resequenced — leaves an earlier Planned visit
 * ahead of the active one in the array, and the card then names a visit nobody
 * is on while the one they are travelling to is nowhere in sight.
 *
 * Returns null once every visit is completed, which is the round-complete case.
 */
export function primaryVisit(state) {
  return (
    activeVisit(state)
    ?? state.visits.find((visit) => visit.status === 'planned')
    ?? null
  );
}

/**
 * The visit the practitioner is currently on, if any.
 *
 * "Active" is en route or arrived: the two statuses that place one person at
 * one address. Exactly one visit may hold it, which is the invariant the
 * advance rule above enforces.
 */
export function activeVisit(state) {
  return state.visits.find((visit) => isInProgress(visit.status)) ?? null;
}

/**
 * Whether this visit's checklist may be edited.
 *
 * Arrived only. Every other status keeps the checklist readable — the record
 * is never hidden, and returning En route to Planned leaves it exactly as it
 * was — but not writable.
 */
export function canEditTasks(visit) {
  return Boolean(visit) && visit.status === 'arrived';
}

/**
 * Why a checklist is read-only, or null when it is not.
 *
 * The sentence lives beside the rule so the interface cannot explain a
 * restriction differently from the way it is enforced.
 */
export function taskLockReason(visit) {
  if (!visit || canEditTasks(visit)) return null;
  if (visit.status === 'completed') return 'This completed visit’s checklist is read-only.';
  return 'Task completion becomes available after arrival.';
}

/** Whether this visit is the one that may be sent back to Planned. */
export function canReturnToPlanned(visit) {
  return Boolean(visit) && visit.status === 'en-route';
}

export function outstandingTasks(visit) {
  return visit.tasks.filter((task) => !task.done).length;
}

export function taskProgress(visit) {
  const total = visit.tasks.length;
  return { done: visit.tasks.filter((task) => task.done).length, total };
}

function matchesFilter(visit, filter) {
  if (filter === 'all') return true;
  if (filter === 'in-progress') return isInProgress(visit.status);
  return visit.status === filter;
}

function matchesQuery(visit, query) {
  const term = query.trim().toLowerCase();
  if (!term) return true;
  return [visit.name, visit.reference, visit.address, visit.district, visit.postcode]
    .join(' ')
    .toLowerCase()
    .includes(term);
}

/** The Visits list: the search term and the status filter applied together. */
export function filteredVisits(state) {
  return state.visits.filter(
    (visit) => matchesFilter(visit, state.filter) && matchesQuery(visit, state.query),
  );
}

/**
 * The Today schedule.
 *
 * Honours the "Show completed visits on Today" preference, which is the whole
 * point of that switch: turning it off takes finished calls out of this list
 * and leaves the rest of the app untouched.
 */
export function todayVisits(state) {
  if (state.preferences.showCompletedOnToday) return state.visits;
  return state.visits.filter((visit) => visit.status !== 'completed');
}

/** The sentence under the Visits filters, including the empty case. */
export function resultSummary(state, count) {
  const filtered = state.filter !== 'all' || state.query.trim() !== '';
  if (count === 0) return 'No visits match this search';
  if (!filtered) return `Showing all ${count} ${count === 1 ? 'visit' : 'visits'}`;
  return `Showing ${count} of ${state.visits.length} visits`;
}
