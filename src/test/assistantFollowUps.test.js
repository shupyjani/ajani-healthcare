import { describe, it, expect } from 'vitest';
import { answerLocally } from '../lib/assistantFallback';
import { demoReducer, initialDemoState } from '../lib/demoState';

/*
 * Follow-up questions, recorded fields and the answers they must agree with.
 *
 * Every case here is a multi-turn exchange replayed through the real reducer,
 * because the defects these cover were all about what the previous answer left
 * behind: a reply's context is what lets "how many is that?" count the same
 * set the reader is looking at.
 */

const reduce = (state, ...actions) => actions.reduce(demoReducer, state);

/* One exchange, stored exactly as the interface stores it. */
function turn(state, question) {
  const asked = demoReducer(state, { type: 'assistant-ask', question });
  const answer = answerLocally(question, asked);

  return {
    answer,
    state: demoReducer(asked, {
      type: 'assistant-reply',
      text: answer.text,
      mode: 'fallback',
      context: answer.context,
      requestId: asked.assistant.requestId,
    }),
  };
}

/* Replays a whole conversation and returns every answer. */
function conversation(start, ...questions) {
  let state = start;
  const answers = [];

  for (const question of questions) {
    const step = turn(state, question);
    state = step.state;
    answers.push(step.answer);
  }

  return { answers, state, last: answers[answers.length - 1] };
}

const cancelWith = (state, id, reason, note = '') =>
  reduce(state, { type: 'cancel-visit', id, reason, note });

describe('cancellation reason, note and operational note stay separate fields', () => {
  it('offers the menu of choices when the choices are what was asked for', () => {
    const { last } = conversation(
      initialDemoState(),
      'What reasons can I give for cancelling Terrence?',
    );

    expect(last.text).toContain('Terrence Boakye’s visit is Planned');
    expect(last.text).toContain('Family cancelled, Visit no longer required, Client unavailable');
    expect(last.text).toContain('required for “Other”');
  });

  it('reads back the recorded reason, and the note it required', () => {
    /* "Other" records nothing on its own, which is why the note is required —
       so the note has to come back with it, labelled as the note. */
    const state = cancelWith(
      initialDemoState(), 'v5', 'Other', 'Family requested a different day',
    );
    const { last } = conversation(state, 'What is Halina’s cancellation reason?');

    expect(last.text).toContain('recorded cancellation reason is “Other”');
    expect(last.text).toContain('additional cancellation note records: Family requested a different day');
  });

  it('answers a follow-up about the note with the cancellation note', () => {
    const state = cancelWith(
      initialDemoState(), 'v5', 'Other', 'Family requested a different day',
    );
    const { last } = conversation(
      state,
      'What is Halina’s cancellation reason?',
      'Was there an additional note?',
    );

    expect(last.text).toContain('Family requested a different day');
    /* Not the operational note, which is a different field entirely. */
    expect(last.text).not.toContain('Hard of hearing');
  });

  it('keeps the operational note reachable in its own right', () => {
    const state = cancelWith(initialDemoState(), 'v5', 'Other', 'Family requested a different day');
    const { last } = conversation(state, 'What are Halina’s operational notes?');

    expect(last.text).toContain('Hard of hearing on the left side');
    expect(last.text).not.toContain('Family requested a different day');
  });

  it('says plainly when a visit carries no cancellation record', () => {
    const { last } = conversation(initialDemoState(), 'What is Sunita’s cancellation reason?');
    expect(last.text).toContain('no cancellation reason is recorded');
  });
});

describe('a task hint is its own recorded field', () => {
  it('retrieves the photograph hint the round actually records', () => {
    const { last } = conversation(
      initialDemoState(),
      'Does Priya’s wound task need a photograph?',
    );

    expect(last.intent).toBe('task-detail');
    expect(last.text).toBe(
      'Priya Raman’s ‘Check wound dressing’ task records a task hint: Photograph not required.',
    );
  });

  it('reports an absent hint as unrecorded rather than inventing one', () => {
    const { last } = conversation(initialDemoState(), 'Is there a hint on Ivor’s walking task?');

    expect(last.text).toBe(
      'Ivor Bankole’s ‘Walk the hallway circuit twice’ task does not record a task hint.',
    );
  });

  it('still selects across a checklist when a list was asked for', () => {
    /* "Which of her tasks…" is a selection, not a single-field lookup. */
    const state = initialDemoState();
    state.visits[2].tasks[0].hint = 'Photograph required';

    const { last } = conversation(state, 'Which of Priya’s tasks need a photograph?');
    expect(last.text).toContain('Review discharge notes');
    expect(last.text).not.toContain('Check wound dressing');
  });
});

