import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import { renderApp } from './renderApp';
import { intersectAll, observedElements, removeIntersectionObserver } from './intersection';
import { setReducedMotion } from './viewport';

const HERO_HEADING =
  'Healthcare workforce, operations and digital solutions shaped by real-world care.';

describe('hero entrance', () => {
  it('reveals the headline as one node, leaving its accessible name whole', () => {
    renderApp('/');

    const heading = screen.getByRole('heading', { level: 1 });
    expect(heading).toHaveAccessibleName(HERO_HEADING);
    expect(heading).toHaveTextContent(HERO_HEADING);
    /* No per-word or per-letter wrappers: the heading is a single text node,
       which is what keeps assistive technology reading one continuous name. */
    expect(heading.children).toHaveLength(0);
  });

  it('reveals meaningful phrase groups rather than individual words', () => {
    renderApp('/');

    /* Eyebrow, headline, lede, actions, trust list, visual panel. */
    expect(document.querySelectorAll('.hero .reveal')).toHaveLength(6);
    expect(document.querySelector('.hero-lede')).toHaveClass('reveal');
    expect(document.querySelector('.hero-actions')).toHaveClass('reveal');
  });

  it('gives the eyebrow a horizontal entrance and the headline a scale settle', () => {
    renderApp('/');

    expect(document.querySelector('.hero-eyebrow')).toHaveClass('reveal--label');
    expect(screen.getByRole('heading', { level: 1 })).toHaveClass('reveal--headline');
  });

  it('staggers the supporting copy, actions and visual behind the headline', () => {
    renderApp('/');

    const order = (selector) =>
      document.querySelector(selector).style.getPropertyValue('--reveal-order');

    expect(order('.hero-heading')).toBe('1');
    expect(order('.hero-lede')).toBe('2');
    expect(order('.hero-actions')).toBe('3');
    expect(order('.hero-trust')).toBe('4');
    expect(order('.hero-visual-panel')).toBe('4');
  });

  it('animates the hero visual into position as a panel', () => {
    renderApp('/');

    expect(document.querySelector('.hero-visual-panel')).toHaveClass('reveal--panel');
  });
});

describe('scroll reveals', () => {
  it('holds content pending until it enters the viewport', () => {
    renderApp('/');

    const cards = document.querySelectorAll('.service-card');
    expect(cards).toHaveLength(3);
    for (const card of cards) {
      expect(card).toHaveClass('is-pending');
      expect(card).not.toHaveClass('is-revealed');
    }

    expect(observedElements().length).toBeGreaterThan(0);
  });

  it('reveals on entry, and only once', () => {
    renderApp('/');

    intersectAll();

    for (const card of document.querySelectorAll('.service-card')) {
      expect(card).toHaveClass('is-revealed');
      expect(card).not.toHaveClass('is-pending');
    }

    /* Everything revealed has been unobserved, so nothing can re-run. */
    expect(observedElements()).toHaveLength(0);
  });

  it('covers services, products, about, transparency and the closing CTA', () => {
    renderApp('/');
    intersectAll();

    const revealedIn = (selector) =>
      document.querySelectorAll(`${selector} .reveal.is-revealed`).length;

    expect(revealedIn('#services')).toBeGreaterThan(0);
    expect(revealedIn('#products')).toBeGreaterThan(0);
    expect(revealedIn('#about')).toBeGreaterThan(0);
    expect(revealedIn('#transparency')).toBeGreaterThan(0);
    expect(revealedIn('.closing-cta')).toBeGreaterThan(0);
  });

  it('staggers cards within a group without stacking delays across the page', () => {
    renderApp('/');

    const orders = [...document.querySelectorAll('.service-card')].map((card) =>
      card.style.getPropertyValue('--reveal-order'),
    );
    /* The first card carries no inline order at all, which is the same thing
       as zero and keeps the markup free of no-op custom properties. */
    expect(orders).toEqual(['', '1', '2']);
  });

  it('never reveals a section element itself, so anchor targets cannot move', () => {
    renderApp('/');

    for (const id of ['services', 'products', 'about', 'transparency']) {
      const section = document.getElementById(id);
      expect(section).not.toHaveClass('reveal');
      expect(section).not.toHaveClass('is-pending');
    }
  });
});

describe('progressive enhancement', () => {
  it('leaves every reveal visible when IntersectionObserver is unavailable', () => {
    removeIntersectionObserver();
    renderApp('/');

    expect(document.querySelectorAll('.is-pending')).toHaveLength(0);
    expect(observedElements()).toHaveLength(0);

    /* The content is all still there, not merely un-animated. */
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
    expect(screen.getByText(/Three connected strands of work/i)).toBeInTheDocument();
    expect(document.querySelectorAll('.service-card')).toHaveLength(3);
  });

  it('applies no pre-reveal state under prefers-reduced-motion', () => {
    setReducedMotion(true);
    renderApp('/');

    expect(document.querySelectorAll('.is-pending')).toHaveLength(0);
    expect(observedElements()).toHaveLength(0);
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
  });

  it('still animates when reduced motion is not requested', () => {
    setReducedMotion(false);
    renderApp('/');

    expect(document.querySelectorAll('.is-pending').length).toBeGreaterThan(0);
  });
});

