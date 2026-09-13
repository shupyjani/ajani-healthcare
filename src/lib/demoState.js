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
  cancelled: 'Cancelled',
};

/*
 * Cancelled sits outside STATUS_ORDER on purpose.
 *
 * It is not a further step along the sequence but an exit from it: a valid
 * visit the family called off. Keeping it out of the order means every rule
 * built on that order — nextStatus, canTransition, the advance action — refuses
 * a cancelled visit without needing to name it, and Completed keeps meaning
 * Completed and nothing else.
 *
 * There is deliberately no Void here. Voiding is an administrative correction
 * to a record that should never have existed, which belongs to a back office
 * rather than to a practitioner on a doorstep.
 */
export const CANCELLATION_REASONS = [
  'Family cancelled',
  'Visit no longer required',
  'Client unavailable',
  'Office instruction',
  'Other',
];

/* Long enough for a sentence of handover, short enough to stay a note. */
export const CANCELLATION_NOTE_LIMIT = 200;

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
    /* The visit a cancellation is being composed for, or null. */
    pendingCancelId: null,
    /*
     * The assistant, which is a screen rather than a tab.
     *
     * `messages` is the conversation, oldest first; `status` is what the
     * interface should be announcing; `mode` records which path answered last
     * so the fallback notice is shown only when it applies.
     */
    assistant: {
      open: false,
      messages: [],
      status: 'idle',
      mode: null,
      /*
       * Which question is outstanding.
       *
       * Bumped by every ask and matched by every reply, so an answer can only
       * ever land on the question that asked for it. A request still in flight
       * when the demo is reset carries an id the fresh conversation has never
       * issued, and is dropped rather than appearing under a conversation the
       * reader has just cleared.
       */
      requestId: 0,
    },
    /* The most recent thing worth saying out loud, or null. */
    announcement: null,
    /* Bumped by reset so the interface can announce that it happened. */
    resetCount: 0,
    /*
     * The order visits were completed in during this session, oldest first.
     *
     * Schedule order cannot prove completion order — a practitioner may work
     * out of sequence — so "which visit did I just finish?" needs the events
     * themselves. Only successful transitions to Completed append here:
     * a rejected or repeated attempt returns early above and records nothing,
     * cancelling is not completing, and asking a question never writes.
     *
     * It holds ids, not timestamps. The demo deliberately has no clock, and an
     * order is all the question actually asks about. The two visits that start
     * Completed are absent on purpose: they were completed before the session
     * began, and inventing a sequence for them would be fabricating history.
     */
    completionOrder: [],
  };
}

/* What a single question may be, and how much of the exchange is kept. */
export const ASSISTANT_MESSAGE_LIMIT = 500;
export const ASSISTANT_HISTORY_LIMIT = 20;

function trimHistory(messages) {
  return messages.length <= ASSISTANT_HISTORY_LIMIT
    ? messages
    : messages.slice(messages.length - ASSISTANT_HISTORY_LIMIT);
}

/**
 * The read-only view of the round the assistant is allowed to answer from.
 *
 * A copy, and a narrow one: no preferences, no navigation, no pending dialog
 * state. It is what gets posted to the endpoint, so it is also the limit of
 * what could ever leave the browser.
 */
export function assistantSnapshot(state) {
  return {
    summary: progressSummary(state),
    completionOrder: [...state.completionOrder],
    visits: state.visits.map((visit) => ({
      id: visit.id,
      reference: visit.reference,
      name: visit.name,
      type: visit.type,
      start: visit.start,
      end: visit.end,
      status: visit.status,
      priority: visit.priority,
      travel: visit.travel,
      address: `${visit.address}, ${visit.district} ${visit.postcode}`,
      tasks: visit.tasks.map(({ id, label, done, hint }) => ({ id, label, done, hint })),
      notes: [...visit.notes],
      cancellationNote: visit.cancellation?.note ?? null,
      tasksDone: visit.tasks.filter((task) => task.done).length,
      tasksTotal: visit.tasks.length,
      cancellationReason: visit.cancellation?.reason ?? null,
    })),
  };
}

function mapVisit(state, id, update) {
  return { ...state, visits: state.visits.map((v) => (v.id === id ? update(v) : v)) };
}

