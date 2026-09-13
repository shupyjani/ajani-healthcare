import { allVisits, resolveConcept, searchWords } from './assistantQueries';

/** Entity/property recognition does not borrow a visit's properties for a task. */
export function interpretTaskDetail(text) {
  const property = /\bhow long\b|\bduration\b/i.test(text) ? 'duration'
    : /\bhow many times\b|\brepetitions?\b/i.test(text) ? 'repetitions'
      : /\bdressing\b.*\b(type|product)\b|\b(type|product)\b.*\bdressing\b/i.test(text) ? 'dressing type'
        : /\b(medication|medicine) name\b/i.test(text) ? 'medication name'
          : /\bdose|\bdosage\b/i.test(text) ? 'dose'
            : /\bmodel\b/i.test(text) ? 'equipment model'
              : /\b(contact|phone|telephone) number\b/i.test(text) ? 'contact number'
                : /\binstructions?\b/i.test(text) ? 'instructions'
                  : (/\bhint\b/i.test(text)
                    /* "which of her tasks need a photograph?" selects across a
                       checklist; "does that task need one?" reads one field. */
                    || (/\bphotograph\b|\bphoto\b/i.test(text) && !/\bwhich\b|\btasks\b/i.test(text))) ? 'hint'
                    : /\b(done|completed|finished|checked|unchecked|outstanding|ticked)\b/i.test(text) ? 'completion' : null;
  return {
    property,
    asksUnchecked: /\b(outstanding|unchecked|not (?:yet )?done)\b/i.test(text),
    wholeVisit: /\b(whole|entire) visit\b/i.test(text) || (/\bvisit\b/i.test(text) && !/\btask\b/i.test(text)),
    pointing: /\b(that|this) task\b|\b(is|was) (that|it)\b/i.test(text),
    ordinal: text.match(/\b(first|second|third) task\b/i)?.[1] ?? null,
    others: /\bother tasks\b/i.test(text),
  };
}

/** Only identities in the latest result enter context; records are current. */
export function taskResultReferences(state) {
  const replies = [...(state.assistant?.messages ?? [])].reverse().filter(m => m.role === 'assistant');
  const reply = /Which task/i.test(replies[0]?.text ?? '') ? replies[1] : replies[0];
  if (!reply || /cannot give clinical|can’t change|couldn’t find|Which task/i.test(reply.text)) return [];
  return allVisits(state).flatMap(visit => visit.tasks
    .filter(task => reply.text.includes(task.label) && reply.text.includes(visit.name))
    .map(task => ({ visit, task })))
    .sort((a, b) => reply.text.indexOf(a.task.label) - reply.text.indexOf(b.task.label));
}