describe('a follow-up count agrees with the list it follows', () => {
  it('counts the visits the previous answer named', () => {
    const { last } = conversation(
      initialDemoState(),
      'Which visits are planned?',
      'How many is that?',
    );

    /* Four planned in the seed — not the seven on the round. */
    expect(last.text).toBe('4 visits — the same ones as the previous answer.');
  });

  it('does not widen a search that found nothing', () => {
    const { answers } = conversation(
      initialDemoState(),
      'Who has a zzzz task?',
      'How many are there?',
    );

    expect(answers[0].text).toContain('No task on today’s round mentions zzzz');
    expect(answers[1].text).toBe('None. The previous answer matched no visits.');
    expect(answers[1].text).not.toMatch(/\b7\b/);
  });

  it('names the selection it counted when a time boundary narrowed it', () => {
    const { answers } = conversation(
      initialDemoState(),
      'Which visits after midday are still planned?',
      'How many tasks do those visits have altogether?',
    );

    /* Ivor is Planned but starts at 11:00, so the boundary must exclude him:
       Halina, Terrence and Sunita, three tasks each. */
    expect(answers[0].text).not.toContain('Ivor Bankole');
    expect(answers[1].text).toContain('9 tasks across the selected visits');
    expect(answers[1].text).not.toContain('on planned visits');
  });
});

describe('“what about now?” re-reads the current record', () => {
  it('returns to the last task discussed, past an answer about the whole visit', () => {
    const { last } = conversation(
      initialDemoState(),
      'Show Ivor’s walking task',
      'Actually, Sunita’s exercises—how long?',
      'And the whole visit?',
      'What about now?',
    );

    expect(last.intent).toBe('task-detail');
    expect(last.text).toBe(
      'Unchecked. Sunita Kaur’s ‘Seated exercises, ten minutes’ task is currently unchecked.',
    );
  });

  it('reflects a tick made between the two questions', () => {
    const before = conversation(initialDemoState(), 'Show Priya’s wound dressing task');
    expect(before.last.text).toContain('unchecked');

    /* Priya is Arrived, so her checklist is editable. */
    const ticked = demoReducer(before.state, {
      type: 'toggle-task', visitId: 'v3', taskId: 'v3t2',
    });
    expect(ticked.visits[2].tasks[1].done).toBe(true);

    const { last } = conversation(ticked, 'What about now?');
    expect(last.text).toBe(
      'Checked. Priya Raman’s ‘Check wound dressing’ task is currently checked.',
    );
  });
});

describe('recorded, unchecked and actionable remain three different counts', () => {
  const mixed = () => {
    /* Ivor cancelled and Priya completed, both keeping unchecked records. */
    const cancelled = cancelWith(initialDemoState(), 'v4', 'Family cancelled');
    return reduce(cancelled, { type: 'advance-status', id: 'v3', confirmed: true });
  };

  it('counts only actionable work as left', () => {
    const state = mixed();
    expect(state.visits[3].status).toBe('cancelled');
    expect(state.visits[2].status).toBe('completed');

    /* Halina, Terrence and Sunita: three unchecked tasks each. */
    const { last } = conversation(state, 'How many tasks are left?');
    expect(last.text).toBe('9 tasks on unresolved visits.');
  });

  it('retrieves unchecked records on a cancelled visit when asked for them', () => {
    const { last } = conversation(mixed(), 'Are there any unchecked tasks on cancelled visits?');

    expect(last.text).toContain('Ivor Bankole — Walk the hallway circuit twice (unchecked)');
    expect(last.text).toContain('Check the stair rail is secure (unchecked)');
  });

  it('explains directly that those records are not work remaining', () => {
    const { last } = conversation(
      mixed(),
      'Are there any unchecked tasks on cancelled visits?',
      'Do those count as work remaining?',
    );

    expect(last.text).toContain('None of these tasks count as work remaining');
    expect(last.text).toContain('unchecked tasks on unresolved visits');
  });

  it('applies both conditions to completed visits with unchecked work', () => {
    const { last } = conversation(mixed(), 'Which completed visits still have unchecked tasks?');

    expect(last.text).toContain('Priya Raman');
    /* Marguerite and Desmond are completed with nothing unchecked. */
    expect(last.text).not.toContain('Marguerite');
    expect(last.text).not.toContain('Desmond');
  });

  it('refines the previous selection rather than searching for “only”', () => {
    const { last } = conversation(
      mixed(),
      'Which medication tasks still need doing?',
      'Only on visits I still need to do',
    );

    /* "Only" is a refinement of the previous selection, never a task to find. */
    expect(last.text).not.toMatch(/mentions only|task called only/i);
    /* The medication query was already actionable, so refining it holds the
       same two records: Halina's, on the one unresolved medication visit. */
    expect(last.text).toContain('Halina Nowak — Prompt midday medication (unchecked)');
    expect(last.text).toContain('Check the repeat prescription date (unchecked)');
    expect(last.text).not.toContain('Desmond');
    expect(last.text).not.toContain('Ivor');
  });
});

describe('scheduled time remaining sums recorded slots only', () => {
  it('matches the durations computed from the fixture', () => {
    const state = initialDemoState();

    /* Independently: Priya 60, Ivor 45, Halina 35, Terrence 40, Sunita 45. */
    const unresolved = state.visits.filter((v) => !['completed', 'cancelled'].includes(v.status));
    expect(unresolved.map((v) => v.id)).toEqual(['v3', 'v4', 'v5', 'v6', 'v7']);

    const { last } = conversation(
      state,
      'How much scheduled visit time remains, excluding cancelled and completed visits?',
    );

    expect(last.text).toContain('225 scheduled minutes across 5 visits');
    expect(last.text).toContain('excluding travel, gaps and elapsed time');
  });
});

