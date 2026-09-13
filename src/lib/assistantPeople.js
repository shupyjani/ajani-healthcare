/*
 * Recognising a person in a question.
 *
 * The round is seven fictional people, so this is a small closed-world lookup
 * rather than anything general: a question is matched against the names that
 * actually exist, by full name, first name or surname, ignoring case, and
 * tolerating a letter's worth of misspelling where that still points at
 * exactly one person.
 *
 * The important half is what it refuses to do. If a near-miss could be two
 * different people it matches neither, and a name-shaped word is only reported
 * as unknown when the question actually signals a person — otherwise every
 * unfamiliar noun becomes a missing patient, and "what is the capital of
 * France?" answers "I can't find anyone called France".
 */

/*
 * Words that are never a name here: ordinary English plus this demo's own
 * vocabulary. Anything left after these have been removed is a candidate.
 */
const NOT_NAMES = new Set([
  'noon', 'midday', 'altogether', 'doing', 'photograph', 'photography', 'additional', 'operational', 'unchecked',
  'checked', 'unchecked', 'unticked', 'walking', 'hygiene', 'exercise', 'exercises', 'related',
  // question and sentence scaffolding
  'the', 'and', 'for', 'was', 'are', 'but', 'not', 'can', 'you', 'your', 'yours',
  'his', 'her', 'hers', 'their', 'them', 'they', 'this', 'that', 'these', 'those',
  'who', 'what', 'when', 'where', 'which', 'why', 'how', 'does', 'did', 'has',
  'have', 'had', 'will', 'would', 'should', 'could', 'shall', 'may', 'might',
  'must', 'been', 'being', 'from', 'with', 'about', 'into', 'onto', 'than',
  'then', 'there', 'here', 'any', 'all', 'some', 'each', 'every', 'more', 'most',
  'now', 'next', 'last', 'first', 'second', 'today', 'tomorrow', 'yesterday',
  'please', 'help', 'tell', 'show', 'give', 'need', 'want', 'like', 'know',
  'get', 'got', 'make', 'made', 'take', 'put', 'see', 'look', 'find', 'search',
  'called', 'named', 'name', 'client', 'clients', 'person', 'people', 'someone',
  'anyone', 'somebody', 'anybody', 'yes', 'right', 'okay', 'thanks',
  // the demo's own vocabulary
  'visit', 'visits', 'round', 'rounds', 'shift', 'shifts', 'task', 'tasks',
  'status', 'statuses', 'progress', 'planned', 'arrived', 'completed',
  'complete', 'finish', 'finished', 'finishing', 'cancel', 'cancelled',
  'cancelling', 'cancellation', 'route',
  'travelling', 'travel', 'active', 'priority', 'remaining', 'resolved',
  'schedule', 'scheduled', 'address', 'postcode', 'district', 'reference',
  'time', 'times', 'app', 'assistant', 'demo', 'button', 'control',
  'preference', 'preferences', 'record', 'note', 'notes', 'reason', 'list',
  'due', 'left', 'done', 'open', 'close', 'start', 'started', 'begin', 'mark',
  'marked', 'set', 'change', 'update', 'edit', 'tick', 'untick',
  // adverbs, qualifiers and common verbs that are never names
  'safe', 'safely', 'given', 'giving', 'currently', 'current', 'actually',
  'really', 'just', 'also', 'only', 'very', 'quite', 'still', 'again', 'back',
  'well', 'good', 'best', 'sure', 'thing', 'things', 'way', 'ways', 'one', 'two',
  'three', 'four', 'five', 'six', 'seven', 'many', 'much', 'able', 'apply',
  'administer', 'recommend', 'suggest', 'happen', 'happens', 'work', 'works',
  'use', 'using', 'add', 'remove', 'check', 'confirm', 'review', 'read', 'write',
  // contact and scheduling vocabulary
  'ring', 'rings', 'ringing', 'call', 'calls', 'calling', 'phone', 'phoning',
  'contact', 'contacts', 'contacted', 'visiting', 'before', 'after', 'during',
  'arrive', 'arriving', 'leave', 'leaving', 'wash', 'washing', 'care', 'personal',
  'support', 'mobility', 'wellbeing', 'discharge', 'morning', 'midday', 'afternoon',
  'evening', 'shift', 'today', 'week', 'day', 'hour', 'minute', 'clothes', 'meal',
  // clinical vocabulary, so a care question is never read as a name
  'medication', 'medicine', 'medicines', 'drug', 'drugs', 'dose', 'dosage',
  'treatment', 'treat', 'therapy', 'wound', 'dressing', 'symptom', 'symptoms',
  'diagnosis', 'diagnose', 'pain', 'infection', 'emergency', 'ambulance',
  'clinical', 'advice', 'advise', 'prescription', 'prescribe',
]);

/** Levenshtein distance, abandoned early once it passes `limit`. */
function distance(a, b, limit) {
  if (Math.abs(a.length - b.length) > limit) return limit + 1;

  let previous = Array.from({ length: b.length + 1 }, (_, index) => index);

  for (let i = 1; i <= a.length; i += 1) {
    const current = [i];
    let best = i;

    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      current[j] = Math.min(current[j - 1] + 1, previous[j] + 1, previous[j - 1] + cost);
      best = Math.min(best, current[j]);
    }

    if (best > limit) return limit + 1;
    previous = current;
  }

  return previous[b.length];
}

