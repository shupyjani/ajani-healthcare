import '@testing-library/jest-dom/vitest';
import { afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import { installMatchMedia, resetMedia } from './test/viewport';
import { installIntersectionObserver, resetIntersectionObservers } from './test/intersection';
import { resetMotionForTests } from './lib/motion';

/*
 * jsdom implements neither matchMedia, nor IntersectionObserver, nor
 * scrolling. All three are used by production code — the Navbar's breakpoint
 * hook, the motion controller, ScrollToTop, the skip link and section
 * navigation — so they are stubbed here rather than guarded away in the
 * components.
 *
 * IntersectionObserver is installed by default so the ordinary test runs
 * exercise the real motion path. Cases that need it gone remove it themselves.
 */

installMatchMedia();
installIntersectionObserver();
window.scrollTo = vi.fn();
Element.prototype.scrollIntoView = vi.fn();

afterEach(() => {
  cleanup();
  /* The motion controller holds one shared observer for the lifetime of the
     module. Drop it between cases so a suite that swapped the implementation
     does not leave the next case observing through the old one. */
  resetMotionForTests();
  resetIntersectionObservers();
  resetMedia();
  installMatchMedia();
  installIntersectionObserver();
  vi.clearAllMocks();
});
