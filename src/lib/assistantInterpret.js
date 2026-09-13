/*
 * Reading a question before answering it.
 *
 * This module replaces the ad-hoc scope check that came before it, and it does
 * one job: turn a sentence into a small structured description of what was
 * asked. It selects no records and writes no text — those are the next two
 * stages, and keeping them apart is what stops a phrasing fix in one from
 * quietly changing the other.
 *
 * It is deliberately not a general parser. The round is a fixed, small domain
 * — seven visits, five statuses, a handful of recorded fields — and the
 * vocabulary that reaches it is the vocabulary of that domain. What follows is
 * a description of *this* app, not an attempt at English.
 *
 * The one rule the whole file serves: what the question states explicitly is
 * settled, and conversation context may only fill what it left out.
 */

import { readComparison, readQuantity, isWorkRemaining } from './assistantQueries';
import { classify } from './assistantIntent';

/* --- Normalisation ------------------------------------------------------- */

/*
 * Meaning-preserving only.
 *
 * Curly apostrophes become straight ones because phones produce them by
 * default and every pattern below is written with the plain one; whitespace is
 * collapsed. Case is left alone — the raw sentence is still needed to tell a
 * capitalised name from an ordinary noun.
 */
export function normalise(question) {
  return (question ?? '')
    .replace(/[‘’ʼ]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
}

/* --- Subject ------------------------------------------------------------- */

/*
 * What the question is about.
 *
 * First match wins, so the order is the priority: "how long is that visit?" is
 * a duration question rather than a visit question, and "how do I cancel?" is
 * a control question rather than a cancellation one.
 */
const SUBJECTS = [
  ['conversation', /\b(question|questions|message|messages)\b/i],
  ['control', /\bhow (do|can) (i|you)\b|\bwhat happens (if|when)\b|\bhow does .* work\b|\bwhy (can'?t|is|are|does)\b|\bwhere (do|can) i (find|tap|press)\b/i],
  ['duration', /\bhow long\b|\bduration\b|\bhow many minutes\b|\b(longest|shortest)\b/i],
  ['progress', /\bprogress\b|\bhow far\b|\bso far\b/i],
  ['cancellation', /\bcancel/i],
  ['contact', /\b(ring|rings|ringing|call|calls|calling|phone|phoning|telephone|contact(ed|ing|s)?)\b/i],
  ['task', /\btask|\bchecklist\b|\btick|\bto ?do\b/i],
  ['note', /\bnote|\bwarning|\baccess\b/i],
  ['address', /\b(address|postcode|district|where (is|does|do)|live|lives)\b/i],
  ['reference', /\brefer(ence)?\b/i],
  ['priority', /\bpriorit/i],
  ['service', /\b(service|type of visit|what kind of visit)\b/i],
  ['schedule', /\b(schedule|shift|rota|when\b|what time|order)\b/i],
  ['status', /\b(status|planned|completed|cancelled|arrived|en ?route|travelling|active|ongoing|in progress|finished|done|outstanding|remaining)\b/i],
  ['visit', /\b(visits?|clients?|patients?|people|round|appointments?)\b/i],
];

export function readSubject(text) {
  if (/\b(tasks?|checklist)\b/i.test(text) && !/\bhow (do|can)|\bwhy|\bwhat happens/i.test(text)) return 'task';
  for (const [subject, pattern] of SUBJECTS) {
    if (pattern.test(text)) return subject;
  }
  return null;
}

/* --- Operation ----------------------------------------------------------- */

/*
 * What is being asked for.
 *
 * A count is not a search. "How many tasks in total do I have today?" asks for
 * a number, and reading it as a lookup is what produced a hunt for a task
 * whose label contained the word "total".
 */
const OPERATIONS = [
  ['explain', /\bhow (do|can) (i|you)\b|\bwhat happens (if|when)\b|\bhow does\b|\bwhy (can'?t|is|are|does|do)\b|\bexplain\b/i],
  ['comparison', /\b(more|fewer|less) than\b|\bat (least|most)\b|\bexactly\b|\b(longest|shortest)\b/i],
  ['count', /\bhow many\b|\bhow much\b|\bnumber of\b|\bcount\b|\btotal\b/i],
  ['completion', /\b(has|have|is|are|was|were)\b[^?]*\b(been )?(completed?|done|finished|ticked)\b/i],
  ['existence', /\b(is|are) there\b|\b(does|do) (anyone|anybody|any)\b|\bany\b.*\?|\bdo i (have|need)\b/i],
  ['list', /\b(list|show|what are|which are|tell me)\b|\bwhat (tasks|visits|notes)\b/i],
  ['identify', /\bwho\b|\bwhich\b|\bwhat\b|\bwhen\b|\bwhere\b/i],
];

export function readOperation(text) {
  for (const [operation, pattern] of OPERATIONS) {
    if (pattern.test(text)) return operation;
  }
  return null;
}

/* --- Temporal sense and target ------------------------------------------- */

/* Words that settle the reading outright, whatever the auxiliary verb says. */
const EXPLICIT_SCHEDULED = /\bscheduled\b|\bfinal\b|\bon the (schedule|rota)\b|\bin the schedule\b/i;
const EXPLICIT_COMPLETED =
  /\b(just (finish|finished|complete|completed|did|done))\b|\bdid i (last |just )?(visit|see|finish|complete)\b|\blast (visit|see|saw)ed?\b|\bmost recently (completed|finished)\b/i;
const PAST_AUXILIARY = /\b(was|were|did|had)\b/i;

/*
 * Which visit the question points at.
 *
 * `kind` is one of:
 *   'person'            a name appears; the caller resolves it
 *   'active'            the visit in hand
 *   'next'              the approved active-first reading of "next"
 *   'after-current'     the visit that follows the one in hand
 *   'previous-completed' the most recently completed visit
 *   'final-scheduled'   the last entry by schedule, resolved or not
 *   'last-remaining'    the last unresolved visit
 *   'neighbour'         positioned against a named person in the schedule
 *   'result-set'        whatever the previous answer returned
 *   null                nothing positional was stated
 */
export function readTarget(text) {
  if (/\b(any more|anyone else|anybody else|any others|is (it|that|this) just)\b/i.test(text)) {
    return { kind: 'result-set' };
  }

  const neighbour = text.match(/\b(before|after)\s+([a-z][a-z'’-]+)/i);
  if (neighbour && !/^(noon|midday|visiting|arrival|arriving|the|my|this|that|a)$/i.test(neighbour[2]) && !/\bafter (this|that|my|the)\b/i.test(text)) {
    return { kind: 'neighbour', side: neighbour[1].toLowerCase(), name: neighbour[2] };
  }

  /* "After my current visit", "who comes after this one?", "next Planned
     visit" — all explicitly ask past the visit in hand, so none of them may
     answer with the visit in hand. */
  if (/\bafter (this|that|my current|the current|the active)\b/i.test(text)
    || /\bcomes after\b/i.test(text)
    || /\bnext planned\b/i.test(text)) {
    return { kind: 'after-current' };
  }

  if (/\b(active|current|ongoing|in progress|en ?route|travelling)\b/i.test(text)
    && !/\bafter\b/i.test(text)) {
    return { kind: 'active' };
  }

  if (/\b(last|final)\b/i.test(text)) {
    if (/\bremaining\b|\bleft\b|\bstill\b/i.test(text)) return { kind: 'last-remaining' };
    if (EXPLICIT_SCHEDULED.test(text)) return { kind: 'final-scheduled' };
    if (EXPLICIT_COMPLETED.test(text)) return { kind: 'previous-completed' };
    /*
     * Tense decides only what no explicit word already has. "Who was my last
     * visit?" looks backwards; "who is my last visit today?" looks at the
     * timetable. Neither reading is hardcoded to a verb — the words above
     * outrank it whenever they appear.
     */
    return { kind: PAST_AUXILIARY.test(text) ? 'previous-completed' : 'final-scheduled' };
  }

  if (EXPLICIT_COMPLETED.test(text)) return { kind: 'previous-completed' };
  if (/\b(previous|earlier|prior)\b/i.test(text)) return { kind: 'previous-completed' };
  if (/\bnext\b|\bwho should i (go to|see|visit)\b|\bwhere am i going\b/i.test(text)) {
    return { kind: 'next' };
  }
  if (/\bfirst\b/i.test(text) && /\bremain|\bleft\b|\bstill\b/i.test(text)) {
    return { kind: 'first-remaining' };
  }

  return { kind: null };
}

/* --- Filters ------------------------------------------------------------- */

const STATUS_WORDS = [
  ['planned', /\bplanned\b/i],
  ['completed', /\bcompleted?\b|\bfinished\b/i],
  ['cancelled', /\bcancelled\b/i],
  ['arrived', /\barrived\b/i],
  ['en-route', /\ben ?route\b|\btravelling\b/i],
];

/**
 * Status, checked-state and priority conditions the question sets.
 *
 * `done` is true for "checked"/"completed" tasks, false for outstanding ones
 * and null when the question does not say.
 */
export function readFilters(text) {
  const status = STATUS_WORDS.filter(([, pattern]) => pattern.test(text)).map(([name]) => name);

  let done = null;
  if (isWorkRemaining(text) || /\b(outstanding|unchecked|unticked|remaining|still (to do|due|left)|not (yet )?(done|completed|ticked)|left to do)\b/i.test(text)) {
    done = false;
  } else if (/\b(checked|ticked|already done|completed tasks?|done tasks?)\b/i.test(text)) {
    done = true;
  }

  return {
    status,
    done,
    priority: /\bpriorit/i.test(text) ? true : null,
  };
}

/* --- Negation and conjunction -------------------------------------------- */

export const hasNegation = (text) =>
  /\b(not|no|none|never|without|isn'?t|aren'?t|don'?t|doesn'?t|didn'?t|haven'?t|hasn'?t|nobody|no one|nothing)\b/i
    .test(text);

/*
 * Splitting a compound question.
 *
 * "Who is next and how many tasks do they have?" is two questions sharing a
 * subject, and answering only the first silently drops half of what was asked.
 * Split only where both sides can stand as questions of their own, so ordinary
 * conjunctions inside one clause — "washing and dressing", "planned and
 * cancelled" — are left intact.
 */
const CLAUSE_OPENER =
  /\b(who|what|which|when|where|how many|how much|how long|how do|is there|are there|does|do|can)\b/i;

export function splitClauses(text) {
  const parts = text.split(/\s*(?:\band\b|\bbut\b|;|,\s*(?=and\b))\s*/i);
  if (parts.length < 2) return [text];

  const clauses = [];
  for (const part of parts) {
    const trimmed = part.trim();
    if (trimmed === '') continue;

    if (clauses.length > 0 && CLAUSE_OPENER.test(trimmed)) {
      clauses.push(trimmed);
    } else if (clauses.length === 0) {
      clauses.push(trimmed);
    } else {
      /* Not a question of its own — it belongs to the clause before it. */
      clauses[clauses.length - 1] += ` and ${trimmed}`;
    }
  }

  return clauses.length > 0 ? clauses : [text];
}

/* --- Scope --------------------------------------------------------------- */

/*
 * Wording that hands the subject to a person already under discussion.
 *
 * Checked before the round-wide wording below, because a pronoun is an
 * explicit reference: "are any of her tasks similar to any other client?" says
 * "any" twice and is still a question about one person.
 *
 * "it" is deliberately absent. It refers to a person far less often than to a
 * visit, a task or the round itself.
 */
const PERSONAL = /\b(she|he|they|her|hers|his|their|theirs|them)\b/i;

/* Pointing at the visit or task under discussion without naming it. */
const DEICTIC =
  /\b(that|this|the same) (visit|client|patient|task|one|appointment)\b|\bthe (other|first|second|third|last) (one|task|tasks|visit)\b/i;

/* Wording that puts the whole round in scope and so may never be narrowed. */
const ROUND = [
  /\b(anyone|anybody|everyone|everybody|no one|nobody)\b/i,
  /\bany(?:\s+[a-z-]+){0,3}\s+(clients?|patients?|visits?|tasks?|notes?|one)\b/i,
  /\bwho (has|have|is|are|was|were|needs?|do|does|did)\b/i,
  /\bwhich (visits?|clients?|patients?|of my|of the)\b/i,
  /\bhow many\b|\bhow much\b/i,
  /\b(today'?s|my|the) (round|day|visits|clients|schedule)\b/i,
  /\ball (of )?(the |my )?(clients?|patients?|visits?|tasks?|them)\b/i,
  /\b(more|fewer|less) than\b|\bat (least|most)\b/i,
  /\bacross (the|today'?s|my)\b/i,
  /\bin total\b|\btotal\b/i,
];

const CONVERSATION = [
  /\b(what|which|repeat)\b[^?]*\b(question|questions|message|messages)\b[^?]*\b(i|my|we)\b/i,
  /\bwhat did (i|we) (just )?(ask|say)\b/i,
  /\bmy (last|previous|first|earlier) (question|message)\b/i,
  /\b(last|previous|earlier) (question|message) (i|we)\b/i,
  /\brepeat (my|the) (last|previous) (question|message)\b/i,
];

const any = (patterns, text) => patterns.some((pattern) => pattern.test(text));

/*
 * Positional scopes: a particular visit, named by position rather than person.
 * These are explicit too, so context may not overrule them either.
 */
const POSITIONAL = [
  'next', 'active', 'after-current', 'previous-completed',
  'final-scheduled', 'last-remaining', 'first-remaining', 'neighbour',
];

export function readScope(text, target) {
  if (any(CONVERSATION, text)) return 'conversation';
  if (target && POSITIONAL.includes(target.kind)) return 'positional';
  if (PERSONAL.test(text) || DEICTIC.test(text)) return 'person';
  if (any(ROUND, text)) return 'round';
  if (target && POSITIONAL.includes(target.kind)) return 'positional';
  if (target?.kind === 'result-set') return 'result-set';
  return null;
}

/**
 * Whether conversational context may supply the person for this question.
 *
 * Only when the question did not settle the point itself. A round-wide,
 * positional or conversational scope is an answer to "who is this about?",
 * and context does not get to overrule it.
 */
export function contextMayFillPerson(scope) {
  return scope === null || scope === 'person';
}

/* --- The whole reading --------------------------------------------------- */

/**
 * A structured description of a question.
 *
 * Everything downstream reads this rather than the sentence, so the record
 * selectors never see wording and the phrasing never sees a regular
 * expression.
 */
export function interpret(question) {
  const text = normalise(question);
  const target = readTarget(text);
  const scope = readScope(text, target);

  return {
    text,
    boundary: classify(text),
    subject: readSubject(text),
    operation: readOperation(text),
    target,
    scope,
    filters: readFilters(text),
    negated: hasNegation(text),
    quantity: readQuantity(text),
    comparator: readComparison(text),
    conjunction: /\bor\b/i.test(text) ? 'or' : 'and',
    clauses: splitClauses(text),
  };
}
