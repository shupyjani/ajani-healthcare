import { SHIFT } from './demoVisits';
import { STATUS_LABELS, activeVisit, primaryVisit, progress, scheduleMinutes } from './demoState';

/*
 * Reusable questions about the round.
 *
 * Every helper here reads the current state and returns data — never text and
 * never a modified state. The assistant's phrasing lives next door; this file
 * is what it phrases, so an equivalent question asked three different ways
 * reaches the same selector and gets the same facts.
 *
 * Nothing is hardcoded to a particular person. Priya, Halina, Ivor and
 * Terrence appear nowhere below: every answer is derived from whatever the
 * round currently holds.
 */

/* Statuses that are behind the practitioner rather than ahead of them. */
const RESOLVED = new Set(['completed', 'cancelled']);

export const isWorkRemaining = text => /\b(still (?:need doing|to do|due)|left to do|not done yet|outstanding work|work (?:left|remaining)|tasks? (?:are )?left|remaining tasks?)\b/i.test(text);

export const label = (visit) => STATUS_LABELS[visit.status] ?? visit.status;

export function allVisits(state) {
  return [...state.visits].sort((a, b) => scheduleMinutes(a.start) - scheduleMinutes(b.start));
}

/* --- Text matching ------------------------------------------------------ */

/*
 * Words too common to narrow anything, plus the vocabulary of asking.
 * Kept separate from the name stop-list: this one is about *searching*.
 */
const NOISE = new Set([
  'the', 'a', 'an', 'and', 'or', 'of', 'to', 'for', 'in', 'on', 'at', 'by',
  'with', 'any', 'all', 'some', 'my', 'me', 'i', 'is', 'are', 'was', 'were',
  'do', 'does', 'did', 'has', 'have', 'had', 'need', 'needs', 'needed',
  'require', 'requires', 'required', 'who', 'what', 'which', 'whose', 'how',
  'many', 'much', 'today', 'visit', 'visits', 'task', 'tasks', 'client',
  'clients', 'patient', 'patients', 'person', 'people', 'anyone', 'anybody',
  'someone', 'somebody', 'left', 'remaining', 'still', 'been', 'be', 'get',
  'their', 'his', 'her', 'this', 'that', 'these', 'those', 'include',
  'includes', 'including', 'about', 'there', 'it', 'one', 'ones',
  'complete', 'completed', 'completes', 'done', 'finish', 'finished',
  'outstanding', 'ticked', 'regarding', 'related', 'similar', 'other',
]);

/*
 * A small operational vocabulary.
 *
 * Deliberately generic rather than a set of special cases for the tasks this
 * round happens to contain: each entry is a word a practitioner might type for
 * something the data words differently. Nothing here maps one clinical idea
 * onto another — "med" and "medication" are the same word, "wound" and
 * "dressing" are not.
 */
const SYNONYMS = new Map(Object.entries({
  med: ['medication'],
  meds: ['medication'],
  medicine: ['medication'],
  ring: ['call', 'phone', 'contact'],
  phone: ['call', 'ring', 'contact'],
  contact: ['call', 'ring', 'phone'],
  call: ['ring', 'phone', 'contact'],
  stroll: ['walk'],
  bathe: ['wash'],
  shower: ['wash'],
  appointment: ['appointment', 'follow-up'],
  jab: ['injection'],
}));

/*
 * Light stemming: enough to let ordinary inflection through.
 *
 * "walking" has to find "Walk the hallway circuit twice" without the reader
 * reproducing the label, and "dressings" has to find "dressing". Longest
 * ending first, and never below three characters, so short words are left
 * alone rather than shredded.
 */
function stem(word) {
  for (const ending of ['ings', 'ing', 'ies', 'ed', 'es', 's']) {
    if (word.length - ending.length >= 3 && word.endsWith(ending)) {
      const base = word.slice(0, -ending.length);
      return ending === 'ies' ? `${base}y` : base;
    }
  }
  return word;
}

/** Every form of a word worth looking for. */
function variants(word) {
  const base = stem(word);
  const found = new Set([word, base]);

  for (const key of [word, base]) {
    for (const synonym of SYNONYMS.get(key) ?? []) {
      found.add(synonym);
      found.add(stem(synonym));
    }
  }

  return [...found].filter((form) => form.length >= 3);
}

