import { describe, it, expect } from 'vitest';
import { answerLocally } from '../lib/assistantFallback';
import { initialDemoState, demoReducer, assistantSnapshot } from '../lib/demoState';
import { askAssistant } from '../lib/askAssistant';

function turn(state, question) {
  const result = answerLocally(question, state);
  state.assistant.messages.push({ role: 'user', text: question }, { role: 'assistant', ...result });
  return result;
}
const ask = (q, s = initialDemoState()) => answerLocally(q, s).text;
const closedFixture = () => {
  const s = initialDemoState();
  s.visits[2].status = 'completed'; // preserves its two unchecked records
  s.visits[4].status = 'cancelled';
  s.visits[4].cancellation = { reason: 'Family cancelled', note: '' };
  return s;
};

describe('selection corrections with explicit fixtures and history', () => {
  it('confirms seed totals independently', () => {
    const s = initialDemoState();
    expect(s.visits.flatMap(v => v.tasks)).toHaveLength(21);
    expect(s.visits.flatMap(v => v.tasks).filter(t => t.done)).toHaveLength(7);
    expect(ask('How many tasks are left?', s)).toMatch(/^14 tasks/);
  });
  it.each(['still need doing', 'left to do', 'not done yet', 'still to do'])('uses actionable scope for medication tasks %s', phrase => {
    expect(ask(`Which medication tasks ${phrase}?`)).toContain('Halina Nowak');
    expect(ask(`Which medication tasks ${phrase}?`)).not.toContain('Desmond');
    expect(ask(`Which medication tasks ${phrase}?`, closedFixture())).toMatch(/^No matching/);
  });
  it('retrieves unchecked closed records and explains whether those count', () => {
    const s = closedFixture();
    expect(turn(s, 'Are there any unchecked tasks on cancelled visits?').text).toContain('Prompt midday medication');
    expect(turn(s, 'Do those count as work remaining?').text).toMatch(/^None of these tasks count/);
    expect(ask('Which completed visits still have unchecked tasks?', s)).toContain('Priya Raman');
    expect(ask('Which completed visits still have unchecked tasks?', s)).not.toContain('Marguerite');
    expect(ask('How many tasks are left?', s)).toMatch(/^9 tasks/);
  });
  it('refines recorded tasks to unresolved scope, without losing checked-state or concepts', () => {
    const s = closedFixture();
    turn(s, 'Are there any unchecked tasks on cancelled visits?');
    expect(turn(s, 'Only on visits I still need to do').text).toMatch(/^No matching/);
  });
  it('changes OR to visit-level AND, allowing separate tasks', () => {
    const s = initialDemoState();
    s.visits[3].tasks.push({ id: 'wash', label: 'Support with washing', done: false });
    const union = turn(s, 'Who has washing or walking tasks?').text;
    expect(union).toContain('Marguerite'); expect(union).toContain('Ivor');
    const intersection = turn(s, 'Who has both?').text;
    expect(intersection).toContain('Ivor'); expect(intersection).not.toContain('Marguerite');
  });
  it('retains planned plus time filters for selected task totals and re-evaluates current state', () => {
    const s = initialDemoState();
    expect(turn(s, 'Which visits after midday are still planned?').text).toContain('3 matching visits');
    expect(turn(s, 'How many tasks do those visits have altogether?').text).toMatch(/^9 tasks/);
    s.visits[4].status = 'cancelled';
    expect(turn(s, 'How many tasks do those visits have altogether?').text).toMatch(/^6 tasks/);
  });
  it.each([
    ['Which visits before noon are planned?', ['Ivor'], ['Halina', 'Terrence']],
    ['Which visits after 13:30 are planned?', ['Sunita'], ['Terrence', 'Halina']],
    ['Which visits between 11:00 and 13:30 are planned?', ['Ivor', 'Halina', 'Terrence'], ['Sunita']],
  ])('applies start-time boundaries for %s', (q, yes, no) => {
    const text = ask(q); yes.forEach(n => expect(text).toContain(n)); no.forEach(n => expect(text).not.toContain(n));
  });
  it('keeps an empty set empty and distinguishes failed or ambiguous context', () => {
    const s = initialDemoState();
    turn(s, 'Which planned visits start after 18:00?');
    expect(turn(s, 'How many tasks do those visits have altogether?').text).toMatch(/^0 tasks/);
    turn(s, 'What tasks does Zora have?');
    expect(turn(s, 'How many tasks do those visits have altogether?').intent).toBe('clarify');
    s.visits[0].name = 'Dana West'; s.visits[1].name = 'Dana East';
    turn(s, 'What tasks does Dana have?');
    expect(turn(s, 'How many tasks do those visits have altogether?').intent).toBe('clarify');
  });
  it('keeps task identity through correction, duration and whole-visit operation', () => {
    const s = initialDemoState();
    expect(turn(s, 'Show Ivor’s walking task').text).toContain('Walk the hallway circuit twice');
    expect(s.assistant.messages.at(-1).text).not.toContain('stair rail');
    expect(turn(s, 'Actually, Sunita’s exercises—how long?').text).toContain('10 minutes');
    expect(turn(s, 'And the whole visit?').text).toContain('45 minutes');
  });
  it('completes pending visit duration after clarification', () => {
    const s = closedFixture();
    expect(turn(s, 'How long is the visit?').text).toBe('Which visit did you mean?');
    const text = turn(s, 'Halina').text;
    expect(text).toContain('35 minutes'); expect(text).toContain('Cancelled');
  });
  it('rechecks an individual task after a state change', () => {
    const s = initialDemoState();
    turn(s, 'Does anyone have a walking task?');
    expect(turn(s, 'Has that task been completed?').text).toMatch(/^No/);
    s.visits[3].tasks[0].done = true;
    expect(turn(s, 'What about now?').text).toMatch(/^Checked/);
  });
  it('distinguishes cancellation notes from operational notes', () => {
    const s = closedFixture();
    expect(turn(s, 'Why was Halina’s visit cancelled?').text).toContain('Family cancelled');
    expect(turn(s, 'Was there an additional note?').text).toBe('No additional cancellation note was recorded for Halina Nowak.');
    expect(turn(s, 'What are her operational notes?').text).toContain('Hard of hearing');
  });
  it('uses explicit negative photography hints rather than absent properties', () => {
    const s = initialDemoState();
    s.visits[2].tasks[0].hint = 'Photograph required';
    const no = ask('Which of Priya’s tasks don’t need a photograph?', s);
    expect(no).toContain('Check wound dressing'); expect(no).not.toContain('Review discharge'); expect(no).not.toContain('appointment');
    expect(ask('Which of Priya’s tasks need a photograph?', s)).toContain('Review discharge notes');
    expect(ask('Which of Priya’s tasks need a photograph?', s)).not.toContain('Check wound dressing');
  });
  it('sums full recorded unresolved slots, independently expected 45+40+45', () => {
    const s = closedFixture();
    expect(ask('How much scheduled visit time remains, excluding cancelled and completed visits?', s)).toMatch(/^130 scheduled minutes/);
    expect(assistantSnapshot(s).visits[3].travel).toBe('14 min');
  });
  it('preserves records while checking and cancelling reduce work', () => {
    let s = initialDemoState();
    s = demoReducer(s, { type: 'toggle-task', visitId: 'v3', taskId: 'v3t2' });
    expect(ask('How many tasks are left?', s)).toMatch(/^13 tasks/);
    const before = structuredClone(s.visits[4].tasks);
    s.visits[4].status = 'cancelled';
    expect(ask('How many tasks are left?', s)).toMatch(/^10 tasks/);
    expect(s.visits[4].tasks).toEqual(before);
    s.visits.forEach(v => { v.status = 'completed'; });
    expect(ask('How many tasks are left?', s)).toMatch(/^0 tasks/);
  });
  it('supports unequal counts and shuffled renamed schedules without stale prose anchors', () => {
    const s = initialDemoState();
    s.visits[4].name = 'Chris East'; s.visits[4].tasks.push({ id: 'extra', label: 'Check supplies', done: false });
    s.visits.reverse();
    turn(s, 'Which visits after noon are planned?');
    expect(turn(s, 'How many tasks do those visits have altogether?').text).toMatch(/^10 tasks/);
    turn(s, 'Where is Priya?');
    expect(ask('How many tasks are left?', s)).toMatch(/^15 tasks/);
  });
  it('preserves query and source metadata through fallback and mocked provider transport', async () => {
    const s = initialDemoState();
    for (const live of [false, true]) {
      const result = await askAssistant('Which visits after midday are still planned?', s, { fetchImpl: async (_url, opts) => {
        expect(JSON.parse(opts.body).snapshot.visits[3].travel).toBe('14 min');
        return { ok: true, json: async () => live ? { reply: 'The selected planned visits follow noon.' } : { fallback: true } };
      } });
      expect(result.mode).toBe(live ? 'live' : 'fallback');
      expect(result.context.query.time.from).toBe(720);
    }
  });
  it('keeps a temporal result distinct from its anchor during duration follow-up', () => {
    const s = initialDemoState();
    expect(turn(s, 'Who is scheduled after Halina?').text).toContain('Terrence');
    const text = turn(s, 'How long is his visit?').text;
    expect(text).toContain('Terrence'); expect(text).toContain('40 minutes'); expect(text).not.toContain('35 minutes');
  });
  it('finishes an ambiguous task-property request after the person is clarified', () => {
    const s = initialDemoState();
    s.visits[3].tasks[0].hint = 'Allow 5 minutes';
    s.visits[6].tasks[0].label = 'Walk outside'; s.visits[6].tasks[0].hint = 'Allow 10 minutes';
    expect(turn(s, 'How long is the walking task?').intent).toBe('clarify-task');
    expect(turn(s, 'Ivor').text).toContain('5 minutes');
  });
  it.each(['after 1:30 pm', 'after 13:30', 'after 1:30pm'])('reads equivalent afternoon boundaries: %s', boundary => {
    const text = ask(`Which planned visits are ${boundary}?`);
    expect(text).toContain('Sunita'); expect(text).not.toContain('Terrence'); expect(text).not.toContain('Halina');
  });
  it.each(["don't", 'do not', "doesn't", 'does not'])('uses explicit photography negation: %s', negative => {
    const text = ask(`Which of Priya's tasks ${negative} need a photograph?`);
    expect(text).toContain('Check wound dressing'); expect(text).not.toContain('appointment');
  });
  it('preserves inclusion alongside exclusion and agrees between lists and counts', () => {
    const s = initialDemoState();
    const list = turn(s, 'Which planned visits after noon, excluding cancelled visits?');
    expect(list.context.visitIds).toEqual(['v5', 'v6', 'v7']);
    expect(turn(s, 'How many tasks do those visits have altogether?').text).toMatch(/^9 tasks/);
    expect(ask('How many planned visits after noon, excluding cancelled visits?', s)).toMatch(/^3 visits/);
  });
  it('refines a generic unchecked-task count while retaining the checked-state condition', () => {
    const s = closedFixture();
    expect(turn(s, 'How many unchecked tasks are recorded?').text).toMatch(/^14 tasks/);
    expect(turn(s, 'Only on visits I still need to do').text).toMatch(/^9 tasks/);
  });
  it('counts remaining visits with empty checklists and keeps absent task properties honest', () => {
    const s = initialDemoState();
    s.visits[3].tasks = [];
    expect(ask('Which visits still need doing?', s)).toContain('Ivor');
    s.visits[3].tasks = [{ id: 'walk', label: 'Walk outside', done: false }];
    turn(s, 'Show Ivor’s walking task');
    expect(turn(s, 'How many times?').text).toContain('does not specify repetitions');
  });
  it('keeps recorded travel separate from scheduled visit duration', () => {
    const s = closedFixture();
    expect(ask('What is Ivor’s recorded travel estimate?', s)).toContain('14 min');
    expect(ask('How long is Ivor’s whole visit?', s)).toContain('45 minutes');
  });

  it.each(['Why was Halina’s visit cancelled?', 'Why is Halina cancelled?', 'What was Halina’s cancellation reason?'])('reads the cancellation record for %s', q => {
    expect(ask(q, closedFixture())).toContain('Family cancelled');
    expect(ask(q, initialDemoState())).toContain('no cancellation reason is recorded');
  });

});
