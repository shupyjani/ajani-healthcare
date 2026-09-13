import { interpret, normalise } from './assistantInterpret';
import { recognisePerson } from './assistantPeople';
import { allVisits, TASK_CONCEPTS, durationMinutes, label, COMPARATOR_WORDS, isWorkRemaining } from './assistantQueries';
import { scheduleMinutes } from './demoState';
import { interpretTaskDetail, resolveTaskDetail, taskDetailAnswer, taskResultReferences } from './assistantTaskDetails';

const closed = v => ['completed', 'cancelled'].includes(v.status);
const timeToken = '(?:noon|midday|(?:[01]?\\d|2[0-3]):[0-5]\\d(?:\\s*(?:am|pm))?|(?:1[0-2]|[1-9])\\s*(?:am|pm))';
const minute = s => /noon|midday/i.test(s) ? 720 : /am|pm/i.test(s)
  ? Number(s.match(/\d+/)[0]) % 12 * 60 + Number(s.match(/:(\d{2})/)?.[1] ?? 0) + (/pm/i.test(s) ? 720 : 0) : scheduleMinutes(s);

/** Schedule queries concern recorded start times, with strict before/after and
 * inclusive between boundaries. No elapsed clock or route assumptions. */
export function scheduleBoundary(text) {
  const between = text.match(new RegExp(`between (${timeToken}) and (${timeToken})`, 'i'));
  if (between) return { from: minute(between[1]), to: minute(between[2]), inclusive: true };
  const edge = text.match(new RegExp(`\\b(before|after) (${timeToken})\\b`, 'i'));
  return edge ? { [edge[1] === 'before' ? 'to' : 'from']: minute(edge[2]), inclusive: false } : null;
}

function conceptsFor(text) {
  const concepts = TASK_CONCEPTS.filter(c => c.asks.test(text));
  return concepts.filter(c => !concepts.some(other => other.precise && other !== c
    && (other.id.startsWith(c.id + '-') || other.related === c.id))).map(c => c.id);
}

/** Persist the query, never its totals. The result identities distinguish a
 * selected set from the named anchor in a temporal sentence. */
export function readSelection(text, person) {
  const reading = interpret(text);
  const exclusion = text.match(/\b(excluding|except|other than|not)\b[^?]*\b(completed|cancelled|planned|arrived)\b/i);
  const excluded = Boolean(exclusion);
  const statuses = reading.filters.status.filter(s => !(s === 'completed' && /completed tasks/i.test(text)));
  const actionable = isWorkRemaining(text) || /\bunresolved\b/i.test(text);
  const subject = /\b(?:which|who|list|show)\b.*\b(?:visits|people|clients)\b|^who\b/i.test(text) ? 'visits' : reading.subject === 'task' || /outstanding work/i.test(text) ? 'tasks' : 'visits';
  const excludedStatuses = excluded ? interpret(exclusion[0]).filters.status : [];
  return {
    subject,
    comparator: reading.comparator,
    priority: reading.filters.priority,
    operation: /\b(?:scheduled|visit) (?:time|duration)\b/i.test(text) && /how much|total|sum/i.test(text) ? 'sum-duration' : reading.operation === 'count' ? 'count' : 'list',
    personIds: person ? [person.id] : null,
    statuses: statuses.filter(status => !excludedStatuses.includes(status)),
    excludedStatuses,
    actionable,
    done: actionable && subject === 'visits' && !/\b(tasks?|checked|unchecked)\b/i.test(text) ? null : actionable ? false : reading.filters.done,
    concepts: conceptsFor(text), conjunction: reading.conjunction,
    time: scheduleBoundary(text),
    photograph: /photograph|photo\b/i.test(text) ? !/don'?t|doesn'?t|do(?:es)? not|not required|no need|without/i.test(text) : null,
  };
}

