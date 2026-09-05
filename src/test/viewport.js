/*
 * A matchMedia stub for jsdom, which ships none.
 *
 * Two preferences are simulated, because two parts of the app read media
 * queries: the Navbar chooses between the mobile and desktop navigation from a
 * width query, and the motion controller checks prefers-reduced-motion before
 * animating anything. Both are settable mid-test, and live listeners are
 * notified, so a suite can resize or switch the motion preference after a
 * component has already mounted.
 *
 * Only the query forms this codebase actually uses are understood; anything
 * else reports no match.
 */

export const DESKTOP_WIDTH = 1280;
export const MOBILE_WIDTH = 375;

let viewportWidth = DESKTOP_WIDTH;
let reducedMotion = false;
const subscriptions = new Set();

export function installMatchMedia() {
  window.matchMedia = (query) => ({
    media: query,
    get matches() {
      return evaluate(query);
    },
    onchange: null,
    addEventListener: (_type, handler) => subscribe(query, handler),
    removeEventListener: (_type, handler) => unsubscribe(handler),
    addListener: (handler) => subscribe(query, handler),
    removeListener: (handler) => unsubscribe(handler),
    dispatchEvent: () => false,
  });
}

export function setViewportWidth(width) {
  viewportWidth = width;
  notify();
}

/** Simulate the operating system's "reduce motion" accessibility setting. */
export function setReducedMotion(value) {
  reducedMotion = value;
  notify();
}

export function resetMedia() {
  viewportWidth = DESKTOP_WIDTH;
  reducedMotion = false;
  subscriptions.clear();
}

function notify() {
  for (const { query, handler } of subscriptions) {
    handler({ matches: evaluate(query), media: query });
  }
}

function subscribe(query, handler) {
  subscriptions.add({ query, handler });
}

function unsubscribe(handler) {
  for (const entry of subscriptions) {
    if (entry.handler === handler) subscriptions.delete(entry);
  }
}

function evaluate(query) {
  if (query.includes('prefers-reduced-motion: reduce')) return reducedMotion;
  if (query.includes('prefers-reduced-motion: no-preference')) return !reducedMotion;

  const max = /\(max-width:\s*(\d+)px\)/.exec(query);
  if (max) return viewportWidth <= Number(max[1]);

  const min = /\(min-width:\s*(\d+)px\)/.exec(query);
  if (min) return viewportWidth >= Number(min[1]);

  return false;
}
