import { answerSelection, readSelection, executeSelection } from './assistantSelection';
import { interpretTaskDetail, resolveTaskDetail, taskDetailAnswer } from './assistantTaskDetails';
import { canCancel, latestCompletion, progressSummary } from './demoState';
import { recognisePerson } from './assistantPeople';
import { contextMayFillPerson, interpret, normalise, splitClauses } from './assistantInterpret';
import { findAbsentControl, findGuidance } from './assistantGuidance';
import { PRACTITIONER } from './demoVisits';
import {
  allVisits,
  selectRecords,
  byStatus,
  contactInstructions,
  COMPARATOR_WORDS,
  conceptTasks,
  contactsByRelationship,
  counts,
  dressingCategories,
  durationExtremes,
  durationMinutes,
  findTask,
  isVagueDressing,
  label,
  matchNotes,
  matchServices,
  matchTasks,
  priorityVisits,
  quantifiedSchedule,
  readComparison,
  relatedConcept,
  remainingVisits,
  resolveConcept,
  scheduleFacts,
  searchWords,
  similarTasks,
  taskSummary,
  taskTotals,
  visitsByTaskCount,
  visitsWithNotes,
} from './assistantQueries';

/*
 * The assistant's built-in answers.
 *
 * A pure function of the question and the current demo state. It is what the
 * demo falls back to when the serverless endpoint is unconfigured, unreachable,
 * slow or refuses — and it is also the safety floor the live path is held to,
 * because both obey the same two rules:
 *
 *   1. Read only. Nothing here dispatches, mutates or returns a modified
 *      state. Every answer is assembled from a snapshot that is left exactly
 *      as it was found.
 *   2. No clinical advice. Anything that reads as a question about care is
 *      turned away with the same sentence, whichever path answered it.
 *
 * The round it describes is fictional throughout.
 */

export const ASSISTANT_WELCOME =
  'Ask about the round — the next visit, what is active, what is planned, or how a '
  + 'control works. Try one of the questions below.';

export const ASSISTANT_DISCLOSURE =
  'Operational assistant. It cannot give clinical advice or update visits.';

export const FALLBACK_NOTICE =
  'Built-in guidance';

export const SUGGESTED_QUESTIONS = [
  'Who is my next visit?',
  'Which visit is currently active?',
  'Show my planned visits.',
  'Which visit is marked Priority?',
  'Find Ivor Bankole.',
  'What tasks remain for Priya Raman?',
  'How do I cancel a visit?',
  'What happens to progress when a visit is cancelled?',
];

export const CLINICAL_REFUSAL =
  'I cannot give clinical advice. For anything about a person’s care — symptoms, '
  + 'medication, treatment or an urgent concern — follow your organisation’s policy '
  + 'and its clinical escalation process, and contact the duty line or emergency '
  + 'services as that policy requires.';

export const UNSUPPORTED_ANSWER =
  'I couldn’t find that in today’s round. You can ask about a person, visit status, '
  + 'task or cancellation.';

export const DISCLOSURE_REFUSAL =
  'I do not have anything like that to share. I can only describe this '
  + 'round and how the app’s controls work.';

export const notFoundPerson = (name) =>
  `I can’t find anyone called ${name} in today’s round.`;

/* --- Phrasing ----------------------------------------------------------- */

