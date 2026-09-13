/*
 * Explaining the app's controls.
 *
 * Every sentence here describes a rule that exists in demoState.js, and the
 * constants are imported rather than retyped so the guidance cannot drift away
 * from the behaviour it describes. Nothing in this file performs an action:
 * "how do I complete a visit?" is answered here, "complete it for me" is not.
 *
 * There is no Void workflow, no appearance toggle and no way out of the
 * simulated phone. If a question asks for one of those, the honest answer is
 * that the app does not have it.
 */

import {
  ADVANCE_LABELS,
  ASSISTANT_HISTORY_LIMIT,
  CANCELLATION_NOTE_LIMIT,
  CANCELLATION_REASONS,
  FILTERS,
} from './demoState';

const reasons = CANCELLATION_REASONS.join(', ').replace(/, ([^,]*)$/, ' and $1');
const filters = FILTERS.map((filter) => filter.label).join(', ');

/*
 * Ordered most specific first, because these questions overlap heavily:
 * "why can't I tick a task?" and "how do I complete a visit?" both mention
 * tasks and completion, and only the first is about the lock.
 */
export const GUIDANCE = [
  {
    id: 'open-visit',
    asks: /\bopen\b[^?]*\bvisit\b/i,
    text: 'Open Today or Visits and select a visit to see its details. Visits also lets you search and filter the round.',
  },
  {
    id: 'assistant-navigation',
    asks: /\bassistant\b|\bconversation\b|\bchat\b/i,
    text: `Open More and choose “Open assistant”. Use Back to More or any tab to leave it. Reopening retains the last ${ASSISTANT_HISTORY_LIMIT} messages; Reset clears them.`,
  },
  {
    id: 'task-lock',
    asks: /\btasks?\b[^?]*\blocked\b|\b(why|can'?t|cannot|unable)\b[^?]*\b(tick|ticking|check|edit|change|complete)\b[^?]*\btask/i,
    text:
      'Tasks can only be ticked once the visit is Arrived. Planned and En route checklists are locked; Completed and Cancelled checklists remain readable but cannot be edited.',
  },
  {
    id: 'task-vs-visit',
    asks: /\b(difference|differ|versus|vs|rather than|not the same)\b[^?]*\btask/i,
    text:
      'Ticking a task records one piece of work. Completing the visit closes the record and '
      + `moves it to Completed with the “${ADVANCE_LABELS.arrived}” button. They are separate: `
      + 'a visit can be completed with tasks still unticked, and ticking every task does not '
      + 'complete the visit on its own.',
  },
  {
    id: 'outstanding-warning',
    asks: /\b(outstanding|unticked|unchecked|incomplete)\b[^?]*\b(task|warning|complete)|\bwhat happens\b[^?]*\boutstanding\b/i,
    text:
      'Completing a visit with unticked tasks raises a warning first, saying how many are '
      + 'outstanding. You can review the checklist or complete anyway — the tasks are left '
      + 'exactly as they were either way.',
  },
  {
    id: 'complete-visit',
    asks: /\bhow (do|can) i\b[^?]*\bcomplete\b|\bcompleting a visit\b/i,
    text:
      `Open the visit and use “${ADVANCE_LABELS.arrived}”. It only appears once the visit is `
      + 'Arrived, and completing is final — there is no control anywhere that reopens a '
      + 'completed visit.',
  },
  {
    id: 'start-travel',
    asks: /\b(start|starting|begin|travel|travelling|en ?route|arrive|arriving|arrival)\b/i,
    text:
      `A visit moves one step at a time: “${ADVANCE_LABELS.planned}” takes it from Planned to `
      + `En route, “${ADVANCE_LABELS['en-route']}” takes it to Arrived, and `
      + `“${ADVANCE_LABELS.arrived}” closes it. Steps cannot be skipped. En route can be returned to Planned with confirmation.`,
  },
  {
    id: 'one-active',
    asks: /\b(two|second|another|more than one|same time|at once|multiple)\b[^?]*\b(visit|active|travel)|\bone active\b/i,
    text:
      'Only one visit can be active at a time. Starting a second is unavailable while another is En route or Arrived, and '
      + 'the app offers to open the active visit instead.',
  },
  {
    id: 'return-to-planned',
    asks: /\b(return|revert|undo|go back|back to planned|redirect)\b/i,
    text:
      'Only an En route visit can be returned to Planned. Confirm the return and the visit keeps its tasks '
      + 'and every other field; only the status moves, which releases the active-visit lock. '
      + 'Arrived and Completed cannot be reversed.',
  },
  {
    id: 'cancel',
    asks: /\bcancel/i,
    text:
      'Open a visit that is Planned or En route and choose “Cancel visit”. Pick a reason — '
      + `${reasons} — and add a note, which is required for “Other” and capped at `
      + `${CANCELLATION_NOTE_LIMIT} characters. Arrived, Completed and already cancelled visits `
      + 'cannot be cancelled, and cancelling never changes the checklist.',
  },
  {
    id: 'read-only',
    asks: /\b(read[- ]only|locked|fixed|edit)\b[^?]*\b(completed|cancelled|closed)|\b(completed|cancelled)\b[^?]*\b(checklist|read|edit)\b/i,
    text:
      'Completed and Cancelled checklists stay readable but cannot be edited. The record of '
      + 'what was done is never hidden and never rewritten.',
  },
  {
    id: 'show-completed',
    asks: /\b(hide|hiding|show|showing|display)\b[^?]*\bcompleted\b|\bshow completed\b/i,
    text:
      'More has a “Show completed visits on Today” preference. Turning it off hides completed '
      + 'visits from the Today list only — it changes nothing about the visits themselves, and '
      + 'the Visits tab still lists them.',
  },
  {
    id: 'confirm-completion',
    asks: /\bconfirm/i,
    text:
      'More has a “Confirm before completing” preference. With it on, completing a visit asks '
      + 'first. A visit with outstanding tasks asks anyway, whatever the preference says — the '
      + 'two questions never both appear for one tap.',
  },
  {
    id: 'filters',
    asks: /\b(filter|filters|search|searching|find|look up|looking up)\b/i,
    text:
      `The Visits tab has a search box and the filters ${filters}. Search matches the name, `
      + 'reference, service and address; the filters narrow by status. Tapping any visit opens '
      + 'its detail, and the back control returns to the list.',
  },
  {
    id: 'reset',
    asks: /\breset\b|\bstart (over|again)\b/i,
    text:
      'The “Reset demo” button beneath the phone restores the original round — statuses, checklists, '
      + 'preferences and the assistant conversation all return to how they started — and '
      + 'selects Today.',
  },
  {
    id: 'assistant',
    asks: /\b(assistant|this chat|conversation|you)\b[^?]*\b(work|do|keep|remember|navigat)|\bcan you (change|update|complete|cancel)\b/i,
    text:
      'The assistant reads the round and explains controls; it cannot change anything. The tab '
      + 'bar stays usable while it is open, and the conversation is kept when you navigate away '
      + `and come back — the last ${ASSISTANT_HISTORY_LIMIT} messages of it. Reset clears it.`,
  },
];

/** The guidance a question asks for, or null. */
export function findGuidance(question) {
  if (!/\bassistant\b/i.test(question) && /\b(restore|reopen|undo|return|revert|untick)\b/i.test(question)) {
    if (/\btask\b/i.test(question) && /\b(closed|completed|cancelled)\b/i.test(question)) return { id: 'closed-task', text: 'Completed and Cancelled visits have read-only checklists: tasks cannot be ticked or unticked. Reset demo restores the entire round and clears the conversation.' };
    if (/\b(cancelled|cancellation|completed|completion)\b/i.test(question)) {
      const status = /\b(cancelled|cancellation)\b/i.test(question) ? 'cancelled' : 'Completed';
      return { id: 'restore-closed', text: `This app does not support restoring an individual ${status} visit to Planned. “Return to Planned” applies to an En route visit. Reset demo restores the entire round and clears the conversation.` };
    }
    if (/\b(restore|reopen)\b/i.test(question)) return { id: 'restore', text: 'An individual Completed or Cancelled visit cannot be reopened. “Return to Planned” applies only to an En route visit. Reset demo restores the entire round and clears the conversation.' };
  }
  for (const id of ['one-active', 'return-to-planned', 'cancel', 'reset', 'read-only', 'confirm-completion']) {
    const entry = GUIDANCE.find((item) => item.id === id);
    if (entry.asks.test(question)) return entry;
  }
  return GUIDANCE.find((entry) => entry.asks.test(question)) ?? null;
}

/*
 * Controls the app deliberately does not have.
 *
 * Asked about often enough to be worth answering plainly rather than with a
 * search that finds nothing.
 */
export const ABSENT_CONTROLS = [
  {
    asks: /\bvoid(ing)?\b/i,
    text:
      'There is no Void workflow in this app. Planned and En route visits can be cancelled with a reason.',
  },
  {
    asks: /\b(dark mode|light mode|theme|appearance|font size|colour scheme|color scheme)\b/i,
    text:
      'The app has no appearance setting. More holds two preferences only: showing completed '
      + 'visits on Today, and confirming before completing.',
  },
  {
    asks: /\b(open|switch to|go to|launch)\b[^?]*\b(maps?|email|phone app|browser|another app|settings app)\b/i,
    text:
      'This is a simulated phone on a web page, so there is nothing outside it to open. Every '
      + 'control you can see belongs to this app.',
  },
  {
    asks: /\b(add|create|book|schedule|new)\b[^?]*\b(visit|client|task)\b/i,
    text:
      'The round is fixed — there is no control for adding a visit, a '
      + 'client or a task. Reset restores the original seven visits.',
  },
];

export const findAbsentControl = (question) =>
  ABSENT_CONTROLS.find((entry) => entry.asks.test(question)) ?? null;