/*
 * Loose word equality.
 *
 * A word matches text if any of its forms appears in it, so "walking" finds
 * "Walk…", "dressings" finds "dressing" and "meds" finds "medication".
 */
function alike(word, text) {
  return variants(word).some((form) => (text.match(/[a-z]+/g) ?? []).some((token) => variants(token).includes(form)));
}

export function searchWords(phrase) {
  return (phrase.toLowerCase().replace(/['\u2019]/g, '').match(/[a-z][a-z-]{1,}/g) ?? [])
    .flatMap((word) => word.split('-'))
    .filter((word) => word.length >= 3 && !NOISE.has(word));
}

const taskText = (task) => `${task.label} ${task.hint ?? ''}`.toLowerCase();

/**
 * Tasks across the round matching a phrase.
 *
 * Tries for every word first, so "wound dressing" means both. Falls back to
 * any single word when that finds nothing, and says which it did — a loose
 * match is still useful, but the caller should be able to say so.
 */
export function matchTasks(state, phrase) {
  const words = searchWords(phrase);
  if (words.length === 0) return { matches: [], words, loose: false };

  const collect = (predicate) =>
    allVisits(state).flatMap((visit) =>
      visit.tasks.filter((task) => predicate(taskText(task))).map((task) => ({ visit, task })));

  const strict = collect((text) => words.every((word) => alike(word, text)));
  if (strict.length > 0) return { matches: strict, words, loose: false };

  const loose = collect((text) => words.some((word) => word.length >= 4 && alike(word, text)));
  return { matches: loose, words, loose: loose.length > 0 };
}

/** Visits whose service type matches a phrase. */
export function matchServices(state, phrase) {
  const words = searchWords(phrase);
  if (words.length === 0) return [];

  return allVisits(state).filter((visit) => {
    const text = visit.type.toLowerCase();
    return words.every((word) => alike(word, text));
  });
}

/** Visits whose operational notes match a phrase. */
export function matchNotes(state, phrase) {
  const words = searchWords(phrase);
  if (words.length === 0) return [];

  return allVisits(state)
    .map((visit) => ({
      visit,
      notes: visit.notes.filter((note) => {
        const text = note.toLowerCase();
        return words.some((word) => alike(word, text));
      }),
    }))
    .filter((entry) => entry.notes.length > 0);
}

export function visitsWithNotes(state) {
  return allVisits(state).filter((visit) => visit.notes.length > 0);
}

/*
 * Anything recorded that asks the practitioner to make contact first.
 *
 * Searched across notes and task text rather than kept as a list, so it
 * reflects whatever the round actually says.
 */
/*
 * Matched at a word boundary, not as a substring: "hearing" contains "ring",
 * and a note about someone being hard of hearing is not an instruction to
 * telephone them.
 */
const CONTACT_PATTERNS = [/\bring/i, /\bcall/i, /\bphone/i, /\bcontact/i, /\bduty line/i, /\bescalat/i];

export function contactInstructions(state) {
  return allVisits(state)
    .map((visit) => {
      const notes = visit.notes.filter((note) =>
        CONTACT_PATTERNS.some((pattern) => pattern.test(note)));
      const tasks = visit.tasks.filter((task) =>
        CONTACT_PATTERNS.some((pattern) => pattern.test(taskText(task))));
      return { visit, notes, tasks };
    })
    .filter((entry) => entry.notes.length > 0 || entry.tasks.length > 0);
}

/* --- Tasks for one person ----------------------------------------------- */

export function taskSummary(visit) {
  const done = visit.tasks.filter((task) => task.done);
  const remaining = visit.tasks.filter((task) => !task.done);

  return {
    all: visit.tasks,
    done,
    remaining,
    total: visit.tasks.length,
    allDone: visit.tasks.length > 0 && remaining.length === 0,
  };
}

/** A named task on one visit, matched loosely. */
export function findTask(visit, phrase) {
  const words = searchWords(phrase);
  if (words.length === 0) return null;

  return (
    visit.tasks.find((task) => words.every((word) => alike(word, taskText(task))))
    ?? visit.tasks.find((task) =>
      words.some((word) => word.length >= 4 && alike(word, taskText(task))))
    ?? null
  );
}

/* --- Schedule ------------------------------------------------------------ */

/** The visits still waiting, in schedule order. */
export function remainingVisits(state) {
  return allVisits(state).filter((visit) => !RESOLVED.has(visit.status));
}

/**
 * The facts a schedule question needs.
 *
 * `lastScheduled` is the final visit of the round whatever became of it, so
 * "when is my last visit" stays answerable after the day has been worked;
 * `lastRemaining` is the last one still waiting. The shift span is separate
 * from both, which is the distinction "what time should I be finished by"
 * turns on.
 */
export function scheduleFacts(state) {
  const visits = allVisits(state);
  const remaining = remainingVisits(state);
  const [shiftStart, shiftEnd] = SHIFT.hours.split('–');

  return {
    active: activeVisit(state),
    next: primaryVisit(state),
    firstRemaining: remaining[0] ?? null,
    lastRemaining: remaining.length ? remaining[remaining.length - 1] : null,
    lastScheduled: visits.length ? visits[visits.length - 1] : null,
    remaining,
    shiftStart,
    shiftEnd,
    shiftHours: SHIFT.hours,
    date: SHIFT.date,
  };
}

export function byStatus(state, status) {
  return allVisits(state).filter((visit) => visit.status === status);
}

export function priorityVisits(state) {
  return allVisits(state).filter((visit) => visit.priority);
}

export function counts(state) {
  return progress(state);
}

/* --- Quantities ---------------------------------------------------------- */

const NUMBER_WORDS = new Map(Object.entries({
  zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5,
  six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
}));

/** A count written as a digit or a word, or null. */
export function readQuantity(phrase) {
  const digits = phrase.match(/\b(\d{1,2})\b/);
  if (digits) return Number(digits[1]);

  for (const [word, value] of NUMBER_WORDS) {
    if (new RegExp(`\\b${word}\\b`, 'i').test(phrase)) return value;
  }

  return null;
}

/**
 * A run of visits the reader asked for by position and number.
 *
 * "my last two clients" is a request for two, and collapsing it to one would
 * be answering a different question. Returns null when the phrasing is not
 * asking for a run at all.
 */
export function quantifiedSchedule(state, phrase) {
  const visits = allVisits(state);
  const remaining = remainingVisits(state);
  const asked = phrase.toLowerCase();

  const count = readQuantity(asked);
  const wantsPlural = /\b(visits|clients|patients|people|ones)\b/.test(asked);
  const n = count ?? (wantsPlural ? null : 1);

  if (/\blast\b/.test(asked)) {
    if (n === null) return null;
    return { kind: 'last', visits: visits.slice(Math.max(0, visits.length - n)) };
  }

  if (/\bfirst\b/.test(asked)) {
    if (n === null) return null;
    const pool = /\bremain|\bleft\b|\bstill\b/.test(asked) ? remaining : visits;
    return { kind: 'first', visits: pool.slice(0, n) };
  }

  if (/\bnext\b/.test(asked) && (count !== null || wantsPlural)) {
    const primary = primaryVisit(state);
    const ordered = primary ? [primary, ...remaining.filter((v) => v.id !== primary.id)] : remaining;
    return { kind: 'next', visits: ordered.slice(0, n ?? ordered.length) };
  }

  if (/\bremaining\b|\bstill to (go|do)\b|\bleft to (visit|do)\b/.test(asked)) {
    return { kind: 'remaining', visits: remaining };
  }

  return null;
}

/* --- Similarity ---------------------------------------------------------- */

const taskWords = (task) => new Set(searchWords(taskText(task)));

/**
 * Tasks elsewhere on the round that genuinely resemble this visit's.
 *
 * Resemblance means shared recorded wording — at least `minShared` significant
 * words — and nothing else. Two visits having similar service names proves
 * nothing about their checklists, and one shared word is a coincidence rather
 * than a match: "Check wound dressing" and "Support with washing and dressing"
 * share a word and are not the same job. The bar is set where it will report
 * an operational overlap and decline to invent a clinical one.
 */
export function similarTasks(state, visit, minShared = 2) {
  const found = [];

  for (const task of visit.tasks) {
    const mine = taskWords(task);

    for (const other of allVisits(state)) {
      if (other.id === visit.id) continue;

      for (const candidate of other.tasks) {
        const shared = [...taskWords(candidate)].filter((word) => mine.has(word));
        if (shared.length >= minShared) {
          found.push({ task, other, candidate, shared });
        }
      }
    }
  }

  return found;
}

/* --- Duration ------------------------------------------------------------ */

const minutesOf = (clock) => {
  const [hours, minutes] = String(clock).split(':').map(Number);
  return hours * 60 + minutes;
};

/**
 * How long a visit is scheduled for, in minutes.
 *
 * Derived from the recorded start and end every time rather than stored, so a
 * duration can never drift out of step with the times shown beside it.
 */
export function durationMinutes(visit) {
  return minutesOf(visit.end) - minutesOf(visit.start);
}

/** The longest and shortest scheduled visits of the round. */
export function durationExtremes(state) {
  const visits = allVisits(state);
  if (visits.length === 0) return { longest: null, shortest: null };

  const sorted = [...visits].sort((a, b) => durationMinutes(a) - durationMinutes(b));
  return { shortest: sorted[0], longest: sorted[sorted.length - 1] };
}

/* --- Comparisons --------------------------------------------------------- */

const COMPARATORS = [
  ['more', /\b(more than|greater than|over|above)\b/i],
  ['fewer', /\b(fewer than|less than|under|below)\b/i],
  ['least', /\bat least\b/i],
  ['most', /\b(at most|no more than)\b/i],
  ['exactly', /\b(exactly|precisely|just)\b/i],
];

export const COMPARATOR_WORDS = {
  more: 'more than',
  fewer: 'fewer than',
  least: 'at least',
  most: 'at most',
  exactly: 'exactly',
};

const TEST = {
  more: (count, n) => count > n,
  fewer: (count, n) => count < n,
  least: (count, n) => count >= n,
  most: (count, n) => count <= n,
  exactly: (count, n) => count === n,
};

/**
 * A comparison the question makes, as `{ op, n }`, or null.
 *
 * The number has to be the one the comparator introduces — "more than 3 tasks
 * today" is a comparison against three, and reading any digit in the sentence
 * would just as happily compare against a clock time.
 */
export function readComparison(phrase) {
  const numbers = [...NUMBER_WORDS.keys()].join('|');

  for (const [op, pattern] of COMPARATORS) {
    const match = phrase.match(
      new RegExp(`${pattern.source}\\s+(\\d{1,2}|${numbers})\\b`, 'i'),
    );
    if (!match) continue;

    const raw = match[match.length - 1].toLowerCase();
    const n = /^\d+$/.test(raw) ? Number(raw) : NUMBER_WORDS.get(raw);
    if (n !== undefined) return { op, n };
  }

  return null;
}

/** Visits whose recorded task count satisfies a comparison. */
export function visitsByTaskCount(state, op, n) {
  const test = TEST[op];
  if (!test) return [];

  return allVisits(state).filter((visit) => test(visit.tasks.length, n));
}

/* --- Task concepts ------------------------------------------------------- */

/*
 * The actions this round actually records, and the ones it does not.
 *
 * Two regular expressions each: `asks` is tested against the question, `label`
 * against the recorded task. Keeping them apart is the point. A question about
 * administering medication is a real question whose honest answer here is
 * "nothing records that" — and the only way to say so is to look for
 * administration specifically rather than for the word "medication".
 *
 * `related` names the concept to offer instead, so an absence is useful rather
 * than merely correct: no task administers medication, and two prompt it.
 *
 * Ordered most specific first. "Administer medication" must be read before
 * "medication", and "wound dressing" before "dressing".
 */
export const TASK_CONCEPTS = [
  {
    id: 'hygiene',
    asks: /\b(?:personal\s+)?hygiene\b/i,
    label: /\b(wash|washing|bath|bathing|shower|oral hygiene|brush(?:ing)? (?:the |their )?teeth)\b/i,
    noun: 'personal hygiene',
  },
  {
    id: 'mobility',
    asks: /\bmobility\b/i,
    label: /\b(walk|walking|hallway|seated exercises|mobility exercises)\b/i,
    noun: 'mobility',
  },
  {
    id: 'medication-administer',
    precise: true,
    asks: /\b(administer|administering|administration|give|giving|dispense|dispensing|hand out)\b[^?]*\b(med|meds|medication|medicines?|drugs?|tablets?|dose|doses)\b/i,
    label: /\b(administer|administering|dispense|dispensing|inject|injection)\b/i,
    noun: 'administering medication',
    related: 'medication-prompt',
  },
  {
    id: 'medication-prompt',
    precise: true,
    asks: /\bprompt(ing|s)?\b[^?]*\b(med|meds|medication|medicines?)\b|\bmedication prompt/i,
    label: /\bprompt\b[^.]*\b(medication|medicine|meds)\b/i,
    noun: 'prompting medication',
  },
  {
    id: 'medication',
    asks: /\b(med|meds|medication|medications|medicine|medicines|tablets?|prescription|blister pack|dose|doses)\b/i,
    label: /\b(medication|medicine|meds|blister pack|prescription|dose|doses)\b/i,
    noun: 'medication',
  },
  {
    id: 'wound-treatment',
    precise: true,
    asks: /\b(change|changing|treat|treating|redress|redressing|clean|cleaning)\b[^?]*\b(wound|dressing)\b/i,
    label: /\b(change|treat|redress|clean)\b[^.]*\b(wound|dressing)\b/i,
    noun: 'changing or treating a wound dressing',
    related: 'wound-dressing',
  },
  {
    id: 'wound-dressing',
    precise: true,
    asks: /\bwound\b|\bwound[- ]care\b/i,
    label: /\bwound\b/i,
    noun: 'wound care',
  },
  {
    id: 'personal-dressing',
    precise: true,
    asks: /\b(dress|dressing|dressed)\b[^?]*\b(patient|client|person|them|him|her)\b|\b(get|getting|help(ing)? (them|him|her)) dressed\b|\bchange of clothes\b|\bpersonal dressing\b/i,
    label: /\b(washing and dressing|change of clothes|get(ting)? dressed)\b/i,
    noun: 'personal dressing',
  },
  {
    id: 'washing',
    asks: /\b(wash|washing|washed|bathe|bathing|bath|shower|showering|personal care)\b/i,
    label: /\b(wash|washing|bath|bathing|shower|personal care)\b/i,
    noun: 'washing',
  },
  {
    id: 'feeding',
    precise: true,
    asks: /\b(feed|feeding|fed|assist(ing)? with (eating|meals?)|help (them|him|her) eat|spoon)\b/i,
    label: /\b(feed|feeding|assist[^.]*eating|spoon)\b/i,
    noun: 'feeding a client directly',
    related: 'food-preparation',
  },
  {
    id: 'food-preparation',
    asks: /\b(food|meal|meals|breakfast|lunch|dinner|drink|drinks|cook|cooking|prepare|preparing)\b/i,
    label: /\b(breakfast|meal|hot drink|food|cook)\b/i,
    noun: 'preparing food or drink',
  },
  {
    id: 'walking',
    asks: /\b(walk|walks|walking|walked|hallway|corridor|circuit|stroll|mobilit)\b/i,
    label: /\b(walk|walking|hallway|circuit)\b/i,
    noun: 'walking',
  },
  {
    id: 'exercise',
    asks: /\b(exercise|exercises|exercising|seated exercises)\b/i,
    label: /\b(exercise|exercises)\b/i,
    noun: 'exercise',
  },
  {
    id: 'contact-task',
    asks: /\b(ring|ringing|call|calling|phone|phoning|contact|contacting)\b/i,
    label: /\b(ring|call|phone|contact)\b/i,
    noun: 'making contact',
  },
  {
    id: 'equipment',
    asks: /\b(equipment|alarm|pendant|rail|frame|jug|check(ing)? the)\b/i,
    label: /\b(alarm|pendant|rail|frame|jug|bin)\b/i,
    noun: 'an equipment check',
  },
  {
    id: 'records',
    asks: /\b(record|records|recording|log|logging|note|notes|review|reviewing|paperwork|diaris)\b/i,
    label: /\b(record|log|note|notes|review|diaris)\b/i,
    noun: 'recording or reviewing',
  },
];

const conceptById = new Map(TASK_CONCEPTS.map((concept) => [concept.id, concept]));

/**
 * The concept a question is asking about, most specific first, or null.
 *
 * `preciseOnly` restricts the search to the concepts that exist to tell
 * look-alike actions apart — administering against prompting, personal
 * dressing against wound dressing. Those have to be consulted before a literal
 * word search, which would happily answer "dress the patient" with a wound.
 * The broader concepts are consulted after it, so a question about a service
 * title still gets the service.
 */
export function resolveConcept(question, { preciseOnly = false } = {}) {
  return TASK_CONCEPTS.find(
    (concept) => (!preciseOnly || concept.precise) && concept.asks.test(question),
  ) ?? null;
}

/** Every recorded task matching a concept, across the round. */
export function conceptTasks(state, concept) {
  if (!concept) return [];

  return allVisits(state).flatMap((visit) =>
    visit.tasks
      .filter((task) => concept.label.test(taskText(task)))
      .map((task) => ({ visit, task })));
}

/** The concept to offer when the one asked about records nothing. */
export const relatedConcept = (concept) =>
  (concept?.related ? conceptById.get(concept.related) ?? null : null);

/*
 * "Any dressing tasks?" without saying which kind.
 *
 * Two unrelated jobs share the word, so the honest reading is that the
 * question has not chosen between them — and the useful answer shows both,
 * labelled, rather than silently picking one.
 */
export function isVagueDressing(question) {
  return /\bdress(ing|ings)?\b/i.test(question)
    && !/\bwound\b/i.test(question)
    && !/\b(patient|client|person|them|him|her|clothes|personal)\b/i.test(question);
}

export function dressingCategories(state) {
  return {
    personal: conceptTasks(state, conceptById.get('personal-dressing')),
    wound: conceptTasks(state, conceptById.get('wound-dressing')),
  };
}

/* --- Contact instructions, by relationship -------------------------------- */

/*
 * Not every sentence containing "call" asks the practitioner to telephone
 * anyone.
 *
 * "Daughter usually calls around nine" describes an incoming call; "escalate
 * any new pain to the duty line" is conditional on something happening. The
 * earlier answer to "do I need to ring any client before visiting?" offered
 * both as though they were pre-visit instructions, which is the defect this
 * replaces: each relationship is now recognised separately and only the one
 * asked about is reported.
 */
const PRE_VISIT =
  /\b(ring|call|phone|contact)\b[^.]*\b(before|prior to|ahead of|in advance)\b|\b(before|prior to|ahead of)\b[^.]*\b(ring|call|phone|contact)(ing)?\b/i;
const INCOMING =
  /\b(daughter|son|family|relative|neighbour|office|they|who)\b[^.]*\b(calls?|rings?|phones?|will call|usually calls)\b/i;
const CONDITIONAL =
  /\b(escalate|if |should any|any new|duty line|out of hours)\b/i;
const OUTGOING =
  /\b(ring|call|phone|contact)\b/i;

/**
 * Contact mentions across the round, grouped by what they actually instruct.
 *
 * Each entry appears in exactly one group, tested most specific first, so a
 * caller asking about pre-visit calls is never handed a conditional
 * escalation instead.
 */
export function contactsByRelationship(state) {
  const groups = { preVisit: [], outgoing: [], incoming: [], conditional: [], mention: [] };

  for (const visit of allVisits(state)) {
    const sources = [
      ...visit.notes.map((note) => ({ visit, text: note, from: 'note' })),
      ...visit.tasks.map((task) => ({ visit, text: taskText(task), from: 'task', task })),
    ];

    for (const source of sources) {
      const { text } = source;
      if (INCOMING.test(text)) groups.incoming.push(source);
      else if (CONDITIONAL.test(text) && PRE_VISIT.test(text)) groups.conditional.push(source);
      else if (PRE_VISIT.test(text) && !/\b(do not|don’t|don't|no need to)\b/i.test(text)) groups.preVisit.push(source);
      else if (CONDITIONAL.test(text) && OUTGOING.test(text)) groups.conditional.push(source);
      else if (CONDITIONAL.test(text) && /\bduty line\b/i.test(text)) groups.conditional.push(source);
      else if (OUTGOING.test(text)) groups.outgoing.push(source);
    }
  }

  return groups;
}

/* --- Round-wide task counts ---------------------------------------------- */

/**
 * Task totals across the round.
 *
 * `due` is deliberately narrower than `outstanding`: an unchecked task on a
 * cancelled visit is still an unchecked record, but it is not work still to be
 * done. Both numbers are reported by name so neither can be mistaken for the
 * other.
 */
export function taskTotals(state) {
  const visits = allVisits(state);
  const all = visits.flatMap((visit) => visit.tasks);
  const due = visits
    .filter((visit) => !RESOLVED.has(visit.status))
    .flatMap((visit) => visit.tasks.filter((task) => !task.done));

  return {
    total: all.length,
    done: all.filter((task) => task.done).length,
    outstanding: all.filter((task) => !task.done).length,
    due: due.length,
    visits: visits.length,
  };
}


/** Apply explicit visit and checklist conditions before formatting any answer. */
export function selectRecords(state, reading, person = null) {
  const text = reading.text;
  const statuses = reading.filters.status.filter((status) =>
    !(status === 'completed' && /\bcompleted tasks?\b/i.test(text)));
  const due = isWorkRemaining(text);
  const unresolved = due || /\b(remaining|unresolved|still to do|left)\b/i.test(text);
  const negativeStatus = /\bnot (yet )?(completed|cancelled|planned|arrived)|\b(?:isn't|aren't) (completed|cancelled|planned|arrived)\b/i.test(text);
  let visits = person ? [person] : allVisits(state);
  visits = visits.filter((visit) => {
    if (unresolved && RESOLVED.has(visit.status)) return false;
    if (/\bresolved\b/i.test(text) && !RESOLVED.has(visit.status)) return false;
    if (statuses.length && (negativeStatus ? statuses.includes(visit.status) : !statuses.includes(visit.status))) return false;
    if (reading.filters.priority && ( /\b(not|non)[ -]priority\b/i.test(text) ? visit.priority : !visit.priority)) return false;
    return true;
  });
  const concepts = TASK_CONCEPTS.filter((c) => c.asks.test(text));
  // Specific actions suppress their broader categories, but separate concepts
  // on either side of AND/OR remain separate conditions.
  const chosen = concepts.filter((c) => !concepts.some((other) => other.precise && other !== c
    && (other.id.startsWith(c.id + '-') || other.related === c.id)));
  const done = due ? false : reading.filters.done;
  const taskMatches = (task) => (done === null || task.done === done)
    && (!chosen.length || (reading.conjunction === 'or'
      ? chosen.some((c) => c.label.test(task.label))
      : chosen.every((c) => c.label.test(task.label))));
  const tasks = visits.flatMap((visit) => visit.tasks.filter(taskMatches).map((task) => ({ visit, task })));
  const matchingVisits = visits.filter((visit) => {
    const count = tasks.filter((entry) => entry.visit.id === visit.id).length;
    if (reading.comparator) return TEST[reading.comparator.op](count, reading.comparator.n);
    if (/\b(all|every)\b[^?]*\b(checked|ticked|done|tasks? completed)\b/i.test(text)) return visit.tasks.length > 0 && visit.tasks.every((task) => task.done);
    if (/\b(no|none|without)\b[^?]*\b(tasks?|checked|ticked)\b/i.test(text)) return count === 0;
    if (chosen.length > 1 && reading.conjunction === 'and') return chosen.every((c) => visit.tasks.some((task) => (done === null || task.done === done) && c.label.test(task.label)));
    return count > 0;
  });
  return { visits, tasks, matchingVisits, due, concepts: chosen };
}