export function executeSelection(state, query) {
  let visits = allVisits(state).filter(v => (!query.personIds || query.personIds.includes(v.id))
    && (!query.statuses.length || query.statuses.includes(v.status))
    && !query.excludedStatuses.includes(v.status) && (!query.actionable || !closed(v))
    && (!query.priority || v.priority));
  if (query.time) visits = visits.filter(v => {
    const start = scheduleMinutes(v.start), { from, to, inclusive } = query.time;
    return (from === undefined || (inclusive ? start >= from : start > from))
      && (to === undefined || (inclusive ? start <= to : start < to));
  });
  const concepts = query.concepts.map(id => TASK_CONCEPTS.find(c => c.id === id)).filter(Boolean);
  const propertyMatches = task => {
    if (query.done !== null && query.operation !== 'sum-duration' && task.done !== query.done) return false;
    if (query.photograph !== null) {
      const hint = task.hint ?? '';
      const negative = /photograph(?:y)? (?:is )?not required|no photograph|do not (?:take|need).*photo/i.test(hint);
      const positive = !negative && /photograph(?:y)? (?:is )?required|take (?:a )?photograph/i.test(hint);
      if (query.photograph ? !positive : !negative) return false;
    }
    return true;
  };
  if (concepts.length && query.conjunction === 'and') visits = visits.filter(v => concepts.every(c => v.tasks.some(t => propertyMatches(t) && c.label.test(t.label))));
  const tasks = visits.flatMap(visit => visit.tasks.filter(t => propertyMatches(t)
    && (!concepts.length || concepts.some(c => c.label.test(t.label)))).map(task => ({ visit, task })));
  const hasTaskCondition = concepts.length || query.done !== null || query.photograph !== null;
  if (query.subject === 'visits' && hasTaskCondition && query.operation !== 'sum-duration') visits = visits.filter(v => tasks.some(e => e.visit.id === v.id));
  if (query.comparator) {
    const { op, n } = query.comparator;
    visits = visits.filter(v => {
      const count = tasks.filter(e => e.visit.id === v.id).length;
      return op === 'more' ? count > n : op === 'least' ? count >= n : op === 'fewer' ? count < n : op === 'most' ? count <= n : count === n;
    });
  }
  return { visits, tasks: tasks.filter(e => visits.some(v => v.id === e.visit.id)) };
}

function formatSelection(state, query) {
  const { visits, tasks } = executeSelection(state, query);
  /* A time-bounded selection is narrower than its status filter, so naming
     only the status would overstate what was counted. */
  const scope = query.actionable ? ' on unresolved visits'
    : query.time ? ' across the selected visits'
      : query.statuses.length ? ` on ${query.statuses.join(' or ')} visits` : ' in this selection';
  const boundary = query.time ? ' Schedule boundaries use visit start times; before/after are exclusive and between is inclusive.' : '';
  let text;
  if (query.comparator) {
    const descriptions = COMPARATOR_WORDS;
    text = `${visits.length ? visits.map(v => v.name).join(', ') : 'No visits'} have ${descriptions[query.comparator.op]} ${query.comparator.n} recorded tasks${scope}.${boundary}`;
  } else if (query.operation === 'sum-duration') text = `${visits.reduce((n, v) => n + durationMinutes(v), 0)} scheduled minutes across ${visits.length} visits. This sums full recorded visit slots, excluding travel, gaps and elapsed time.`;
  else if (query.operation === 'count') text = `${query.subject === 'tasks' ? tasks.length : visits.length} ${query.subject}${scope}.${boundary}`;
  else if (query.subject === 'visits') text = visits.length ? `${visits.length} matching ${visits.length === 1 ? 'visit' : 'visits'}: ${visits.map(v => `${v.name} (${label(v)})`).join('; ')}.${boundary}` : `No visits match these conditions.${boundary}`;
  else text = tasks.length ? tasks.map(({ visit, task }) => `${visit.name} — ${task.label} (${task.done ? 'checked' : 'unchecked'})`).join('; ') + '.' : `No matching ${query.done === false ? 'unchecked ' : ''}tasks are recorded${scope}.`;
  return { text, intent: 'selection', context: { query, visitIds: visits.map(v => v.id), taskIds: tasks.map(({ visit, task }) => [visit.id, task.id]) } };
}

const messagesBefore = (state, text) => {
  const messages = [...(state.assistant?.messages ?? [])];
  if (messages.at(-1)?.role === 'user' && normalise(messages.at(-1).text) === text) messages.pop();
  return messages;
};

/** This path handles explicit record selections and their refinements. Safety,
 * ambiguity and unsupported language continue through the established router. */