const oxford = (items) =>
  items.length <= 1
    ? items.join('')
    : `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;

const nameList = (visits) => oxford(visits.map((visit) => visit.name));
const slot = (visit) => `${visit.start}–${visit.end}`;
const withTime = (visits) => oxford(visits.map((v) => `${v.name} at ${slot(v)}`));
const describe = (visit) =>
  `${visit.name}, ${visit.type}, ${slot(visit)}, ${visit.reference} (${label(visit)})`;
const plural = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

/* --- Conversation context ------------------------------------------------ */

/*
 * What the reader has already established.
 *
 * Read back out of the conversation the reducer already keeps — there is no
 * second store — and only ever used when the newest question does not say for
 * itself. Explicit wording always wins.
 */
const CONTEXT_DEPTH = 6;

/* Words that hand the subject back to whatever was last discussed. */
const PRONOUN = /\b(she|he|they|her|his|their|hers|theirs|them|it)\b/i;
const DEICTIC = /\b(that|this|the other|another|the next|which one|what about)\b/i;

function recentContext(state, visits) {
  const messages = state?.assistant?.messages ?? [];
  /* Both roles: the person under discussion is often one the assistant named
     in its own reply, not one the reader typed. */
  const recent = messages.slice(-CONTEXT_DEPTH).slice().reverse();
  const latestReply = recent.find((m) => m.role === 'assistant');
  if (latestReply && /I cannot give clinical|I can’t change|I couldn’t find|can’t find anyone|cannot reveal/i.test(latestReply.text)) return { person: null, subject: null, task: null };
  if (latestReply && recognisePerson(latestReply.text, visits)?.ambiguous) return { person: null, subject: /task/i.test(latestReply.text) ? 'tasks' : 'visit', task: null };
  // A completed unrelated exchange ends the old person context.
  if (latestReply && !recognisePerson(latestReply.text, visits)?.visit && !/Which visit|Which person/i.test(latestReply.text)) return { person: null, subject: null, task: null };

  let person = null;
  let subject = null;
  let task = null;

  for (const message of recent) {
    if (!person) {
      const found = recognisePerson(message.text, visits);
      if (found?.visit) person = found.visit;
    }

    if (!subject) {
      if (/\btask/i.test(message.text)) subject = 'tasks';
      else if (/\bnote/i.test(message.text)) subject = 'notes';
      else if (/\bcancel/i.test(message.text)) subject = 'cancellation';
      else if (/\b(status|visit|scheduled)\b/i.test(message.text)) subject = 'visit';
    }

    /* The last task actually named in the conversation, matched against the
       labels the round holds rather than guessed from wording. */
    if (!task && person) {
      task = person.tasks.find((candidate) =>
        message.text.toLowerCase().includes(candidate.label.toLowerCase())) ?? null;
    }

    if (person && subject && task) break;
  }

  return { person, subject, task };
}

/**
 * The question asked before this one, or null.
 *
 * Read out of the same capped conversation the reducer already keeps — no new
 * state is stored for it. The current question is skipped when it is already
 * in the log, so "what was the last question I asked?" never answers itself.
 */
function previousQuestion(state, asked) {
  const messages = state?.assistant?.messages ?? [];
  const normalised = asked.toLowerCase();

  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const message = messages[i];
    if (message.role !== 'user') continue;

    const text = String(message.text ?? '').trim();
    if (text === '') continue;
    if (text.toLowerCase().replace(/[\u2018\u2019]/g, "'") === normalised) continue;

    return text;
  }

  return null;
}

/* --- Task answers -------------------------------------------------------- */

const SMALL = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];
const spell = (n) => (n < SMALL.length ? SMALL[n] : String(n));

/* "What other task does she have?" — everything except the one just discussed. */
function otherTasksAnswer(visit, exclude) {
  const others = visit.tasks.filter((task) => task.id !== exclude?.id);

  if (others.length === 0) {
    return `${visit.name} has no other tasks recorded.`;
  }

  const listed = others.map((task) => `${task.label}${task.done ? ' (done)' : ''}`);
  return (
    `${visit.name} has ${spell(others.length)} other `
    + `${others.length === 1 ? 'task' : 'tasks'}: ${oxford(listed)}.`
  );
}

function similarityAnswer(state, visit) {
  const found = similarTasks(state, visit);

  if (found.length === 0) {
    return (
      `No clearly similar recorded task was found elsewhere on the round. `
      + `${visit.name}’s tasks share no more than the odd word with anyone else’s, and I `
      + 'won’t treat two differently worded jobs as the same one.'
    );
  }

  const listed = found
    .slice(0, 3)
    .map(({ task, other, candidate }) => `${task.label} resembles ${other.name}’s ${candidate.label}`);

  return `${oxford(listed)}.`;
}

function taskAnswer(visit, asked) {
  const { all, done, remaining, total, allDone } = taskSummary(visit);
  /* Every per-person task answer opens with the same count, so the reader gets
     the shape of the checklist before its detail. */
  const lead = `${visit.name}: ${done.length} of ${total} done.`;

  /* A named task on this visit — "has her wound dressing been done?" */
  const named = /\b(has|is|was)\b/i.test(asked) ? findTask(visit, asked) : null;
  if (named) {
    return `${named.label} for ${visit.name} is ${named.done ? 'completed' : ['completed', 'cancelled'].includes(visit.status) ? 'unchecked on this closed visit' : 'still outstanding'}.`
      + (named.hint && !named.done ? ` ${named.hint}.` : '');
  }

  if (/\ball\b/i.test(asked) && /\b(done|complete|completed|finish|finished|checked|ticked)\b/i.test(asked)) {
    return allDone
      ? `Yes. ${lead} Every task is complete.`
      : `No. ${lead} Remaining — ${oxford(remaining.map((task) => task.label))}.`;
  }

  if (/\bhow many\b|\bhow much\b/i.test(asked)) {
    return `${visit.name} has ${plural(total, 'task')}: ${done.length} done and `
      + `${remaining.length} left.`;
  }

  if (/\b(complete|completed|done|finished|ticked)\b/i.test(asked)) {
    return done.length
      ? `${lead} Completed — ${oxford(done.map((task) => task.label))}.`
      : `${lead} Nothing is ticked yet.`;
  }

  if (/\b(left|remaining|outstanding|still|unchecked|unticked|not done)\b/i.test(asked)) {
    return remaining.length
      ? `${lead} Remaining — ${oxford(remaining.map((task) => task.label))}.`
      : `${lead} Nothing is left.`;
  }

  return `${lead} ${oxford(all.map((task) => `${task.label}${task.done ? ' (done)' : ' (unchecked)'}`))}.`;
}

/*
 * Searching the round for something the reader named.
 *
 * Ordered so the most literal reading wins: tasks that match every word, then
 * services, then tasks matching any word. Services sit in the middle because a
 * phrase like "medication support" is the name of a service and not of a task —
 * answering it from a loose task match would be inventing a task because a
 * service title sounds similar.
 *
 * Returns null when the round has nothing to say, so the caller can carry on
 * rather than announce a failure.
 */
function roundTaskSearch(state, asked) {
  const strict = matchTasks(state, asked);

  const describeTasks = (matches) => {
    const people = [...new Set(matches.map((m) => m.visit.name))];
    const detail = matches
      .map(({ visit, task }) =>
        `${visit.name} — ${task.label}${task.done ? ' (done)' : ' (unchecked)'}`
        + (task.hint ? ` (${task.hint})` : ''))
      .join('; ');

    return (
      `${plural(people.length, 'visit')} ${people.length === 1 ? 'has' : 'have'} a matching task`
      + `: ${detail}.`
    );
  };

  if (strict.matches.length > 0 && !strict.loose) {
    return describeTasks(strict.matches);
  }

  const services = matchServices(state, asked);
  if (services.length > 0) {
    const types = [...new Set(services.map((visit) => visit.type))];
    return (
      `No task is named that, but ${plural(services.length, 'visit')} `
      + `${services.length === 1 ? 'is' : 'are'} for ${oxford(types)}: ${withTime(services)}.`
    );
  }

  if (strict.matches.length > 0) return describeTasks(strict.matches);

  return null;
}

/* --- Cancellation -------------------------------------------------------- */

function cancelGuidance(visit) {
  if (!canCancel(visit)) {
    const because =
      visit.status === 'cancelled'
        ? 'it is already cancelled'
        : visit.status === 'completed'
          ? 'completed visits are closed records'
          : 'you are already at the address';

    return (
      `${visit.name}’s visit is ${label(visit)}, so it cannot be cancelled — ${because}. `
      + 'Only Planned and En route visits can be cancelled.'
    );
  }

  return (
    `${visit.name}’s visit is ${label(visit)}, so it can be cancelled. Open that visit from `
    + 'Today or Visits and choose “Cancel visit”. I can’t make that change myself.'
  );
}

const cancelReasonsFor = (visit) => visit.status === 'cancelled'
  ? `${visit.name} was Cancelled. Recorded reason: ${visit.cancellation?.reason ?? 'not recorded'}.${visit.cancellation?.note ? ` Note: ${visit.cancellation.note}` : ''}`
  : `${cancelGuidance(visit)} The reasons are Family cancelled, Visit no longer required, `
  + 'Client unavailable, Office instruction and Other, and a note is required for “Other”.';

/* --- Completion and schedule --------------------------------------------- */

function completionSentence(visit) {
  if (visit.status === 'completed') return `Yes. ${visit.name}’s visit is Completed.`;
  if (visit.status === 'cancelled') return `No. ${visit.name}’s visit was Cancelled, not Completed.`;
  if (visit.status === 'planned') {
    return `No. ${visit.name}’s visit is still Planned for ${slot(visit)}.`;
  }
  return `No. ${visit.name}’s visit is ${label(visit)} and has not been completed.`;
}

const NO_REPRIORITISING = 'The assistant does not clinically reprioritise visits.';

function nextVisitSentence(state) {
  const { active, next } = scheduleFacts(state);

  if (active) {
    return (
      `${active.name} is the active visit (${label(active)}, ${slot(active)}), so that remains `
      + `the visit in hand. ${NO_REPRIORITISING}`
    );
  }

  if (!next) return 'Nothing is left waiting — every visit on the round is resolved.';

  return `Based on the round schedule, ${next.name} is next at ${slot(next)}. ${NO_REPRIORITISING}`;
}

/* --- Duration ------------------------------------------------------------ */

const minutes = (visit) => plural(durationMinutes(visit), 'minute');

const durationOf = (visit, lead) =>
  `${lead}, scheduled for ${minutes(visit)} from ${visit.start} to ${visit.end}.`;

const durationSentence = (visit) =>
  `${visit.name}’s visit is scheduled for ${minutes(visit)}, from ${visit.start} `
  + `to ${visit.end}.`;

/* --- Remaining and comparisons ------------------------------------------- */

/*
 * "How many more left?"
 *
 * Answered from the progress the round already derives, not from a person.
 * The question omits its subject rather than stating one, so this is exactly
 * where conversational context is allowed to help: if the reader has just been
 * asking about someone's checklist, "how many more" means tasks.
 */
function remainingAnswer(state, asked, context, subject) {
  /* An explicit subject settles it: "how many more visits left?" says visits,
     whatever the conversation was about a moment ago. */
  if (subject !== 'visit' && context.subject === 'tasks' && context.person) {
    const { remaining, total } = taskSummary(context.person);
    return {
      intent: 'tasks-remaining',
      text: remaining.length === 0
        ? `${context.person.name} has no tasks left — all ${total} are done.`
        : `${context.person.name} has ${plural(remaining.length, 'task')} left of ${total}: `
          + `${oxford(remaining.map((task) => task.label))}.`,
    };
  }

  const { completed, cancelled, remaining } = counts(state);

  const head = remaining === 0
    ? '0 visits remain — every visit on today’s round is resolved.'
    : `${plural(remaining, 'visit')} ${remaining === 1 ? 'remains' : 'remain'} on today’s round.`;

  /* The breakdown is worth adding only when it was asked for. */
  const wantsDetail = /\b(complete|completed|cancelled|resolved|progress|so far|breakdown)\b/i
    .test(asked);

  return {
    intent: 'remaining',
    text: wantsDetail
      ? `${head} ${completed} completed and ${cancelled} cancelled so far.`
      : head,
  };
}

/*
 * "Does any of my clients have more than 3 tasks today?"
 *
 * A count across the round, compared against the number the reader named. The
 * negative answer is stated plainly rather than as an empty list, because "no"
 * is the answer to a question phrased as one.
 */
function taskCountAnswer(state, comparison) {
  const { op, n } = comparison;
  const phrase = `${COMPARATOR_WORDS[op]} ${n} recorded ${n === 1 ? 'task' : 'tasks'}`;
  const matching = visitsByTaskCount(state, op, n);

  if (matching.length === 0) {
    return {
      intent: 'task-count',
      text: `No. No visit on today’s round has ${phrase}.`,
    };
  }

  const listed = matching.map((visit) => `${visit.name} (${plural(visit.tasks.length, 'task')})`);

  return {
    intent: 'task-count',
    text: `${plural(matching.length, 'visit')} ${matching.length === 1 ? 'has' : 'have'} `
      + `${phrase}: ${oxford(listed)}.`,
  };
}

/* --- "or are there any more?" -------------------------------------------- */

const STATUS_SEARCH = [
  [/\bplanned\b/i, 'planned', 'planned'],
  [/\bcancelled\b/i, 'cancelled', 'cancelled'],
  [/\bcomplete/i, 'completed', 'completed'],
  [/\barrived\b/i, 'arrived', 'arrived'],
];

/*
 * A follow-up that only makes sense against the question before it.
 *
 * "Is it just Sunita or are there any more?" is not a request for Sunita's
 * profile — it asks whether the previous answer's result set had anything else
 * in it. So the previous question is re-run and the result compared, which
 * keeps this honest without storing a second copy of anything: the set is
 * derived again from current state rather than remembered.
 */
function anyMoreAnswer(state, prior, named) {
  if (!prior) return null;

  const others = (visits) => visits.filter((visit) => visit.id !== named?.id);

  const report = (visits, describeSet) => {
    const rest = others(visits);

    if (rest.length === 0) {
      return named
        ? `Yes — just ${named.name}. No other visit ${describeSet}.`
        : `Nothing else ${describeSet}.`;
    }

    return `No — ${plural(rest.length, 'other visit')} ${rest.length === 1 ? 'does' : 'do'} too: `
      + `${withTime(rest)}.`;
  };

  /* "Who is my last visit?" — the answer is about position, not a set. */
  if (/\blast\b/i.test(prior) && /\b(visit|client|patient)/i.test(prior)) {
    const last = scheduleFacts(state).lastScheduled;
    if (!last) return null;

    return `${last.name} is the final scheduled visit of the round, at ${slot(last)}. `
      + 'No visit follows it.';
  }

  if (/\btask/i.test(prior)) {
    const { matches } = matchTasks(state, prior);
    if (matches.length === 0) return null;
    return report([...new Set(matches.map((m) => m.visit))], 'has a matching task');
  }

  for (const [pattern, status, word] of STATUS_SEARCH) {
    if (pattern.test(prior)) return report(byStatus(state, status), `is ${word}`);
  }

  if (/\bnote/i.test(prior)) {
    const searched = matchNotes(state, prior);
    const relevant = searched.length ? searched.map((entry) => entry.visit) : visitsWithNotes(state);
    return report(relevant, 'has a matching note');
  }

  if (/\b(ring|call|phone|contact)/i.test(prior)) {
    return report(contactInstructions(state).map((entry) => entry.visit),
      'records an instruction to make contact');
  }

  if (/\bpriorit/i.test(prior)) return report(priorityVisits(state), 'is marked Priority');

  return null;
}

/*
 * "How many more left?" — a question about the size of what remains.
 *
 * Hoisted so the positional branch can stand aside for it: "are there more
 * visits after this one?" mentions a position and is asking for a count.
 */
const REMAINING_COUNT = [
  /\bhow many\b[^?]*\b(more|left|remain|remaining|to go)\b/i,
  /\bhow much (more|left)\b/i,
  /\banything else (left|to do|outstanding|remaining)\b/i,
  /\bare there (any )?more (visits?|clients?|patients?)\b/i,
  /\bany(thing)? (else|more) (left|to do)\b/i,
];

const asksRemainingCount = (text) => REMAINING_COUNT.some((pattern) => pattern.test(text));

/* --- Resolving a positional target --------------------------------------- */

/*
 * Turning "my next visit", "the one after this" or "who did I just finish?"
 * into an actual record.
 *
 * Returns the visit and the basis on which it was chosen, because for one of
 * these the basis has to be said out loud: a completion the session did not
 * watch happen cannot be reported as though it had been.
 */
function resolveTarget(state, target) {
  const schedule = scheduleFacts(state);
  const visits = allVisits(state);

  switch (target.kind) {
    case 'active':
      return { visit: schedule.active, basis: 'active' };

    /* The approved reading: the visit in hand first, otherwise the earliest
       remaining Planned one. Completed and Cancelled visits are not remaining,
       so neither can ever be selected here. */
    case 'next':
      return { visit: schedule.next, basis: schedule.active ? 'active-first' : 'next-planned' };

    /* Explicitly past the visit in hand, so the visit in hand is excluded. */
    case 'after-current': {
      const following = remainingVisits(state)
        .filter((visit) => !schedule.active || visits.indexOf(visit) > visits.indexOf(schedule.active));
      return { visit: following[0] ?? null, basis: 'after-current' };
    }

    case 'previous-completed': {
      const { visit, basis } = latestCompletion(state);
      return { visit, basis: basis === 'session' ? 'observed' : 'schedule-only' };
    }

    case 'final-scheduled':
      return { visit: schedule.lastScheduled, basis: 'final-scheduled' };

    case 'last-remaining':
      return { visit: schedule.lastRemaining, basis: 'last-remaining' };

    case 'first-remaining':
      return { visit: schedule.firstRemaining, basis: 'first-remaining' };

    case 'neighbour': {
      const anchor = recognisePerson(target.name, visits)?.visit ?? null;
      if (!anchor) return { visit: null, basis: 'neighbour' };

      const index = visits.indexOf(anchor);
      const step = target.side === 'before' ? -1 : 1;
      return { visit: visits[index + step] ?? null, basis: 'neighbour', anchor };
    }

    default:
      return { visit: null, basis: null };
  }
}

/*
 * Stable names for the answers a positional target produces, so the intent a
 * caller sees does not change with the wording that selected the visit.
 */
const TARGET_INTENT = {
  'final-scheduled': 'last-visit',
  'previous-completed': 'previous-visit',
  'last-remaining': 'last-remaining',
  'first-remaining': 'first-remaining',
  'after-current': 'after-current',
  neighbour: 'neighbour',
  next: 'next',
  active: 'active',
};

/* How a chosen visit is introduced, so the reader can see why it was chosen. */
function targetLead(visit, basis, anchor) {
  switch (basis) {
    case 'active-first':
    case 'active':
      return `${visit.name} is your current active visit`;
    case 'next-planned':
      return `${visit.name} is next`;
    case 'after-current':
      return `${visit.name} comes after the visit in hand`;
    case 'observed':
      return `${visit.name} is the visit you completed most recently`;
    /*
     * The two visits that begin the round already Completed were completed
     * before this session started, so their order is not something the demo
     * watched. Saying so is the difference between reporting a fact and
     * inventing one.
     */
    case 'schedule-only':
      return `${visit.name} is the latest scheduled visit marked Completed; the initial `
        + 'records do not say which was completed last';
    case 'final-scheduled':
      return `${visit.name} is the final scheduled visit of the round`;
    case 'last-remaining':
      return `${visit.name} is the last visit still remaining`;
    case 'first-remaining':
      return `${visit.name} is the first visit still remaining`;
    case 'neighbour':
      return `${visit.name} is scheduled ${anchor ? `next to ${anchor.name}` : 'there'}`;
    default:
      return visit.name;
  }
}

/* Why a positional target found nothing, said specifically. */
function emptyTarget(target, state) {
  switch (target.kind) {
    case 'active':
      return 'No visit is active. Start travelling to a planned visit to make one active.';
    case 'next':
    case 'after-current':
    case 'last-remaining':
    case 'first-remaining':
      return 'Nothing is left waiting — every visit on the round is resolved.';
    case 'previous-completed':
      return 'No visit has been completed yet on this round.';
    case 'neighbour':
      return `I can’t find ${target.name} on today’s round, so I can’t say what is `
        + 'scheduled beside them.';
    default:
      return allVisits(state).length === 0
        ? 'There are no visits on this round.'
        : UNSUPPORTED_ANSWER;
  }
}

/* --- Concept answers ------------------------------------------------------ */

const taskLine = ({ visit, task }) =>
  `${visit.name} — ${task.label}${task.done ? ' (done)' : ' (unchecked)'}`
  + (task.hint ? ` (${task.hint})` : '');

/*
 * Answering about an action rather than a word.
 *
 * The interesting case is absence. Nothing on this round administers
 * medication or feeds anyone, and the useful answer says exactly that before
 * offering the nearest thing that *is* recorded — which is a different job,
 * and is named as one.
 */
function conceptAnswer(state, concept) {
  const matches = conceptTasks(state, concept);

  if (matches.length > 0) {
    const people = new Set(matches.map((m) => m.visit.id)).size;
    return {
      /* A concept match is still a task search; only an absence is news. */
      intent: 'task-search',
      text: `${plural(people, 'visit')} ${people === 1 ? 'has' : 'have'} a matching task: `
        + `${matches.map(taskLine).join('; ')}.`,
    };
  }

  const related = relatedConcept(concept);
  const nearby = related ? conceptTasks(state, related) : [];

  if (nearby.length > 0) {
    return {
      intent: 'concept',
      text: `No task on today’s round explicitly records ${concept.noun}. `
        + `What is recorded is ${related.noun}: ${nearby.map(taskLine).join('; ')}.`,
    };
  }

  return {
    intent: 'concept',
    text: `No task on today’s round records ${concept.noun}.`,
  };
}

/* "Any dressing tasks?" — two unrelated jobs share the word, so show both. */
function dressingAnswer(state) {
  const { personal, wound } = dressingCategories(state);

  const parts = [];
  if (personal.length > 0) {
    parts.push(`personal dressing — ${personal.map(taskLine).join('; ')}`);
  }
  if (wound.length > 0) {
    parts.push(`wound dressing — ${wound.map(taskLine).join('; ')}`);
  }

  return {
    intent: 'concept',
    text: parts.length === 0
      ? 'No task on today’s round mentions dressing.'
      : `“Dressing” covers two different jobs here. ${oxford(parts)}.`,
  };
}

/* --- Contact answers ------------------------------------------------------ */

/*
 * "Do I need to ring any client before visiting?"
 *
 * Only pre-visit calls answer that. An incoming call from a relative and a
 * conditional escalation are both real records and neither is an instruction
 * to telephone anyone beforehand, so they are named for what they are instead
 * of being offered as though they were.
 */
function contactAnswer(state, asked) {
  const groups = contactsByRelationship(state);
  const beforehand = /\b(before|prior to|ahead of|in advance|pre[- ]?visit)\b/i.test(asked);

  const listSources = (entries) =>
    entries.map((entry) => `${entry.visit.name} — ${entry.text.replace(/\s+$/, '')}`).join(' ');

  if (beforehand) {
    if (groups.preVisit.length > 0) {
      return {
        intent: 'contact',
        text: `${plural(groups.preVisit.length, 'visit')} asks for a call beforehand: `
          + `${listSources(groups.preVisit)}`,
      };
    }

    return { intent: 'contact', text: 'No. No note on today’s round asks you to ring a client before visiting.' };
  }

  const all = [...groups.preVisit, ...groups.outgoing];
  if (all.length > 0) {
    return {
      intent: 'contact',
      text: `${plural(all.length, 'record')} asks you to make contact: ${listSources(all)}`,
    };
  }

  const other = [...groups.incoming, ...groups.conditional];
  return {
    intent: 'contact',
    text: other.length > 0
      ? 'No task or note instructs you to make a call. The round mentions contact twice — '
        + `${listSources(other)} — but as an expected call and a conditional escalation.`
      : 'No visit records an instruction to contact anyone.',
  };
}

/* --- Round-wide totals ---------------------------------------------------- */

/*
 * "How many tasks in total do I have today?"
 *
 * A count, not a search. Reading it as a lookup is what sent the word "total"
 * to the task matcher and came back with nothing.
 */
function totalsAnswer(state, filters) {
  const { total, done, outstanding, due, visits } = taskTotals(state);

  if (filters.done === false) {
    return {
      intent: 'task-totals',
      text: `${plural(due, 'task')} still to do across the unresolved visits. `
        + `${outstanding} of the round’s ${total} recorded tasks are unticked in all, `
        + 'counting those on visits that are already closed.',
    };
  }

  if (filters.done === true) {
    return {
      intent: 'task-totals',
      text: `${plural(done, 'task')} ticked of ${total} recorded across ${visits} visits.`,
    };
  }

  return {
    intent: 'task-totals',
    text: `${plural(total, 'task')} recorded across ${visits} visits today: `
      + `${done} ticked and ${outstanding} unticked.`,
  };
}

/* --- The answer ---------------------------------------------------------- */

/**
 * Answer `question` from `state`.
 *
 * Returns `{ text, intent }`. `state` is never written to.
 */
function answerOne(question, state, carry = null) {
  /*
   * One question, read once.
   *
   * `reading` is the structured interpretation — subject, operation, target,
   * scope, filters. Everything below selects records and phrases them; none of
   * it re-reads the sentence for meaning that was already established here.
   */
  const reading = interpret(question);
  const asked = reading.text;
  if (asked === '') return { text: UNSUPPORTED_ANSWER, intent: 'unsupported' };

  const visits = allVisits(state);
  const kind = reading.boundary;
  const { scope, subject, operation, target, filters } = reading;

  if (kind === 'disclosure') return { text: DISCLOSURE_REFUSAL, intent: 'disclosure' };

  const referenced = visits.find((v) => asked.toLowerCase().includes(v.reference.toLowerCase()));
  if (/\bAV-\d+\b/i.test(asked) && !referenced) return { intent: 'not-found', text: 'No visit with that reference is recorded on today’s round.' };
  const found = referenced ? { visit: referenced } : recognisePerson(asked, visits);
  /* A clause answered a moment ago is newer than anything in the log. */
  const history = recentContext(state, visits);
  const context = carry ? { ...history, person: carry } : history;

  /*
   * Who this question is about.
   *
   * A name in the question settles it. Otherwise the question's own scope
   * decides whether context may step in at all: "are there any wound related
   * tasks today?" is explicitly round-wide, so the person discussed a moment
   * ago is not substituted into it. Context fills a gap; it never overrides.
   */
  const visit =
    found?.visit
    ?? (found || !contextMayFillPerson(scope) || (!subject && !PRONOUN.test(asked) && !DEICTIC.test(asked) && !/what('?s| is) the time/i.test(asked)) ? null : context.person);

  /* Clinical advice is refused before any operational detail is offered. */
  if (kind === 'advice' || kind === 'clinical') {
    return {
      intent: 'clinical',
      text: found?.unknown
        ? `${notFoundPerson(found.unknown)} ${CLINICAL_REFUSAL}`
        : CLINICAL_REFUSAL,
    };
  }

  if (kind === 'demographic') {
    return {
      intent: 'demographic',
      text:
        'The round does not record gender, age or similar details, so I can’t count that. '
        + 'I can tell you about visits, statuses, times, tasks and notes.',
    };
  }

  if (found?.unknown) {
    return { intent: 'not-found', text: notFoundPerson(found.unknown) };
  }

  if (found?.ambiguous) {
    return {
      intent: 'ambiguous',
      text: 'More than one person on the round could match that. Which did you mean?',
    };
  }

  /* --- The conversation itself ------------------------------------------ */

  /*
   * "What was the last question I asked?"
   *
   * Explicitly about the exchange, so it is answered before anything reaches
   * for a person. Only the reader's own messages are readable here — the
   * capped log the reducer keeps holds nothing else, and no instruction,
   * configuration or provider message is in reach to quote.
   */
  if (scope === 'conversation') {
    const prior = previousQuestion(state, asked);

    return {
      intent: 'history',
      text: prior
        ? `Your previous question was: “${prior}”`
        : 'That is the first question you have asked in this conversation, so there is no '
          + 'earlier one to repeat.',
    };
  }

  if (kind !== 'mutation' && subject !== 'control' && operation !== 'explain') {
    const detail = resolveTaskDetail(asked, state, found?.visit, context.person);
    if (detail) return taskDetailAnswer(detail);
  }

  /* --- How the app works ------------------------------------------------ */

  /*
   * Explaining a control is not performing one.
   *
   * "How do I complete a visit?" is answered here from the rules in
   * demoState.js; "complete it for me" is a mutation and is refused further
   * down. The two are told apart by the operation, not by the vocabulary,
   * which is why both may mention completing.
   */
  if (subject === 'control' || operation === 'explain' || /\bcan i\b.*\b(restore|reopen|undo|untick|return)\b/i.test(asked)) {
    const absent = findAbsentControl(asked);
    if (absent) return { intent: 'guidance', text: absent.text };

    const guidance = findGuidance(asked);
    /* Keeps the name the established answer already had, so explaining
       cancellation is still reported as cancellation guidance. */
    if (guidance) {
      return { intent: guidance.id === 'cancel' ? 'cancel-how' : 'guidance', text: guidance.text };
    }
  }

  if (kind === 'mutation' && /\bcancel/i.test(asked) && visit) return { intent: 'cancel-person', text: cancelGuidance(visit) };
  if (kind === 'mutation') return { intent: 'mutation', text: 'I can’t change anything in the app — I can only read the round. Open the visit from Today or Visits and use the controls there.' };

  /* Asked about outright, whatever the phrasing. */
  const absentControl = findAbsentControl(asked);
  if (absentControl) return { intent: 'guidance', text: absentControl.text };

  /* --- Time ------------------------------------------------------------- */

  const schedule = scheduleFacts(state);

  /*
   * An unqualified "what's the time?" is ambiguous, and the conversation
   * usually settles it. When a visit has just been discussed, that visit's
   * scheduled time is the likely meaning — so it is answered first, with the
   * other reading acknowledged rather than assumed away. With nothing recent
   * to go on, only the truthful answer is available. Neither branch ever
   * claims to know the real clock.
   */
  if (/\bwhat('?s| is) the time\b|\bwhat time is it\b|\btime now\b|\bcurrent time\b/i.test(asked)) {
    if (visit && !found?.visit && !/\b(current|now)|what time is it/i.test(asked) && (context.person || context.subject === 'visit')) {
      return {
        intent: 'time-context',
        text:
          `${visit.name}’s visit is scheduled for ${slot(visit)}. `
          + 'If you meant the current clock time, this app doesn’t track a live clock.',
      };
    }

    return {
      intent: 'time-now',
      text:
        'This app doesn’t track a live current time. '
        + `${PRACTITIONER.name.split(' ')[0]}’s shift runs from ${schedule.shiftStart} to `
        + `${schedule.shiftEnd}.`
        + (schedule.active
          ? ` ${schedule.active.name} is the active visit at ${slot(schedule.active)}.`
          : schedule.next
            ? ` ${schedule.next.name} is next at ${slot(schedule.next)}.`
            : ''),
    };
  }

  if (/^what time[?.!]*$/i.test(asked) && visit) return { intent: 'time-context', text: `${visit.name}’s visit is scheduled for ${slot(visit)}. This app doesn’t track a live clock.` };
  if (/\b(actual|elapsed|spent|since arriv|how long have)\b/i.test(asked)) return { intent: 'duration', text: 'The records do not include actual elapsed time or arrival timestamps; only scheduled visit times are available.' };
  if (subject === 'duration' && /\bshift\b/i.test(asked)) return { intent: 'duration', text: `The scheduled shift is ${durationMinutes({ start: schedule.shiftStart, end: schedule.shiftEnd })} minutes (${schedule.shiftHours}).` };

  /*
   * How long something is scheduled for.
   *
   * Every figure is subtracted from the recorded start and end, so a duration
   * cannot disagree with the times printed next to it. "How long should the
   * next visit take?" is a schedule question — the "should" is the ordinary
   * one of a timetable, and it is answered here rather than being read as a
   * request for clinical advice, which is a distinction the classifier already
   * draws by looking at the verb rather than the modal.
   */
  if (/\bhow long\b|\bduration\b|\bhow many minutes\b|\b(longest|shortest)\b/i.test(asked)) {
    if (/\b(longest|shortest)\b/i.test(asked)) {
      const { longest, shortest } = durationExtremes(state);
      const shortestWanted = /\bshortest\b/i.test(asked);
      const pick = shortestWanted ? shortest : longest;

      return {
        intent: 'duration',
        text: pick
          ? durationOf(pick, `The ${shortestWanted ? 'shortest' : 'longest'} visit of the round `
            + `is ${pick.name}`)
          : 'There are no visits on this round.',
      };
    }

    if (target.kind === 'next' && schedule.next) {
      return {
        intent: 'duration',
        text: durationOf(schedule.next, `The next visit is ${schedule.next.name}`),
      };
    }

    if (target.kind === 'active' && schedule.active) {
      return {
        intent: 'duration',
        text: durationOf(schedule.active, `The active visit is ${schedule.active.name}`),
      };
    }

    if (target.kind === 'final-scheduled' && schedule.lastScheduled) {
      return {
        intent: 'duration',
        text: durationOf(
          schedule.lastScheduled,
          `The last visit of the round is ${schedule.lastScheduled.name}`,
        ),
      };
    }

    if (target.kind) {
      const selected = resolveTarget(state, target);
      if (selected.visit) return { intent: 'duration', text: durationOf(selected.visit, targetLead(selected.visit, selected.basis, selected.anchor)) };
    }
    if (visit) return { intent: 'duration', text: durationSentence(visit) };

    return {
      intent: 'duration',
      text: 'Which visit did you mean? Name the person, or ask about the next, active or '
        + 'last visit of the round.',
    };
  }

  /*
   * Any question about the shift, not only one that names a boundary.
   * "When is my last shift?" was falling through to nothing; the round holds
   * one shift, so the honest answer is that one's hours plus a word about
   * why there is no other.
   */
  if (/\bshift\b/i.test(asked)) {
    const span = `Your shift today runs from ${schedule.shiftStart} to ${schedule.shiftEnd}.`;

    if (/\b(end|finish|over|until)\b/i.test(asked)) {
      return { intent: 'shift', text: `Your shift today ends at ${schedule.shiftEnd}.` };
    }
    if (/\b(start|begin)\b/i.test(asked)) {
      return { intent: 'shift', text: `Your shift today starts at ${schedule.shiftStart}.` };
    }
    if (/\b(last|next|another|other|tomorrow|week)\b/i.test(asked)) {
      return {
        intent: 'shift',
        text: `${span} This app only holds today’s shift, so there is no other to compare it with.`,
      };
    }

    return { intent: 'shift', text: span };
  }

  /* "What time should all visits be completed by?" — the last visit's end is
     not the same as the end of the shift, and both are worth saying. */
  if (/\b(completed|finished|done)\b/i.test(asked) && /\bby\b/i.test(asked)
    && /\btime\b/i.test(asked)) {
    const last = schedule.lastScheduled;
    return {
      intent: 'finish-by',
      text: last
        ? `The last visit of the round, ${last.name}, is scheduled to end at ${last.end}. `
          + `The shift itself runs until ${schedule.shiftEnd}.`
        : `The shift runs until ${schedule.shiftEnd}.`,
    };
  }

  /*
   * A run of visits asked for by number. Checked before the single-visit
   * branches, which would otherwise answer "my last two clients" with one.
   */
  if (/\b(visit|visits|client|clients|patient|patients|people)\b/i.test(asked)) {
    const run = quantifiedSchedule(state, asked);
    if (run && /\b(first|last|next)\s+(?:\d+|one|two|three|four|five|six|seven|eight|nine|ten)\b/i.test(asked) && subject !== 'task') {
      const word = run.kind === 'remaining' ? 'remaining' : run.kind;
      return {
        intent: 'schedule-run',
        text: `Your ${word} ${plural(run.visits.length, 'visit')}: ${withTime(run.visits)}.`,
      };
    }
  }

  /* --- A visit named by position ---------------------------------------- */

  /*
   * "Who was my last visit?", "who comes after this one?", "what were the
   * tasks in my previous visit?"
   *
   * One branch, because they differ only in which record is selected and what
   * is then said about it. Selecting and phrasing are kept apart: the target
   * resolves to a visit and a basis, and the answer says both.
   */
  /*
   * "next" and "active" already have well-established answers further down
   * that say why the visit in hand stays the visit in hand. They are routed
   * here only when the question asks for something specific about that visit —
   * its tasks, its duration, its address — rather than for its identity.
   */
  const SPECIFIC = ['task', 'duration', 'address', 'note', 'reference', 'service', 'schedule', 'cancellation', 'status'];
  const routed =
    target.kind === 'next' || target.kind === 'active'
      ? SPECIFIC.includes(subject) || operation === 'count'
      : true;

  if (target.kind && target.kind !== 'result-set' && routed && (!found?.visit || target.kind === 'neighbour')
    && !asksRemainingCount(asked)) {
    const { visit: picked, basis, anchor } = resolveTarget(state, target);

    if (!picked) {
      return { intent: 'target-none', text: emptyTarget(target, state) };
    }

    const lead = targetLead(picked, basis, anchor);

    /* The subject the question actually asked about, answered for that visit
       rather than replaced by a profile of it. */
    if (subject === 'reference') return { intent: 'find', text: `${picked.name}’s visit reference is ${picked.reference}.` };
    if (subject === 'service') return { intent: 'service', text: `${picked.name}: ${picked.type}.` };
    if (subject === 'status' && operation === 'completion') return { intent: 'completion', text: completionSentence(picked) };
    if (subject === 'cancellation') return { intent: 'cancel-person', text: cancelReasonsFor(picked) };
    if (subject === 'task' || /\btask/i.test(asked)) {
      if (operation === 'count') {
        const selected = selectRecords(state, reading, picked);
        const { total, done, remaining } = taskSummary(picked);
        return {
          intent: 'target-task-count',
          text: `${plural(selected.tasks.length, 'task')} — ${lead}, with ${total} recorded: ${done.length} ticked and `
            + `${remaining.length} unticked.`,
        };
      }

      const taskQuestion = target.kind === 'previous-completed' ? asked.replace(/\b(previous|last|completed|finished)\b/gi, '') : asked;
      return { intent: 'target-tasks', text: `${lead}. ${taskAnswer(picked, taskQuestion)}` };
    }

    if (subject === 'duration') {
      return { intent: 'duration', text: durationOf(picked, lead) };
    }

    if (subject === 'address') {
      return {
        intent: 'find',
        text: `${lead}, at ${picked.address}, ${picked.district} ${picked.postcode}.`,
      };
    }

    if (subject === 'note') {
      return {
        intent: 'notes',
        text: picked.notes.length
          ? `${lead}. ${picked.notes.join(' ')}`
          : `${lead}, and that visit has no operational notes.`,
      };
    }

    return {
      intent: TARGET_INTENT[target.kind] ?? 'target',
      text: `${lead}; scheduled ${slot(picked)} (${label(picked)}).`,
    };
  }


  if (!visit && (scope === 'person' || /\bwhich one\b/i.test(asked))) return { intent: 'clarify', text: 'Which visit did you mean? Tell me the person and I’ll list their tasks.' };
  const records = selectRecords(state, reading, visit);
  const asksTaskRecords = subject === 'task' || records.concepts.length > 0;
  const countsVisits = /\bhow many\s+(?:of (?:my|the)\s+)?(?:visits?|clients?|people|patients?)\b/i.test(asked);
  if ((operation === 'count' || operation === 'comparison') && asksTaskRecords) {
    if (operation === 'comparison' && !records.concepts.length && !filters.status.length && filters.done === null && !filters.priority) return taskCountAnswer(state, reading.comparator);
    if (countsVisits || operation === 'comparison') {
      const matches = records.matchingVisits;
      return { intent: operation === 'comparison' ? 'task-count' : 'task-search', text: `${plural(matches.length, 'visit')} match: ${matches.length ? nameList(matches) : 'none'}.${operation === 'count' ? ' ' + records.tasks.map(taskLine).join(' ') : ''}` };
    }
    if (visit && filters.done === null && !records.concepts.length) return { intent: 'tasks', text: taskAnswer(visit, asked) };
    const n = records.tasks.length;
    return { intent: 'task-totals', text: `${plural(n, 'task')}${records.due ? ' still due on unresolved visits' : ' recorded'}${visit ? ` for ${visit.name}` : ' across the selected visits'}.` };
  }
  if (operation === 'count' && !asksTaskRecords && subject !== 'progress' && !asksRemainingCount(asked)) {
    return { intent: 'counts', text: `${records.visits.length} ${filters.status.length ? filters.status.join(' or ') + ' ' : ''}${records.visits.length === 1 ? 'visit' : 'visits'}${records.visits.length ? `: ${nameList(records.visits)}` : ''}.` };
  }
  if (records.due && records.concepts.length && !visit) return { intent: 'task-search', text: records.tasks.length ? records.tasks.map(taskLine).join('; ') + '.' : 'No matching tasks are recorded in the requested scope.' };
  if (asksTaskRecords && (records.concepts.length > 1 || reading.filters.status.some((status) => status !== 'completed' || /\bcompleted visits?\b/i.test(asked)) || reading.filters.priority || /\b(all|none|without|no)\b/i.test(asked)) && !visit) {
    const matches = records.matchingVisits;
    return { intent: 'task-search', text: matches.length ? `${plural(matches.length, 'visit')} match: ${nameList(matches)}. Tasks: ${records.tasks.map(taskLine).join(' ')}` : 'No visits match these task conditions.' };
  }

  /* --- Remaining, comparisons and follow-ups ---------------------------- */

  /*
   * "How many more left?"
   *
   * The subject is omitted rather than stated, which is the one case context
   * is for. What it must not do is answer with a person: the count comes from
   * the round's own progress.
   */
  if (asksRemainingCount(asked)) {
    return remainingAnswer(state, asked, context, subject);
  }

  /* "Does any of my clients have more than 3 tasks today?" */
  const comparison = readComparison(asked);
  if (comparison && /\btask/i.test(asked)) {
    return taskCountAnswer(state, comparison);
  }

  /*
   * "Is it just Sunita or are there any more?"
   *
   * Meaningless on its own, so it is resolved against the question before it
   * rather than against whoever it happens to name. Falls through untouched
   * when there is no previous question to resolve it with.
   */
  /* "any other client" is a comparison, not a follow-up: the trigger has to be
     the bare form that stands at the end of a question. */
  if (/\bis (it|that|this) just\b|\bany more\b|\bany others\b|\b(anyone|anybody) else\b/i
    .test(asked)
    || /\bany other\s*[?.!]*$/i.test(asked)) {
    const more = anyMoreAnswer(state, previousQuestion(state, asked), visit);
    if (more) return { intent: 'any-more', text: more };
  }

  /* --- Notes and contact ------------------------------------------------ */

  if (/\bnote/i.test(asked)) {
    if (visit) {
      return {
        intent: 'notes',
        text: visit.notes.length
          ? `${visit.name}: ${visit.notes.join(' ')}`
          : `${visit.name}’s visit has no operational notes.`,
      };
    }

    const withNotes = visitsWithNotes(state);
    const searched = matchNotes(state, asked);
    const relevant = searched.length ? searched.map((entry) => entry.visit) : withNotes;

    if (relevant.length === 0) {
      return { intent: 'notes', text: 'No visit on today’s round has an operational note.' };
    }

    /* Naming all seven is a dump, not an answer. */
    const everyone = relevant.length === visits.length;
    return {
      intent: 'notes',
      text: everyone
        ? `Every visit on the round has an operational note — all ${visits.length} of them. `
          + 'Open a visit to read its note.'
        : `${plural(relevant.length, 'visit')} ${relevant.length === 1 ? 'has' : 'have'} `
          + `operational notes: ${nameList(relevant)}.`,
    };
  }

  /*
   * Contact, by the relationship actually recorded.
   *
   * An incoming call from a relative and a conditional escalation are not
   * instructions to telephone anyone beforehand, and reporting them as though
   * they were is the defect this replaces.
   */
  if (subject === 'contact' && !visit) {
    return contactAnswer(state, asked);
  }

  /* --- Cancellation ----------------------------------------------------- */

  if (/\bprogress|\bcount|\bhow many\b/i.test(asked) && /\bcancel/i.test(asked)) {
    return {
      intent: 'cancel-progress',
      text:
        'Cancelling never raises the completed count. Completed and cancelled visits are '
        + 'counted separately, and the bar tracks the two together as resolved — the visits '
        + `no longer waiting. Right now: ${progressSummary(state)}.`,
    };
  }

  if (/\bcancelled\b/i.test(asked) && /\b(which|what|list|show|any|see)\b/i.test(asked)) {
    const cancelled = byStatus(state, 'cancelled');
    return {
      intent: 'cancelled',
      text: cancelled.length
        ? `${plural(cancelled.length, 'visit')} cancelled: ${withTime(cancelled)}.`
        : 'No visits are cancelled.',
    };
  }

  if (/\bcancel/i.test(asked)) {
    if (visit) {
      return {
        intent: 'cancel-person',
        text: /\breason/i.test(asked) ? cancelReasonsFor(visit) : cancelGuidance(visit),
      };
    }
    return {
      intent: 'cancel-how',
      text:
        'Open a visit that is Planned or En route, then choose “Cancel visit”. Pick a reason — '
        + 'Family cancelled, Visit no longer required, Client unavailable, Office instruction or '
        + 'Other — and add a note, which is required for “Other”. Arrived, completed and already '
        + 'cancelled visits cannot be cancelled, and cancelling never changes the checklist.',
    };
  }

  /* --- Tasks ------------------------------------------------------------ */

  const asksTasks = subject === 'task';

  /*
   * Questions framed as work to do rather than as a checklist.
   *
   * "Is there any visit I have to feed the client?" never says "task" and is
   * a task question. The frames below are the ordinary ways of asking one.
   */
  const asksWork =
    /\b(have|has|need|needs) to\b|\bdo i (have|need)\b|\b(does|do) (anyone|anybody|any [a-z]+) have\b|\bwho (needs|has) to\b|\bis there any visit i\b/i
      .test(asked);

  /*
   * A count across the round is a count, not a search.
   *
   * "How many tasks in total do I have today?" asks for a number; sending the
   * word "total" to the task matcher is how it came back with nothing.
   */
  if (operation === 'count' && asksTasks && !visit && scope === 'round') {
    return totalsAnswer(state, filters);
  }

  /*
   * Actions, not words.
   *
   * Recognising the concept the question is about lets an absence be answered
   * honestly — nothing here administers medication or feeds anyone — and stops
   * a question about personal dressing being answered with a wound dressing.
   */
  if ((asksTasks || asksWork || /\bany\b/i.test(asked)) && !found?.visit && scope !== 'person') {
    if (isVagueDressing(asked)) return dressingAnswer(state);

    const broadCategory = resolveConcept(asked);
    if (['hygiene', 'mobility'].includes(broadCategory?.id)) {
      const selected = selectRecords(state, reading);
      return { intent: 'task-search', text: selected.tasks.length ? selected.tasks.map(taskLine).join('; ') + '.' : 'No matching tasks are recorded in the requested scope.' };
    }
    const precise = resolveConcept(asked, { preciseOnly: true });
    if (precise) return conceptAnswer(state, precise);
  }

  const followsUp = /\bwhich one|\bwhich of (these|those|them)\b|\bwhat about\b/i.test(asked);

  if (asksTasks || (followsUp && context.subject === 'tasks')) {
    if (visit) {
      /* "Are any of her tasks similar to any other client?" */
      if (/\bsimilar|\bcompare|\bsame as|\blike (any|another)\b/i.test(asked)) {
        return { intent: 'similar', text: similarityAnswer(state, visit) };
      }

      /* "What other task does she have?" — other than the one just discussed. */
      if (/\bother\b|\banother\b/i.test(asked)) {
        return { intent: 'other-tasks', text: otherTasksAnswer(visit, context.task) };
      }

      return { intent: 'tasks', text: taskAnswer(visit, asked) };
    }

    /* A round-wide search only when there is something to search for. */
    const words = searchWords(asked);
    if (words.length > 0 && !followsUp) {
      const search = roundTaskSearch(state, asked);
      if (search) return { intent: 'task-search', text: search };

      /* Nothing literal, and nothing in the service titles. A broader concept
         is the last honest reading before reporting no match. */
      const broad = resolveConcept(asked);
      if (broad) return conceptAnswer(state, broad);

      return { intent: 'task-search', text: `No task on today’s round mentions ${oxford(words)}.` };
    }

    return {
      intent: 'clarify',
      text: 'Which visit did you mean? Tell me the person and I’ll list their tasks.',
    };
  }

  /* --- One person ------------------------------------------------------- */

  if (visit) {
    if (subject === 'service') return { intent: 'service', text: `${visit.name}: ${visit.type}.` };
    if (/\b(done|complete|completed|finish|finished)\b/i.test(asked)) {
      return { intent: 'completion', text: completionSentence(visit) };
    }

    if (/\b(find|locate|search|address|postcode|district|live|lives)\b|\bwhere/i.test(asked)) {
      return {
        intent: 'find',
        text: `${describe(visit)}, at ${visit.address}, ${visit.district} ${visit.postcode}.`,
      };
    }

    if (/\brefer/i.test(asked)) {
      return { intent: 'find', text: `${visit.name}’s visit reference is ${visit.reference}.` };
    }

    /* Only when this question actually points at the person or the visit —
       an explicit name, a pronoun, or "that visit". A bare "what's the time?"
       is settled above. */
    if (/\btime\b|\bwhen\b/i.test(asked)
      && (found?.visit || carry || PRONOUN.test(asked) || DEICTIC.test(asked))) {
      return {
        intent: 'person-time',
        text: `${visit.name}’s visit is scheduled ${slot(visit)} (${label(visit)}).`,
      };
    }

    return {
      intent: 'person',
      text: `${visit.name} is on today’s round: ${visit.type}, ${slot(visit)}, `
        + `${visit.reference} (${label(visit)}).`,
    };
  }

  /* --- Round-wide ------------------------------------------------------- */

  if (/\b(active|ongoing|in progress|en ?route|travelling)\b/i.test(asked)) {
    const { active } = schedule;
    return {
      intent: 'active',
      text: active
        ? `The active visit is ${describe(active)}.`
        : 'No visit is active. Start travelling to a planned visit to make one active.',
    };
  }

  if (/\bnext\b/i.test(asked) || /\bwho should i\b/i.test(asked)
    || /\bwhere am i going\b/i.test(asked) || /\bfirst\b/i.test(asked)) {
    return { intent: 'next', text: nextVisitSentence(state) };
  }

  if (/\bpriorit/i.test(asked)) {
    const priority = priorityVisits(state);
    return {
      intent: 'priority',
      text: priority.length
        ? `Marked Priority: ${withTime(priority)}.`
        : 'No visit on this round is marked Priority.',
    };
  }

  if (kind === 'lookup') {
    const search = roundTaskSearch(state, asked);
    if (search) return { intent: 'task-search', text: search };
  }

  for (const [pattern, status, word] of [
    [/\bplanned\b/i, 'planned', 'planned'],
    [/\bcancelled\b/i, 'cancelled', 'cancelled'],
    [/\bcomplete/i, 'completed', 'completed'],
  ]) {
    if (!pattern.test(asked)) continue;
    const matching = byStatus(state, status);
    return {
      intent: status,
      text: matching.length
        ? `${matching.length} ${word}: ${withTime(matching)}.`
        : `No visits are ${word}.`,
    };
  }

  /* Services, before the generic close-out: "which visits include personal
     care?" is answerable from the visit types. */
  const services = matchServices(state, asked);
  if (services.length > 0) {
    const types = [...new Set(services.map((v) => v.type))];
    return {
      intent: 'service',
      text: `${plural(services.length, 'visit')} for ${oxford(types)}: ${withTime(services)}.`,
    };
  }

  if (/\b(how many|count|remaining|left|resolved|summary|so far)\b/i.test(asked)) {
    const { completed, cancelled, resolved, total, remaining } = counts(state);
    return {
      intent: 'counts',
      text:
        `Of ${total} visits: ${completed} completed, ${cancelled} cancelled, `
        + `${resolved} resolved and ${remaining} still to go.`,
    };
  }

  if (kind === 'mutation') {
    return {
      intent: 'mutation',
      text:
        'I can’t change anything in the app — I can only read the round. Open the visit from '
        + 'Today or Visits and use the controls there.',
    };
  }

  /*
   * A last look at the checklists before giving up.
   *
   * The search above is gated on lookup phrasing, which "any dressings to
   * check?" does not have — it is a question about what is recorded all the
   * same. Running it again here costs nothing when nothing matches, and
   * answering from the round beats declining to.
   */
  if (kind !== 'lookup' && !['count', 'completion', 'explain'].includes(operation) && !['schedule', 'status', 'control', 'duration'].includes(subject)) {
    const late = roundTaskSearch(state, asked);
    if (late) return { intent: 'task-search', text: late };
  }

  return { text: UNSUPPORTED_ANSWER, intent: 'unsupported' };
}

/**
 * Answer `question` from `state`.
 *
 * Returns `{ text, intent }`. `state` is never written to.
 *
 * A question may carry more than one request — "who is next and how many
 * tasks do they have?" — and answering only the first silently drops half of
 * it. Each clause is answered in turn, with the visit the previous clause
 * settled on carried forward so a pronoun in the second still resolves. If any
 * clause cannot be answered the whole sentence is answered instead, because a
 * bad split should never cost a good answer.
 */
export function answerLocally(question, state) {
  const selection = answerSelection(question, state);
  if (selection) return selection;

  let input = normalise(question);
  const prior = previousQuestion(state, input);
  const priorReading = prior ? interpret(prior) : null;
  const lastReply = [...(state.assistant?.messages ?? [])].reverse().find((m) => m.role === 'assistant');
  const namedResults = lastReply ? allVisits(state).filter((v) => lastReply.text.includes(v.name))
    .sort((a, b) => lastReply.text.indexOf(a.name) - lastReply.text.indexOf(b.name)) : [];
  const ordinal = input.match(/\b(?:the )?(first|second|third) one\b/i);
  if (ordinal && namedResults.length) {
    const selected = namedResults[['first', 'second', 'third'].indexOf(ordinal[1].toLowerCase())];
    if (!selected) return { intent: 'clarify', text: 'There is no result at that position. Which listed person did you mean?' };
    input = input.replace(ordinal[0], selected.name);
  }
  if (/^not\s+.+(?:—|-|,)\s*the other person[?.!]*$/i.test(input)) {
    const excluded = recognisePerson(input, allVisits(state))?.visit;
    const rest = namedResults.filter((v) => v.id !== excluded?.id);
    if (rest.length !== 1) return { intent: 'clarify', text: 'Which other person did you mean?' };
    input = `${priorReading?.subject === 'task' ? 'What tasks does' : 'Tell me about'} ${rest[0].name}`;
  }
  if (/^tasks,? not visits[.!?]*$/i.test(input) && prior) input = prior.replace(/\bvisits?\b/gi, 'tasks');
  else if (/^only (the )?(planned|completed|cancelled|arrived) ones[.!?]*$/i.test(input) && prior) {
    const status = input.match(/planned|completed|cancelled|arrived/i)[0];
    input = `${prior.replace(/\b(planned|completed|cancelled|arrived)\b/gi, '')} ${status} visits`;
  } else if (/^i meant /i.test(input)) {
    input = `${priorReading?.subject === 'task' ? 'What tasks were in' : 'Who is'} ${input.replace(/^i meant /i, '')}`;
  } else if (priorReading && recognisePerson(input, allVisits(state))?.visit
    && (/^(and|what about)\b/i.test(input) || /Which visit|Which person/i.test(lastReply?.text ?? ''))) {
    const person = recognisePerson(input, allVisits(state)).visit;
    const subject = priorReading.subject;
    input = subject === 'task' ? `${priorReading.operation === 'count' ? 'How many' : 'What'} tasks does ${person.name} have?`
      : subject === 'schedule' ? `What time is ${person.name}'s visit?`
        : subject === 'address' ? `What is ${person.name}'s address?` : input;
  }
  if (/^any more[?.!]*$/i.test(input) && namedResults.length && prior) {
    const reading = interpret(prior);
    if (reading.subject === 'task' || resolveConcept(prior)) {
      const records = selectRecords(state, reading);
      const rest = records.matchingVisits.filter((v) => !namedResults.some((named) => named.id === v.id));
      return { intent: 'any-more', text: rest.length ? `${plural(rest.length, 'other visit')}: ${nameList(rest)}.` : 'No more matching visits are recorded in that result set.' };
    }
  }
  const clauses = splitClauses(input);


  if (clauses.length > 1) {
    const parts = [];
    let carry = null;

    for (const clause of clauses) {
      const answer = answerOne(clause, state, carry);
      if (answer.intent === 'unsupported' || answer.intent === 'clarify') {
        parts.length = 0;
        break;
      }

      parts.push(answer);
      /* Whoever the clause just answered about, read back out of its own
         wording — so "and how many tasks do they have?" has a referent. */
      carry = recognisePerson(answer.text, allVisits(state))?.visit ?? carry;
    }

    if (parts.length === clauses.length) {
      /* A refusal answers the whole sentence: it is not one part of it. */
      const refusal = parts.find((part) => part.intent === 'clinical' || part.intent === 'disclosure');
      if (refusal) return { text: refusal.text, intent: refusal.intent };

      const seen = new Set();
      const text = parts
        .map((part) => part.text)
        .filter((line) => (seen.has(line) ? false : seen.add(line)))
        .join(' ');

      return { text, intent: parts.length > 1 ? 'compound' : parts[0].intent };
    }
  }

  const answer = answerOne(input, state);
  const explicit = recognisePerson(input, allVisits(state))?.visit;
  if (['task-totals', 'tasks'].includes(answer.intent) && !interpret(input).target.kind) {
    const query = readSelection(input, explicit);
    const records = executeSelection(state, query);
    answer.context = { query, visitIds: records.visits.map(v => v.id), taskIds: records.tasks.map(e => [e.visit.id, e.task.id]) };
  }
  if (answer.intent === 'task-detail') {
    const refs = allVisits(state).flatMap(v => v.tasks.filter(t => answer.text.includes(t.label) && answer.text.includes(v.name)).map(t => [v.id, t.id]));
    if (refs.length) answer.context = { taskIds: refs, visitIds: [...new Set(refs.map(r => r[0]))], property: interpretTaskDetail(input).property };
  } else if (/reason|cancel/i.test(input) && explicit && explicit.status === 'cancelled' && answer.intent !== 'mutation') {
    answer.context = { field: 'cancellation', visitIds: [explicit.id] };
  } else if (interpret(input).target.kind === 'neighbour') {
    const target = resolveTarget(state, interpret(input).target);
    if (target?.visit) answer.context = { visitIds: [target.visit.id], property: interpretTaskDetail(input).property };
  }

  /*
   * An answer that named a set records that set.
   *
   * Without it "how many is that?" has nothing to agree with and recounts the
   * whole round, which contradicts the list the reader is looking at. A search
   * that found nothing records the empty set for the same reason.
   */
  const SET_ANSWERS = ['planned', 'completed', 'cancelled', 'priority', 'task-search', 'service'];
  if (!answer.context && SET_ANSWERS.includes(answer.intent)) {
    const named = allVisits(state).filter((v) => answer.text.includes(v.name));
    /* Task identity too, where the answer named tasks — a follow-up about the
       result is then about those tasks, not about the parent visits. */
    const tasks = named.flatMap((v) =>
      v.tasks.filter((t) => answer.text.includes(t.label)).map((t) => [v.id, t.id]));

    answer.context = {
      visitIds: named.map((v) => v.id),
      ...(tasks.length ? { taskIds: tasks } : {}),
    };
  }

  return answer;
}
