import { describe, expect, it } from 'vitest';
import { answerLocally } from '../lib/assistantFallback';
import { initialDemoState, demoReducer } from '../lib/demoState';
import { interpretTaskDetail, taskResultReferences } from '../lib/assistantTaskDetails';
const ask = (q, state) => answerLocally(q, state).text;
function chat(state, q) {
  const text = ask(q, state);
  return { ...state, assistant: { ...state.assistant, messages: [...state.assistant.messages, { role: 'user', text: q }, { role: 'assistant', text }] } };
}
describe('task identity and recorded properties', () => {
  it.each(['has that task been completed?', 'Is that done?', 'Have I finished that task?'])('resolves %s against a mixed current checklist', q => {
    let state = initialDemoState();
    state.visits[3].tasks[1].done = true;
    state = chat(state, 'Do I have any walk related task today?');
    expect(taskResultReferences(state).map(e => e.task.id)).toEqual(['v4t1']);
    expect(ask(q, state)).toBe('No. Ivor Bankole’s ‘Walk the hallway circuit twice’ task is unchecked.');
    state.visits[3].tasks[0].done = true;
    expect(ask(q, state)).toBe('Yes. Ivor Bankole’s ‘Walk the hallway circuit twice’ task is checked.');
  });
  it('answers outstanding polarity and other tasks without losing identity', () => {
    const state = chat(initialDemoState(), 'Who has a walking task?');
    expect(ask('Is it still outstanding?', state)).toMatch(/^Yes.*Walk the hallway.*unchecked/);
    expect(ask('And the other tasks?', state)).toContain('Check the stair rail');
    expect(ask('And the other tasks?', state)).not.toContain('Walk the hallway');
  });
  it('requires clarification for multiple tasks and supports a task ordinal', () => {
    const state = chat(initialDemoState(), 'What tasks does Priya have?');
    expect(ask('Has that task been completed?', state)).toContain('Which task');
    expect(ask('What about the second task?', state)).toContain('Check wound dressing');
    expect(ask('What about the second task?', state)).not.toContain('Review discharge');
    const clarified = chat(state, 'Has that task been completed?');
    expect(ask('What about the second task?', clarified)).toContain('Check wound dressing');
  });
  it.each([
    ['do you know how long Ivor bankole’s walk should take?', /does not specify a duration.*Walk the hallway/],
    ['How long is the walk?', /does not specify a duration/],
    ['How many times should the hallway circuit be walked?', /repetitions: 2 times/],
    ['How long are Sunita’s seated exercises?', /duration: 10 minutes/],
    ['How long is Ivor’s whole visit?', /45 minutes/],
    ['do you know which dressing type for Priya?', /does not specify a dressing type.*Check wound dressing/],
    ['What medication name is recorded for Halina?', /does not specify a medication name/],
    ['What dose is recorded for Halina?', /does not specify a dose/],
    ['What equipment model is recorded for Sunita?', /does not specify an equipment model/],
    ['What contact number is recorded for Ivor?', /does not specify a contact number/],
  ])('reads the property requested by %s', (q, expected) => expect(ask(q, initialDemoState())).toMatch(expected));
  it('retrieves explicit benign details from synthetic task hints', () => {
    const state = initialDemoState();
    state.visits[2].tasks[1].hint = 'Dressing type: demo sample A';
    state.visits[6].tasks[1].hint = 'Equipment model: Example 12';
    expect(ask('What dressing type is recorded for Priya?', state)).toContain('demo sample A');
    expect(ask('What equipment model is recorded for Sunita?', state)).toContain('Example 12');
  });
  it('keeps a missing-property clarification and the clinical boundary separate', () => {
    const state = chat(initialDemoState(), 'do you know which dressing type for Priya?');
    expect(ask('no I mean here wound dressing type?', state)).toContain('does not specify a dressing type');
    expect(ask('Which dressing should I use?', state)).toContain('cannot give clinical advice');
    expect(ask('What dose is recorded and should I increase it?', state)).toContain('cannot give clinical advice');
  });
  it('keeps unchecked tasks after completion and labels completion slots as scheduled', () => {
    let state = chat(initialDemoState(), 'Who has a wound task?');
    state = demoReducer(state, { type: 'advance-status', id: 'v3', confirmed: true });
    expect(ask('Has that task been completed?', state)).toMatch(/^No.*unchecked/);
    expect(ask('Which visit did I just finish?', state)).toContain('scheduled 9:40–10:40');
  });
  it('distinguishes visit and task properties during interpretation', () => {
    expect(interpretTaskDetail('How long is Ivor’s whole visit?').wholeVisit).toBe(true);
    expect(interpretTaskDetail('How many times should the circuit be walked?').property).toBe('repetitions');
  });
});
describe('reverse-action guidance', () => {
  it.each(['why can’t I restore a cancelled visit to planned?', 'How can I undo a cancellation?', 'How do I reopen a cancelled visit?', 'How can I undo completion?', 'How do I reopen a Completed visit?', 'How can I restore it to Planned?', 'Can I undo a cancellation?'])('%s', q => {
    const text = ask(q, initialDemoState());
    expect(text).toMatch(/does not support|cannot be reopened/);
    expect(text).toContain('entire round');
    expect(text).toContain('clears the conversation');
  });
  it('explains closed checklists and the supported return separately', () => {
    expect(ask('Why can’t I untick a task on a closed visit?', initialDemoState())).toContain('read-only');
    expect(ask('How do I return an En route visit to Planned?', initialDemoState())).toContain('Confirm the return');
    expect(ask('Restore it for me', initialDemoState())).toContain('can’t change');
  });
});
