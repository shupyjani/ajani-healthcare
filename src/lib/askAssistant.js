import { ASSISTANT_MESSAGE_LIMIT, assistantSnapshot } from './demoState';
import { answerLocally } from './assistantFallback';

/*
 * Asking the assistant a question.
 *
 * Tries the serverless endpoint, and answers from the built-in guidance the
 * moment that path is anything other than a clear success — unconfigured,
 * unreachable, slow, refused, or a reply that arrived empty. The demo is
 * public, so working without a provider is the normal case rather than the
 * degraded one.
 *
 * The caller is told which path answered, so the interface can show the
 * fallback notice honestly and never present built-in text as model output.
 */

export const ASSISTANT_ENDPOINT = '/.netlify/functions/ajani-assistant';

const REQUEST_TIMEOUT_MS = 12_000;
const HISTORY_SENT = 6;

export async function askAssistant(question, state, { fetchImpl = globalThis.fetch } = {}) {
  const asked = (question ?? '').trim().slice(0, ASSISTANT_MESSAGE_LIMIT);

  /* Both boundaries are decided locally, before anything leaves the browser:
     a clinical question is never sent to a provider to be refused remotely. */
  const local = answerLocally(asked, state);
  if (local.intent === 'clinical' || local.intent === 'disclosure' || local.intent === 'mutation') {
    return { text: local.text, mode: 'fallback', intent: local.intent };
  }

  const body = {
    message: asked,
    history: state.assistant.messages.slice(-HISTORY_SENT).map(({ role, text }) => ({ role, text: text.slice(0, ASSISTANT_MESSAGE_LIMIT) })),
    snapshot: { ...assistantSnapshot(state), ...(local.context ? { selectionContext: local.context } : {}) },
  };

  const controller = typeof AbortController === 'function' ? new AbortController() : null;
  const timer = controller ? setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS) : null;

  try {
    if (typeof fetchImpl !== 'function') throw new Error('no transport');

    const response = await fetchImpl(ASSISTANT_ENDPOINT, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller?.signal,
    });

    if (!response.ok) return { ...local, mode: 'fallback' };

    const data = await response.json();
    if (data?.fallback || typeof data?.reply !== 'string' || data.reply.trim() === '') {
      return { ...local, mode: 'fallback' };
    }

    return { text: data.reply.trim(), mode: 'live', intent: local.intent, ...(local.context ? { context: local.context } : {}) };
  } catch {
    return { ...local, mode: 'fallback' };
  } finally {
    if (timer) clearTimeout(timer);
  }
}