export function resolveTaskDetail(text, state, explicitVisit, contextualVisit) {
  const reading = interpretTaskDetail(text);
  if (reading.wholeVisit || (!reading.property && !reading.ordinal && !reading.others && !/^show\b/i.test(text))) return null;
  let concept = resolveConcept(text);
  if (/dressing type/.test(reading.property ?? '')) concept = resolveConcept('wound dressing');
  const all = allVisits(state).flatMap(visit => visit.tasks.map(task => ({ visit, task })));
  const person = explicitVisit || (/\b(her|his|their|here)\b/i.test(text) ? contextualVisit : null);
  const pool = person ? all.filter(e => e.visit.id === person.id) : all;
  const literal = pool.filter(e => text.toLowerCase().includes(e.task.label.toLowerCase()));
  const explicit = literal.length ? literal : concept ? pool.filter(e => concept.label.test(e.task.label)) : [];
  const previous = taskResultReferences(state);
  const priorHere = previous.filter(e => !explicitVisit || e.visit.id === explicitVisit.id);
  let matches = explicit.length || concept ? explicit : priorHere;

  /*
   * Narrowing a broad concept down to the task actually meant.
   *
   * A concept is deliberately wide: "medication" matches a prompt, a blister
   * pack and a note about missed doses, so naming a person and a concept can
   * still leave several candidates. Asking "which task do you mean?" at that
   * point is what produced a loop — the reader had been specific, and the
   * question came back anyway with no list of what to choose from.
   *
   * Two signals settle it, strongest first: the task the previous answer
   * actually named, and then the task whose label uses a word the reader
   * typed. Both are general; neither knows anything about medication.
   */
  if (matches.length > 1) {
    const carried = matches.filter(e =>
      priorHere.some(p => p.visit.id === e.visit.id && p.task.id === e.task.id));
    if (carried.length && carried.length < matches.length) matches = carried;
  }

  if (matches.length > 1) {
    const spoken = new Set(searchWords(text));
    const named = matches.filter(e => searchWords(e.task.label).some(w => spoken.has(w)));
    if (named.length && named.length < matches.length) matches = named;
  }
  if (reading.ordinal) {
    const source = explicit.length ? explicit : matches;
    matches = source.slice(['first', 'second', 'third'].indexOf(reading.ordinal), ['first', 'second', 'third'].indexOf(reading.ordinal) + 1);
  }
  if (reading.others) {
    if (previous.length !== 1 || (explicitVisit && previous[0].visit.id !== explicitVisit.id)) return null;
    return { reading, matches: all.filter(e => e.visit.id === previous[0].visit.id && e.task.id !== previous[0].task.id) };
  }
  const detailProperty = reading.property && reading.property !== 'completion';
  if (!reading.pointing && !reading.ordinal && !detailProperty && !literal.length && !/^show\b/i.test(text)) return null;
  if (!reading.pointing && !reading.ordinal && !concept && !literal.length && !/\btask\b/i.test(text)
    && !(previous.length && reading.property)
    && !['dressing type', 'medication name', 'dose', 'equipment model', 'contact number'].includes(reading.property)) return null;
  if (!matches.length && detailProperty && (explicitVisit || contextualVisit)) {
    const visit = explicitVisit || contextualVisit;
    matches = [{ visit, task: null }];
  }
  if (matches.length > 1 && new Set(matches.map(e => e.visit.id)).size === 1 && ['medication name', 'dose', 'equipment model', 'contact number'].includes(reading.property)) {
    matches = [{ visit: matches[0].visit, task: null, sources: matches.map(e => `${e.task.label}. ${e.task.hint ?? ''}`).join('; ') }];
  }
  return { reading, matches };
}

const numbers = { once: 1, twice: 2, one: 1, two: 2, three: 3, four: 4, five: 5, ten: 10 };
const numeric = value => numbers[value.toLowerCase()] ?? Number(value);

/**
 * The value a record holds for one property, or null when it holds none.
 *
 * Reading this off the task's own wording and hint is what keeps a missing
 * duration missing: nothing here can reach the visit's scheduled span, so an
 * unrecorded task duration can never come back as the length of the visit.
 */
function readProperty(property, source) {
  if (property === 'duration') {
    const found = source.match(/\b(\d+|one|two|three|four|five|ten)\s*(minutes?|mins?|hours?)\b/i);
    return found ? `${numeric(found[1])} ${/hour/i.test(found[2]) ? 'hours' : 'minutes'}` : null;
  }
  if (property === 'repetitions') {
    const found = source.match(/\b(once|twice)\b|\b(\d+|one|two|three|four|five|ten)\s+times\b/i);
    if (!found) return null;
    const n = numeric(found[1] ?? found[2]);
    return `${n} ${n === 1 ? 'time' : 'times'}`;
  }
  if (!property) return null;

  const keys = { 'dressing type': 'dressing (?:type|product)', 'medication name': '(?:medication|medicine) name', dose: '(?:dose|dosage)', 'equipment model': '(?:equipment )?model', 'contact number': '(?:contact|phone|telephone) number', instructions: 'instructions' };
  const key = keys[property];
  return key ? source.match(new RegExp(`\\b${key}\\s*:\\s*([^.;\\n]+)`, 'i'))?.[1] ?? null : null;
}