describe('motion stylesheet', () => {
  const motionCss = readFileSync('src/styles/motion.css', 'utf8');
  const themeCss = readFileSync('src/styles/theme.css', 'utf8');

  it('hides nothing without a state class applied by script', () => {
    /* `.reveal` on its own must carry no opacity or transform, or content
       would be hidden before the controller ever runs. */
    const bareRule = /\n\.reveal\s*\{([^}]*)\}/.exec(motionCss);
    expect(bareRule).not.toBeNull();
    expect(bareRule[1]).not.toMatch(/opacity|transform/);
  });

  it('forces reveals visible under reduced motion', () => {
    const block = motionCss.slice(motionCss.indexOf('@media (prefers-reduced-motion: reduce)'));
    expect(block).toMatch(/opacity:\s*1\s*!important/);
    expect(block).toMatch(/transform:\s*none\s*!important/);
    expect(block).toMatch(/transition:\s*none\s*!important/);
  });

  it('strips hover movement under reduced motion too', () => {
    const block = themeCss.slice(themeCss.indexOf('@media (prefers-reduced-motion: reduce)'));
    expect(block).toMatch(/transform:\s*none\s*!important/);
  });

  it('runs no continuous animation anywhere', () => {
    for (const css of [motionCss, themeCss]) {
      expect(css).not.toMatch(/infinite/);
    }
  });

  it('animates only opacity and transform, never a layout property', () => {
    const transitions = motionCss.match(/transition:[^;]+;/g) ?? [];
    expect(transitions.length).toBeGreaterThan(0);

    for (const declaration of transitions) {
      expect(declaration).not.toMatch(/height|width|margin|padding|top|bottom|left|right/);
    }
  });
});

describe('motion timings', () => {
  const motionCss = readFileSync('src/styles/motion.css', 'utf8');

  /* Reads a millisecond token from :root. The colon in the pattern keeps
     --motion-duration from matching --motion-duration-headline. */
  const ms = (name) => {
    const match = new RegExp(`${name}:[ \\t]*([0-9.]+)ms`).exec(motionCss);
    expect(match).not.toBeNull();
    return Number(match[1]);
  };

  const inRange = (value, low, high) => {
    expect(value).toBeGreaterThanOrEqual(low);
    expect(value).toBeLessThanOrEqual(high);
  };

  it('runs reveals slowly enough to feel deliberate', () => {
    inRange(ms('--motion-duration'), 900, 1000);
    inRange(ms('--motion-duration-headline'), 1050, 1100);
    inRange(ms('--motion-duration-panel'), 1100, 1150);
  });

  it('keeps interaction feedback quick', () => {
    /* A hover that takes as long as a reveal feels broken, not polished. */
    inRange(ms('--motion-duration-short'), 120, 260);
  });

  it('staggers widely enough that entrances do not overlap', () => {
    inRange(ms('--motion-stagger'), 120, 140);
    inRange(ms('--motion-stagger-hero'), 150, 170);
  });

  it('travels far enough for the movement to register', () => {
    const up = /\.reveal--up\s*\{[^}]*translate3d\(0,\s*(\d+)px/.exec(motionCss);
    const label = /\.reveal--label\s*\{[^}]*translate3d\(-(\d+)px/.exec(motionCss);

    expect(up).not.toBeNull();
    expect(label).not.toBeNull();
    inRange(Number(up[1]), 18, 24);
    inRange(Number(label[1]), 18, 24);
  });

  it('settles the headline from a scale the eye can resolve', () => {
    const scale = /\.reveal--headline\s*\{[^}]*scale\(([0-9.]+)\)/.exec(motionCss);

    expect(scale).not.toBeNull();
    inRange(Number(scale[1]), 0.94, 0.96);
  });

  it('sequences the hero visual assembly rather than arriving all at once', () => {
    const step = ms('--hv-step');
    const lead = ms('--hv-lead');

    /* Each connector draws between the row above it and the row it feeds,
       which is what makes hub -> connection -> strand legible. */
    expect(lead).toBeGreaterThan(0);
    expect(lead).toBeLessThan(step);
    expect(ms('--hv-base')).toBeGreaterThan(0);
  });

  it('starts the first group immediately, with no blank opening delay', () => {
    renderApp('/');

    /* The eyebrow carries no inline order, so its stagger delay computes to
       zero and nothing gates the first content behind a timer. The calm comes
       from how long each move takes, never from waiting to begin. */
    const eyebrow = document.querySelector('.hero-eyebrow');
    expect(eyebrow).toBeInTheDocument();
    expect(eyebrow.style.getPropertyValue('--reveal-order')).toBe('');
  });

  it('settles the whole hero in about one and a half to two seconds', () => {
    const stagger = ms('--motion-stagger-hero');
    const supporting = ms('--motion-duration');

    /* [order, duration] straight from HeroSection and HeroVisual: eyebrow 0,
       headline 1, lede 2, actions 3, then the trust list and the visual panel
       together at 4. */
    const groups = [
      [0, supporting],
      [1, ms('--motion-duration-headline')],
      [2, supporting],
      [3, supporting],
      [4, supporting],
      [4, ms('--motion-duration-panel')],
    ].map(([order, duration]) => order * stagger + duration);

    /* The diagram inside the panel keeps assembling after the panel lands. */
    const assemblyEnd = ms('--hv-base') + 3 * ms('--hv-step') + ms('--hv-duration');

    inRange(Math.max(...groups, assemblyEnd), 1800, 2000);
  });
});