export function demoReducer(state, action) {
  switch (action.type) {
    case 'select-tab':
      /*
       * Changing tab leaves any open sub-screen behind: the tab bar is
       * top-level navigation, so it should not return to a drilled-down visit
       * or to the assistant.
       *
       * The assistant is closed here rather than blocking the tabs, because
       * the tabs stay visible and enabled while it is open — a control that
       * looks operable has to be. The conversation itself is untouched, so
       * reopening the assistant during the same session brings it back.
       */
      return {
        ...state,
        tab: action.tab,
        openVisitId: null,
        assistant: { ...state.assistant, open: false },
      };

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

      const task = visit.tasks.find(t => t.id === action.taskId);
      if (!task) return state;
      return {
        ...mapVisit(state, visit.id, (v) => ({
          ...v,
          tasks: v.tasks.map(t => t.id === task.id ? { ...t, done: !t.done } : t),
        })),
        announcement: `${visit.name} — ${task.label}: ${task.done ? 'unchecked' : 'checked'}.`,
      };
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
        announcement: `${visit.name}’s visit is now ${STATUS_LABELS[target]}.`,
        /* Only a real completion is an event. Every earlier return in this
           case is a rejection, and none of them reach here. */
        completionOrder:
          target === 'completed'
            ? [...state.completionOrder, visit.id]
            : state.completionOrder,
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

    case 'request-cancel': {
      const visit = findVisit(state, action.id);
      /* Refused before the dialog opens, so an unreachable status cannot even
         be asked about. */
      if (!visit || !canCancel(visit)) return state;
      return { ...state, pendingCancelId: visit.id };
    }

    case 'dismiss-cancel':
      return { ...state, pendingCancelId: null };

    /*
     * Cancelling a visit.
     *
     * Only Planned and En route may be cancelled: Arrived means the
     * practitioner is already at the address, and Completed and Cancelled are
     * both closed records. A reason is required, and "Other" additionally
     * requires the note, because "Other" on its own records nothing.
     *
     * Tasks are untouched — not completed, not cleared, not unticked. What was
     * recorded before the visit was called off stays recorded.
     *
     * Cancelling an En route visit releases the active-visit lock as a
     * consequence of the status changing, not as a second write.
     */
    case 'cancel-visit': {
      const visit = findVisit(state, action.id);
      if (!visit || !canCancel(visit)) return state;
      if (validateCancellation(action) !== null) return state;

      const note = (action.note ?? '').trim();

      return {
        ...mapVisit(state, visit.id, (v) => ({
          ...v,
          status: 'cancelled',
          cancellation: { reason: action.reason, note },
        })),
        pendingCancelId: null,
        announcement: `${visit.name}’s visit was cancelled. ${action.reason}.`,
      };
    }

    /*
     * The assistant.
     *
     * It is a reader. Nothing in this group touches visits, tasks,
     * preferences or the cancellation record — the only thing an exchange
     * changes is the conversation itself, which is what lets the interface
     * promise that asking a question cannot alter the round.
     */
    case 'open-assistant':
      return {
        ...state,
        assistant: { ...state.assistant, open: true },
        /* Leaving any drilled-down visit behind, as a tab change does. */
        openVisitId: null,
      };

    case 'close-assistant':
      return { ...state, assistant: { ...state.assistant, open: false } };

    case 'assistant-ask': {
      const question = (action.question ?? '').trim();
      if (question === '' || question.length > ASSISTANT_MESSAGE_LIMIT || state.assistant.status === 'thinking') return state;

      return {
        ...state,
        assistant: {
          ...state.assistant,
          status: 'thinking',
          requestId: state.assistant.requestId + 1,
          messages: trimHistory([
            ...state.assistant.messages,
            { id: `q${state.assistant.requestId + 1}`, role: 'user', text: question },
          ]),
        },
      };
    }

    case 'assistant-reply':
      /* Not the question that is outstanding — a reset or a newer ask has
         moved on since. Nothing is appended and nothing re-renders. */
      if (action.requestId !== undefined && (action.requestId !== state.assistant.requestId || state.assistant.status !== 'thinking')) {
        return state;
      }

      return {
        ...state,
        assistant: {
          ...state.assistant,
          status: 'idle',
          mode: action.mode ?? 'fallback',
          messages: trimHistory([
            ...state.assistant.messages,
            {
              id: `a${state.assistant.requestId}`,
              role: 'assistant',
              mode: action.mode === 'live' ? 'live' : 'fallback',
              text: String(action.text ?? '').slice(0, ASSISTANT_MESSAGE_LIMIT * 4),
              ...(action.context ? { context: action.context } : {}),
            },
          ]),
        },
      };

    case 'assistant-error':
      if (action.requestId !== undefined && (action.requestId !== state.assistant.requestId || state.assistant.status !== 'thinking')) {
        return state;
      }

      return {
        ...state,
        assistant: { ...state.assistant, status: 'error' },
      };

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
        assistant: { ...fresh.assistant, requestId: state.assistant.requestId + 1 },
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

/**
 * How much of the round is behind the practitioner.
 *
 * Completed and cancelled are counted separately and never merged: a cancelled
 * visit is resolved, in that nothing more will happen at that address, but it
 * was not completed and must never inflate the completed count. The bar tracks
 * *resolved* — the visits no longer waiting — because that is what "how much
 * is left" means on a doorstep.
 */
export function progress(state) {
  const total = state.visits.length;
  const completed = state.visits.filter((visit) => visit.status === 'completed').length;
  const cancelled = state.visits.filter((visit) => visit.status === 'cancelled').length;
  const resolved = completed + cancelled;

  return {
    completed,
    cancelled,
    resolved,
    total,
    remaining: total - resolved,
    percent: total === 0 ? 0 : Math.round((resolved / total) * 100),
  };
}

/**
 * The progress sentence, as the phrases it is made of.
 *
 * Two shapes, because a round with no cancellations should read exactly as it
 * always has. The longer form appears only once there is a cancellation to
 * account for, and then keeps completed and cancelled visibly apart.
 *
 * Returned as parts rather than one string so the interface can hold each
 * quantity to its own label. A single text node lets the browser break
 * anywhere there is a space, which is how "1" ended up alone on one line and
 * "cancelled" on the next.
 */
export function progressPhrases(state) {
  const { completed, cancelled, resolved, total, remaining } = progress(state);

  if (cancelled === 0) {
    return [`${completed} of ${total} visits complete`, `${remaining} remaining`];
  }

  return [
    `${resolved} of ${total} visits resolved`,
    `${completed} completed`,
    `${cancelled} cancelled`,
    `${remaining} remaining`,
  ];
}

/**
 * The same sentence as one string.
 *
 * Built from the phrases, so the spoken sentence and the laid-out one cannot
 * drift apart. This is what the progress bar's accessible name and the
 * assistant both read.
 */
export function progressSummary(state) {
  return progressPhrases(state).join(' · ');
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
 * Cancelled visits are passed over the same way completed ones are: nothing
 * further happens at that address, so it is never the visit in hand.
 *
 * Returns null once no visit is still waiting, which is the round-over case.
 */
export function primaryVisit(state) {
  return (
    activeVisit(state)
    ?? [...state.visits].sort((a, b) => scheduleMinutes(a.start) - scheduleMinutes(b.start)).find((visit) => visit.status === 'planned')
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
/**
 * The visits completed during this session, oldest completion first.
 *
 * Derived from the recorded events, so a round worked out of schedule order
 * reads back in the order it was actually worked.
 */
export function sessionCompletions(state) {
  return (state.completionOrder ?? [])
    .map((id) => findVisit(state, id))
    .filter((visit) => visit !== null && visit.status === 'completed');
}

/**
 * The most recently completed visit, and how that was established.
 *
 * `basis` is 'session' when the session watched it happen and 'schedule' when
 * it did not — the two visits that begin the round already Completed carry no
 * observed order, and the caller is expected to say so rather than present a
 * schedule position as an observation. Null when nothing is completed at all.
 */
export function latestCompletion(state) {
  const session = sessionCompletions(state);
  if (session.length > 0) return { visit: session[session.length - 1], basis: 'session' };

  const completed = state.visits.filter((visit) => visit.status === 'completed').sort((a, b) => scheduleMinutes(a.start) - scheduleMinutes(b.start));
  if (completed.length === 0) return { visit: null, basis: null };

  return { visit: completed[completed.length - 1], basis: 'schedule' };
}

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
  if (visit.status === 'cancelled') return 'This cancelled visit’s checklist is read-only.';
  return 'Task completion becomes available after arrival.';
}

/**
 * Whether this visit may be cancelled.
 *
 * Planned and En route only. Arrived means the practitioner is already at the
 * address, and completed and cancelled visits are closed records.
 */
export function canCancel(visit) {
  return Boolean(visit) && (visit.status === 'planned' || visit.status === 'en-route');
}

/**
 * What is wrong with a proposed cancellation, or null when nothing is.
 *
 * Returned as a sentence so the dialog and the reducer cannot disagree about
 * what counts as valid.
 */
export function validateCancellation({ reason, note } = {}) {
  if (!reason || !CANCELLATION_REASONS.includes(reason)) {
    return 'Choose a reason for cancelling this visit.';
  }

  const trimmed = (note ?? '').trim();

  if (reason === 'Other' && trimmed === '') {
    return 'Add a note describing why this visit was cancelled.';
  }

  if (trimmed.length > CANCELLATION_NOTE_LIMIT) {
    return `Keep the note to ${CANCELLATION_NOTE_LIMIT} characters or fewer.`;
  }

  return null;
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
  /* Completed only. A cancelled visit is not a finished call, and hiding it
     here would quietly remove a record the practitioner may need to see. */
  return state.visits.filter((visit) => visit.status !== 'completed');
}

/** The sentence under the Visits filters, including the empty case. */
export function resultSummary(state, count) {
  const filtered = state.filter !== 'all' || state.query.trim() !== '';
  if (count === 0) return 'No visits match this search';
  if (!filtered) return `Showing all ${count} ${count === 1 ? 'visit' : 'visits'}`;
  return `Showing ${count} of ${state.visits.length} visits`;
}

export function scheduleMinutes(time) {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}