export function answerSelection(question, state) {
  const text = normalise(question), reading = interpret(text);
  /* Asking what reasons the app offers is a question about the control, not a
     lookup of what was recorded against one visit. */
  const cancellationMenu =
    /\breasons?\b[^?]*\b(?:can|could|may|should)\s+i\b|\breasons?\s+(?:are\s+)?(?:available|there|allowed|offered|possible)\b|\bwhat are the (?:cancellation )?reasons\b|\blist (?:the )?(?:cancellation )?reasons\b/i
      .test(text);
  const cancellationRecord = !cancellationMenu
    && /\b(?:reason.*cancel|cancel.*reason)|^why (?:was|is|has)\b.*\bcancelled\b/i.test(text);
  if (['clinical', 'advice', 'disclosure', 'mutation', 'demographic'].includes(reading.boundary) || (!cancellationRecord && (reading.operation === 'explain' || reading.subject === 'control'))) return null;
  const visits = allVisits(state), named = recognisePerson(text, visits);
  if (named && !named.visit) return null;
  const person = named?.visit;
  const messages = messagesBefore(state, text);
  const reply = [...messages].reverse().find(m => m.role === 'assistant');
  const prior = [...messages].reverse().find(m => m.role === 'user')?.text;
  const previous = reply?.context;
  const property = interpretTaskDetail(text).property;
  /* A recorded task hint is a task-detail lookup, not a set selection. */
  if (property === 'hint') return null;

  /*
   * "How many is that?" counts what the previous answer returned.
   *
   * Recounting the round would silently widen a narrowed question, and would
   * disagree with the list the reader is looking at.
   */
  if (/^(?:and\s+)?how many (?:are there|is that|are those|was that|were there|were those)\b/i.test(text) && previous) {
    const taskIds = previous.taskIds ?? [];
    const visitIds = previous.visitIds ?? [];
    const counted = taskIds.length ? taskIds.length : visitIds.length;
    const unit = taskIds.length ? 'task' : 'visit';
    return {
      intent: 'selection',
      text: counted === 0
        ? `None. The previous answer matched no ${unit}s.`
        : `${counted} ${counted === 1 ? unit : `${unit}s`} — the same ${counted === 1 ? 'one' : 'ones'} as the previous answer.`,
      context: previous,
    };
  }
  const priorProperty = previous?.property ?? (prior ? interpretTaskDetail(prior).property : null);
  const legacyTasks = taskResultReferences(state);
  const legacyPeople = [...new Set(legacyTasks.map(e => e.visit.id))];
  const previousPerson = previous?.visitIds?.length === 1 ? visits.find(v => v.id === previous.visitIds[0]) : legacyPeople.length === 1 ? visits.find(v => v.id === legacyPeople[0]) : null;

  if (/\b(?:those|these)\b.*\b(?:count|work remaining)\b|do (?:those|these) count/i.test(text) && /work|remaining/i.test(text)) {
    if (!previous?.query) return { intent: 'clarify', text: 'Which tasks do you mean?' };
    const { tasks } = executeSelection(state, previous.query);
    const due = tasks.filter(e => !e.task.done && !closed(e.visit));
    return { intent: 'selection', text: `${due.length ? `${due.length} of these tasks count` : 'None of these tasks count'} as work remaining. Work remaining means unchecked tasks on unresolved visits; closed visits retain their recorded checklists.`, context: previous };
  }
  const refinement = /\bwho has both\b|^only on visits|\bthose visits\b|\bthese visits\b/i.test(text);
  if (refinement) {
    let query = previous?.query;
    // Text-only histories (including older stored conversations) can recover
    // an explicit query, but never infer a set from a failed answer.
    if (!query && prior && (scheduleBoundary(prior) || conceptsFor(prior).length > 1) && !/couldn.?t|which person|which visit|not found|cannot find|can.t find/i.test(reply?.text ?? '')) {
      const p = recognisePerson(prior, visits);
      if (!p || p.visit) query = readSelection(prior, p?.visit);
    }
    if (!query) return { intent: 'clarify', text: 'Which visits do you mean? Please repeat the selection.' };
    query = { ...query };
    if (/both/i.test(text)) {
      if (query.concepts.length < 2) return { intent: 'clarify', text: 'Which two task types do you mean?' };
      query.conjunction = 'and'; query.subject = 'visits'; query.operation = 'list';
    }
    if (/only on visits/i.test(text)) query.actionable = true;
    if (/how many tasks/i.test(text)) { query.subject = 'tasks'; query.operation = 'count'; }
    return formatSelection(state, query);
  }

  if (cancellationRecord) {
    const v = person ?? previousPerson;
    if (!v) return { intent: 'clarify', text: 'Which visit’s cancellation reason do you mean?', context: { pending: 'cancellation-reason' } };
    /* Reason and note stay separate fields and separate sentences. The note is
       still reported beside the reason, because "Other" is required to carry
       one precisely because "Other" on its own records nothing. */
    const reason = v.cancellation?.reason;
    const note = v.cancellation?.note;
    const recorded = reason
      ? `${v.name}’s recorded cancellation reason is “${reason}”.`
        + (note ? ` The additional cancellation note records: ${note}` : '')
      : `No cancellation reason was recorded for ${v.name}.`;
    return { intent: 'cancellation', text: v.status !== 'cancelled' ? `${v.name}’s visit is ${label(v)}; no cancellation reason is recorded.` : recorded, context: { field: 'cancellation', visitIds: [v.id] } };
  }
  if (/additional note|cancellation note/i.test(text) && (previous?.field === 'cancellation' || /cancellation note/i.test(text))) {
    const v = person ?? previousPerson;
    if (!v) return { intent: 'clarify', text: 'Which visit’s cancellation note do you mean?' };
    return { intent: 'cancellation', text: v.cancellation?.note ? `${v.name}’s additional cancellation note: ${v.cancellation.note}` : `No additional cancellation note was recorded for ${v.name}.`, context: { field: 'cancellation', visitIds: [v.id] } };
  }
  if (/operational notes?/i.test(text)) {
    const v = person ?? previousPerson;
    if (v) return { intent: 'notes', text: `${v.name}’s operational notes: ${v.notes.join('; ') || 'None recorded.'}`, context: { field: 'operational-note', visitIds: [v.id] } };
  }
  if (person && previous?.property && previous?.taskIds?.length > 1 && !property) {
    const matches = previous.taskIds.filter(([vid]) => vid === person.id).map(([, tid]) => ({ visit: person, task: person.tasks.find(t => t.id === tid) })).filter(e => e.task);
    const result = taskDetailAnswer({ reading: { property: previous.property }, matches });
    return { ...result, context: { property: previous.property, visitIds: [person.id], taskIds: matches.map(e => [person.id, e.task.id]) } };
  }
  if (/\btravel (?:time|estimate)|\bhow long.*travel/i.test(text)) {
    const v = person ?? previousPerson;
    return v ? { intent: 'travel', text: `${v.name}’s recorded travel estimate is ${v.travel ?? 'not specified'}. This is separate from the visit duration; no live route has been recalculated.`, context: { visitIds: [v.id], property: 'travel' } }
      : { intent: 'clarify', text: 'Which visit’s recorded travel estimate do you mean?' };
  }
  const whole = /\b(whole|entire) visit\b/i.test(text);
  const pending = previous?.pending ?? (/Which visit/i.test(reply?.text ?? '') ? priorProperty : null);
  if ((whole && (property ?? priorProperty) === 'duration') || (person && pending === 'duration') || (property === 'duration' && previous?.visitIds?.length === 1 && !previous?.taskIds?.length && !person && !conceptsFor(text).length) || (/how long.*visit|visit.*how long/i.test(text) && !person && !reading.target.kind)) {
    const v = person ?? previousPerson;
    if (!v) return { intent: 'clarify', text: 'Which visit did you mean?', context: { pending: 'duration' } };
    return { intent: 'duration', text: `${v.name}’s whole visit is ${durationMinutes(v)} minutes scheduled (${label(v)}).`, context: { visitIds: [v.id], property: 'duration' } };
  }
  /* The reply immediately before may have been about the whole visit, so the
     task under discussion is the most recent one named anywhere in the
     exchange. Its state is read from the current records every time. */
  const lastTask = previous?.taskIds?.length === 1
    ? previous
    : [...messages].reverse().map(m => m.context).find(c => c?.taskIds?.length === 1) ?? null;
  if (/^(?:what about now|and now)[?.!]*$/i.test(text) && lastTask) {
    const [vid, tid] = lastTask.taskIds[0], v = visits.find(candidate => candidate.id === vid), task = v?.tasks.find(t => t.id === tid);
    if (task) return { intent: 'task-detail', text: `${task.done ? 'Checked' : 'Unchecked'}. ${v.name}’s ‘${task.label}’ task is currently ${task.done ? 'checked' : 'unchecked'}.`, context: lastTask };
  }
  // Explicit task identity takes precedence over a recognised person's profile.
  if ((property && property !== 'completion' && conceptsFor(text).length) || (person && conceptsFor(text).length && !isWorkRemaining(text) && (/^show\b|^actually\b/i.test(text) || property)) || (previous?.taskIds?.length === 1 && property && !whole && !person)) {
    const detail = resolveTaskDetail(text, state, person, previousPerson);
    if (detail?.matches?.length) {
      const answer = taskDetailAnswer(detail);
      return { ...answer, context: { property: detail.reading.property, visitIds: [...new Set(detail.matches.map(e => e.visit.id))], taskIds: detail.matches.filter(e => e.task).map(e => [e.visit.id, e.task.id]) } };
    }
  }
  const query = readSelection(text, person);
  const selection = isWorkRemaining(text) || query.time || query.excludedStatuses.length || query.photograph !== null
    || (reading.subject === 'task' && query.statuses.length && reading.filters.done === false)
    || (query.concepts.length > 1 && /\bor\b|\band\b/i.test(text));
  if (selection) return formatSelection(state, query);
  return null;
}