/* Candidate task names, as a readable list. `join` is "or" when the reader is
   being asked to choose and "and" when they are being told. */
const listTasks = (matches, join = 'or') => {
  const onePerson = new Set(matches.map((e) => e.visit.name)).size === 1;
  const labels = matches.map(({ visit, task }) =>
    (onePerson ? `‘${task.label}’` : `${visit.name}’s ‘${task.label}’`));
  return labels.length <= 1
    ? labels.join('')
    : `${labels.slice(0, -1).join(', ')} ${join} ${labels[labels.length - 1]}`;
};

export function taskDetailAnswer(result) {
  const { reading, matches } = result;
  if (reading.others) return { intent: 'task-detail', text: matches.map(({ visit, task }) => `${visit.name} — ${task.label} (${task.done ? 'checked' : 'unchecked'})`).join('; ') + '.' };
  if (matches.length !== 1) {
    if (matches.length === 0) return { intent: 'clarify-task', text: 'Which task do you mean?' };

    /*
     * Still several. If not one of them records the property, the honest
     * answer is available without making the reader choose — asking which
     * task, when every answer would be "not recorded", is the loop.
     */
    const detail = reading.property && reading.property !== 'completion';
    const anyRecorded = matches.some(({ task, sources: src }) =>
      readProperty(reading.property, src ?? `${task?.label ?? ''}. ${task?.hint ?? ''}`));

    const people = [...new Set(matches.map((e) => e.visit.name))];
    const whose = people.length === 1 ? `${people[0]}’s matching tasks` : 'those tasks';

    if (detail && !anyRecorded) {
      return {
        intent: 'task-detail',
        text: `None of ${whose} records a ${reading.property}. `
          + `They are ${listTasks(matches, 'and')}.`,
      };
    }

    /* Naming the candidates, so "which task do you mean?" can be answered. */
    return {
      intent: 'clarify-task',
      text: `Which task do you mean — ${listTasks(matches)}?`,
    };
  }
  const { visit, task, sources } = matches[0];
  /* A task hint is its own recorded field, read straight off the task rather
     than parsed out of the label, and explicitly absent when none is held. */
  if (reading.property === 'hint') {
    const named = task ? `${visit.name}’s ‘${task.label}’ task` : `${visit.name}’s record`;
    return {
      intent: 'task-detail',
      text: task?.hint
        ? `${named} records a task hint: ${task.hint}.`
        : `${named} does not record a task hint.`,
    };
  }
  if (reading.property === 'completion' && task) {
    return { intent: 'task-detail', text: `${(reading.asksUnchecked ? !task.done : task.done) ? 'Yes' : 'No'}. ${visit.name}’s ‘${task.label}’ task is ${task.done ? 'checked' : 'unchecked'}.` };
  }
  const source = sources ?? (task ? `${task.label}. ${task.hint ?? ''}` : visit.notes.join(' '));
  const value = readProperty(reading.property, source);
  if (!reading.property && task) return { intent: 'task-detail', text: `${visit.name} — ${task.label} (${task.done ? 'checked' : 'unchecked'}).` };
  if (value) return { intent: 'task-detail', text: `${visit.name}${task ? `’s ‘${task.label}’ task` : '’s record'} records ${reading.property}: ${value}.` };
  return { intent: 'task-detail', text: `${task && ['duration', 'repetitions', 'instructions'].includes(reading.property) ? `${visit.name}’s ‘${task.label}’ task` : `${visit.name}’s record`} does not specify ${['instructions', 'repetitions'].includes(reading.property) ? '' : reading.property === 'equipment model' ? 'an ' : 'a '}${reading.property}.${task ? ` It only lists ‘${task.label}’.` : ''}` };
}
