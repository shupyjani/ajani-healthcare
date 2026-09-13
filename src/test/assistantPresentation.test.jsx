import React from 'react';
import { describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import AssistantScreen from '../components/demo/AssistantScreen';
import { answerLocally } from '../lib/assistantFallback';
import { classify } from '../lib/assistantIntent';
import { recognisePerson } from '../lib/assistantPeople';
import { initialDemoState, demoReducer } from '../lib/demoState';
const ask = (q, state = initialDemoState()) => answerLocally(q, state);
const chat = (state, q) => ({ ...state, assistant: { ...state.assistant, messages: [{ role: 'user', text: q }, { role: 'assistant', text: ask(q, state).text }] } });

describe('possessives and speech acts', () => {
  it.each(['priyas task', 'Priya’s tasks', "PRIYA'S TASKS", 'Halinas tasks', 'Ivors task', 'Priya Ramans tasks'])('recognises %s in a status question', phrase => {
    const q = `did I complete all ${phrase}?`;
    expect(classify(q)).toBe('lookup');
    expect(ask(q).text).toMatch(/^No\./);
    expect(ask(q).intent).not.toBe('mutation');
  });
  it.each(['Did I complete all John task?', 'Did I complete all zoras task?', 'Have I completed Zora’s tasks?', 'Are all Zora’s tasks done?'])('keeps an unresolved status question read-only: %s', q => {
    expect(classify(q)).toBe('lookup');
    expect(ask(q).intent).toBe('not-found');
  });
  it('still refuses imperatives', () => expect(ask('Complete Priya’s tasks for me').intent).toBe('mutation'));
  it('prefers exact names ending in s and clarifies possessive collisions', () => {
    const visits = [{ id: 'a', name: 'Chris' }, { id: 'b', name: 'Chri' }];
    expect(recognisePerson('Chris tasks', visits).visit.id).toBe('a');
    expect(recognisePerson('Chriss tasks', visits).visit.id).toBe('a');
    const collision = [{ id: 'a', name: 'Dana West' }, { id: 'b', name: 'Dana East' }];
    expect(recognisePerson('Danas tasks', collision)).toEqual({ ambiguous: true });
    expect(recognisePerson('Dana Wests tasks', collision).visit.id).toBe('a');
  });
});

describe('short task properties and broader categories', () => {
  it.each(['How long for?', 'How long does it take?', 'What about its duration?'])('retains washing context for %s', q => {
    const state = chat(initialDemoState(), 'any wash?');
    expect(ask(q, state).text).toMatch(/task does not specify a duration/);
    expect(ask(q, state).text).not.toContain('45 minutes');
    expect(ask('How long is her whole visit?', state).text).toContain('45 minutes');
  });
  it('uses task repetitions, status and present durations', () => {
    const walk = chat(initialDemoState(), 'Does anyone have a walking task?');
    expect(ask('How many times?', walk).text).toContain('2 times');
    expect(ask('Is it done?', walk).text).toMatch(/^No.*unchecked/);
    const exercises = chat(initialDemoState(), 'What is Sunita’s seated exercises task?');
    expect(ask('How long for?', exercises).text).toContain('10 minutes');
  });
  it('handles synthetic tasks with and without timings, and ambiguity', () => {
    const state = initialDemoState();
    state.visits[0].tasks = [{ id: 'custom', label: 'Sort supplies', hint: 'Allow 5 minutes', done: false }];
    let context = chat(state, 'What tasks does Marguerite have?');
    expect(ask('What about its duration?', context).text).toContain('5 minutes');
    delete state.visits[0].tasks[0].hint;
    context = chat(state, 'What tasks does Marguerite have?');
    expect(ask('How long does it take?', context).text).toContain('does not specify a duration');
    /*
     * None of Priya's three tasks records a duration, so the reader is told
     * that rather than asked to choose between three answers that would all be
     * "not recorded" — the clarification loop this behaviour replaced.
     */
    const noneRecorded = ask('How long for?', chat(initialDemoState(), 'What tasks does Priya have?'));
    expect(noneRecorded.intent).toBe('task-detail');
    expect(noneRecorded.text).toMatch(/None of .* records a duration/);

    /* A choice that genuinely matters still asks — and names the options. */
    const realChoice = ask('How long?', chat(initialDemoState(), 'Which tasks mention exercises?'));
    expect(realChoice.intent).toBe('clarify-task');
    expect(realChoice.text).toContain('Seated exercises, ten minutes');
  });
  it('maps broad categories without upgrading actions or counting closed work as due', () => {
    expect(ask('any hygiene related task?').text).toContain('Support with washing and dressing (done)');
    expect(ask('any hygiene related task?').text).not.toContain('wound');
    expect(ask('any hygiene tasks still to do?').text).toContain('No matching');
    expect(ask('any mobility tasks?').text).toContain('Seated exercises');
    expect(ask('any walking task?').text).not.toContain('Seated exercises');
    expect(ask('any food preparation tasks?').text).toContain('Prepare breakfast');
    expect(ask('any medication tasks?').text).toContain('Prompt morning medication');
    expect(ask('any food preparation tasks still to do?').text).not.toContain('Marguerite');
    expect(ask('any medication tasks still to do?').text).not.toContain('Desmond');
    const closed = initialDemoState();
    closed.visits[5].status = 'cancelled';
    expect(ask('any food preparation tasks still to do?', closed).text).toContain('No matching');
    expect(ask('Is there any visit I have to feed the client?').text).toContain('No task');
    expect(ask('Is there any visit I have to administer medication?').text).toContain('No task');
  });
});

describe('reply source presentation', () => {
  it('retains each reply source in a mixed conversation', () => {
    let state = initialDemoState();
    for (const mode of ['fallback', 'live', 'fallback']) {
      state = demoReducer(state, { type: 'assistant-ask', question: 'Who is next?' });
      state = demoReducer(state, { type: 'assistant-reply', requestId: state.assistant.requestId, mode, text: `Reply ${mode}` });
    }
    expect(state.assistant.messages.filter(m => m.role === 'assistant').map(m => m.mode)).toEqual(['fallback', 'live', 'fallback']);
    render(<AssistantScreen assistant={state.assistant} onAsk={() => {}} onBack={() => {}} />);
    expect(screen.getByRole('status', { name: 'Latest reply source' })).toHaveTextContent('Built-in guidance');
    const log = screen.getByRole('log');
    expect(within(log).getAllByText('Assistant · Built-in guidance')).toHaveLength(2);
    expect(within(log).getByText('Assistant · AI response')).toBeInTheDocument();
    expect(screen.getByText('Operational assistant. It cannot give clinical advice or update visits.')).toBeInTheDocument();
  });
});