/* One letter for a short name, two once there is enough word to be sure. */
function tolerance(word) {
  return word.length >= 7 ? 2 : 1;
}

function parts(visit) {
  const [first, ...rest] = visit.name.split(' ');
  return { first: first.toLowerCase(), last: rest.join(' ').toLowerCase() };
}

function candidateWords(question) {
  const found = question.match(/[a-z][a-z'’-]{2,}/g) ?? [];
  return found
    .map((word) => word.replace(/['’]s$/, ''))
    .filter((word) => word.length >= 3 && !NOT_NAMES.has(word));
}

function escapeForRegExp(word) {
  return word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Who, if anyone, a question is about.
 *
 * Returns `{ visit }` when exactly one person fits, `{ unknown }` when a
 * signalled name matches nobody, `{ ambiguous: true }` when two could equally
 * have been meant, and `null` when the question names no one.
 */
export function recognisePerson(question, visits) {
  const asked = (question ?? '').toLowerCase();
  if (asked.trim() === '') return null;

  /* Whole name first: the least ambiguous thing anyone can type. */
  const byFullName = visits.filter((visit) => new RegExp(`\\b${escapeForRegExp(visit.name.toLowerCase())}\\b`).test(asked));
  if (byFullName.length === 1) return { visit: byFullName[0] };

  const words = candidateWords(asked);
  if (words.length === 0) return null;

  /* Exact first name or surname. */
  const exact = visits.filter((visit) => {
    const { first, last } = parts(visit);
    return words.includes(first) || words.includes(last);
  });
  if (exact.length === 1) return { visit: exact[0] };

  // Missing apostrophes are considered only before a possessible app noun.
  // Exact names above always win, including names that already end in s.
  const possessive = visits.filter(visit => {
    const { first, last } = parts(visit);
    return [visit.name.toLowerCase(), first, last].filter(Boolean).some(name =>
      new RegExp(`\\b${escapeForRegExp(name)}s(?=\\s+(?:(?:remaining|recorded|unchecked|checked)\\s+)?(?:tasks?|visits?|checklist|notes?|address|walk|exercises?)\\b)`, 'i').test(asked));
  });
  if (possessive.length === 1) return { visit: possessive[0] };
  if (possessive.length > 1 || exact.length > 1) return { ambiguous: true };

  /* Near enough, provided only one person is near enough. */
  const near = visits.filter((visit) => {
    const { first, last } = parts(visit);
    return words.some((word) => {
      const allowed = tolerance(word);
      return distance(word, first, allowed) <= allowed || distance(word, last, allowed) <= allowed;
    });
  });
  if (near.length === 1) return { visit: near[0] };
  if (near.length > 1) return { ambiguous: true };

  /*
   * A name-shaped word that is nobody.
   *
   * Reported only when the wording genuinely *proposes* a person, which is a
   * question of grammatical position rather than of vocabulary. Asking whether
   * a stop-list contains "related" or "similar" is a losing game — the list
   * would never be finished — so instead a candidate has to sit somewhere a
   * name actually sits: after "called" or "named", in the possessive, as the
   * subject of "is X on my round", or capitalised part-way through a sentence.
   *
   * "Do I have any wound related task today?" proposes nobody, and gets
   * nobody, however many nouns it contains.
   */
  const original = question ?? '';

  const namePosition = (word) => {
    const escaped = escapeForRegExp(word);

    if (/^(did i complete|have i completed|are all)\b/i.test(original) && new RegExp(`\\b${escaped}\\s+tasks?\\b`, 'i').test(original)) return true;
    if (new RegExp(`\\b(called|named)\\s+${escaped}\\b`, 'i').test(original)) return true;
    if (new RegExp(`\\b${escaped}['\u2019]s\\b`, 'i').test(original)) return true;
    if (new RegExp(`\\bis\\s+${escaped}\\s+(on|in)\\s+(my|the)\\b`, 'i').test(original)) return true;

    /*
     * Capitalisation on its own is too weak — "the capital of France" would
     * propose a patient called France. It counts only in company: either the
     * word is introduced the way a person is ("tell me about Naomi"), or it
     * heads a run of two capitalised words, which is what a full name looks
     * like.
     */
    const Capital = `${escaped[0].toUpperCase()}${escaped.slice(1)}`;
    const introduced = new RegExp(
      `\\b(about|have|got|see|seeing|visit|visiting|with|meet|meeting|is|was|does|did)\\s+${Capital}\\b`,
    );
    const fullName = new RegExp(`\\b${Capital}\\s+[A-Z][a-z]+`);

    return introduced.test(original) || fullName.test(original);
  };

  const signalled = words.filter(namePosition);
  if (signalled.length === 0) return null;

  /* Quoted back with the reader's own capitalisation. */
  const [unknown] = signalled;
  const match = original.match(new RegExp(`\\b${escapeForRegExp(unknown)}\\w*`, 'i'));
  const shown = match ? match[0] : unknown;

  return { unknown: shown.charAt(0).toUpperCase() + shown.slice(1).toLowerCase() };
}
