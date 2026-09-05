/*
 * A controllable IntersectionObserver for jsdom, which ships none.
 *
 * Nothing here decides on its own when an element is on screen — jsdom has no
 * layout, so it could not. Instead a test says explicitly when the observed
 * elements come into view by calling intersectAll(), which is what makes
 * "reveals when scrolled to" a thing that can actually be asserted.
 *
 * removeIntersectionObserver() covers the other half: the browsers, and the
 * moments, where the API simply is not there.
 */

let instances = [];

export function installIntersectionObserver() {
  class TestIntersectionObserver {
    constructor(callback, options) {
      this.callback = callback;
      this.options = options;
      this.elements = new Set();
      instances.push(this);
    }

    observe(element) {
      this.elements.add(element);
    }

    unobserve(element) {
      this.elements.delete(element);
    }

    disconnect() {
      this.elements.clear();
    }

    takeRecords() {
      return [];
    }
  }

  window.IntersectionObserver = TestIntersectionObserver;
}

/** Simulate the API being unavailable, as on an old browser. */
export function removeIntersectionObserver() {
  delete window.IntersectionObserver;
}

/** Report every currently observed element as having scrolled into view. */
export function intersectAll() {
  for (const instance of instances) {
    const targets = Array.from(instance.elements);
    if (targets.length === 0) continue;

    instance.callback(
      targets.map((target) => ({ target, isIntersecting: true, intersectionRatio: 1 })),
      instance,
    );
  }
}

/** Everything the app has asked to be told about. */
export function observedElements() {
  return instances.flatMap((instance) => Array.from(instance.elements));
}

export function resetIntersectionObservers() {
  instances = [];
}