describe('queries leave the round unchanged', () => {
  it('writes nothing but the conversation', () => {
    const before = initialDemoState();
    const visits = structuredClone(before.visits);

    const { state } = conversation(
      before,
      'Which visits are planned?',
      'How many is that?',
      'Does Priya’s wound task need a photograph?',
      'What about now?',
      'How many tasks are left?',
    );

    expect(state.visits).toEqual(visits);
  });
});

/*
 * A clarification must be answerable, and must never trap the next question.
 *
 * The reported loop: after "do I have any medication task today?" named two
 * tasks, every follow-up came back with "which task do you mean? Please name
 * the task" — including "how long for Desmond's medication task?", which had
 * already named one. The cause was shared rather than phrasal: the medication
 * concept matches three of Desmond's tasks (a prompt, a blister pack and a
 * note about doses), so naming a person and a concept still left three
 * candidates, and the clarification listed none of them.
 */
describe('a task clarification can always be answered', () => {
  const replay = (turns) => {
    let state = initialDemoState();
    const said = [];
    for (const question of turns) {
      state = demoReducer(state, { type: 'assistant-ask', question });
      const answer = answerLocally(question, state);
      state = demoReducer(state, { type: 'assistant-reply', text: answer.text, mode: 'fallback' });
      said.push(answer);
    }
    return said;
  };

  it('resolves a named person and concept against the preceding selection', () => {
    const [, , third] = replay([
      'Do I have any medication task today?',
      'How long for?',
      "How long for Desmond's medication task?",
    ]);

    /* The reported failure: this turn used to ask which task, again. */
    expect(third.intent).not.toBe('clarify-task');
    expect(third.text).toContain('Desmond Achebe');
    expect(third.text).toContain('Prompt morning medication');
  });

  it('says a duration is unrecorded rather than borrowing the visit’s', () => {
    const [, , third] = replay([
      'Do I have any medication task today?',
      'How long for?',
      "How long for Desmond's medication task?",
    ]);

    expect(third.text).toMatch(/does not specify a duration/);
    /* Desmond's visit is scheduled 8:45–9:15. None of that may appear. */
    expect(third.text).not.toMatch(/30|minutes|8:45|9:15/);
  });

  it('never leaves the reader without a way to answer', () => {
    const [, second] = replay(['Do I have any medication task today?', 'How long for?']);

    /* Both matching tasks are prompts, and neither records a duration, so the
       honest answer needs no choice from the reader at all. */
    expect(second.intent).toBe('task-detail');
    expect(second.text).toMatch(/None of those tasks records a duration/);
    expect(second.text).toContain('Prompt morning medication');
    expect(second.text).toContain('Prompt midday medication');
  });

  it('names the candidates when a choice genuinely has to be made', () => {
    const [, second] = replay(['Which tasks mention exercises?', 'How long?']);

    /* Here one task does record a duration, so the reader must pick — and the
       question now carries the options rather than asking blind. */
    expect(second.intent).toBe('clarify-task');
    expect(second.text).toContain('Log how the exercises were tolerated');
    expect(second.text).toContain('Seated exercises, ten minutes');
  });

  it('lets a new question resolve a pending clarification', () => {
    const [, , third] = replay([
      'Which tasks mention exercises?',
      'How long?',
      'How long are Sunita’s seated exercises?',
    ]);

    expect(third.intent).toBe('task-detail');
    expect(third.text).toContain('10 minutes');
  });

  it('lets an unrelated question escape a pending clarification', () => {
    const [, , third, fourth] = replay([
      'Which tasks mention exercises?',
      'How long?',
      'Who is my next visit?',
      'How many visits are left?',
    ]);

    for (const answer of [third, fourth]) {
      expect(answer.intent).not.toBe('clarify-task');
      expect(answer.text).not.toMatch(/Which task do you mean/);
    }
    expect(third.text).toContain('Priya Raman');
    expect(fourth.text).toContain('5 visits remain');
  });

  it('still answers the rest of the reported exchange', () => {
    const said = replay([
      'Do I have any medication task today?',
      'How long for?',
      "How long for Desmond's medication task?",
      'You said Desmond has a medication task right?',
      'You said Desmond Achebe has a medication task',
      'Desmond, does he have a medication related task?',
    ]);

    /* Not one turn of the reported conversation asks the reader to name a task. */
    for (const answer of said) {
      expect(answer.text).not.toMatch(/Please name the task/);
    }
    expect(said[3].text).toContain('Prompt morning medication');
    expect(said[5].text).toContain('Desmond Achebe');
  });

  it('leaves the round untouched throughout', () => {
    const before = initialDemoState();
    const copy = structuredClone(before);
    for (const question of [
      'Do I have any medication task today?',
      "How long for Desmond's medication task?",
      'How long?',
    ]) {
      answerLocally(question, before);
    }
    expect(before).toEqual(copy);
  });
});
