import React from 'react';
import { describe, expect, it } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderApp } from './renderApp';
import { readFileSync } from 'node:fs';
import RouteFallback from '../components/RouteFallback';
import { AJANI_MOBILE_ROUTE, FIELD_OPERATIONS_REPO_URL } from '../lib/site';

/*
 * The Ajani Mobile case study.
 *
 * The route is code-split, so every case here waits for the chunk: the first
 * paint is the Suspense fallback, not the page. `findBy*` is what makes that
 * wait explicit rather than incidental.
 */

const SCREEN_CAPTIONS = [
  'Today — shift overview, progress and active visit',
  'Visits — searchable and filterable schedule with operational statuses',
  'Visit detail — task completion and operational notes',
  'More — practitioner profile, working preferences and dark appearance',
];

async function renderCaseStudy() {
  const result = renderApp(AJANI_MOBILE_ROUTE);
  await screen.findByRole('heading', { level: 1, name: 'Ajani Mobile' });
  return result;
}

describe('the case-study route', () => {
  it('renders at /products/ajani-mobile', async () => {
    await renderCaseStudy();

    expect(screen.getByRole('main')).toHaveAttribute('id', 'main-content');
    expect(screen.getByRole('banner')).toBeInTheDocument();
    expect(screen.getByRole('contentinfo')).toBeInTheDocument();
  });

  it('has exactly one H1, naming the application', async () => {
    await renderCaseStudy();

    const headings = screen.getAllByRole('heading', { level: 1 });
    expect(headings).toHaveLength(1);
    expect(headings[0]).toHaveTextContent('Ajani Mobile');
  });

  it('sets a document title of its own', async () => {
    await renderCaseStudy();

    await waitFor(() => {
      expect(document.title).toBe('Ajani Mobile — Ajani Field Operations | Ajani Healthcare');
    });
  });

  it('runs a contiguous heading hierarchy: one H1 then H2s, with no skipped level', async () => {
    await renderCaseStudy();

    const levels = screen
      .getAllByRole('heading')
      .filter((heading) => heading.closest('main'))
      .map((heading) => Number(heading.tagName.slice(1)));

    expect(levels[0]).toBe(1);
    for (const [index, level] of levels.entries()) {
      if (index === 0) continue;
      expect(level - levels[index - 1]).toBeLessThanOrEqual(1);
    }
    expect(new Set(levels)).toEqual(new Set([1, 2]));
  });

  it('lets the skip link reach the route main content', async () => {
    const user = userEvent.setup();
    await renderCaseStudy();

    await user.click(screen.getByRole('link', { name: /Skip to main content/i }));
    expect(screen.getByRole('main')).toHaveFocus();
  });
});

describe('the case-study screens', () => {
  it('shows the four approved screenshots', async () => {
    const { container } = await renderCaseStudy();

    const images = container.querySelectorAll('img');
    expect(images).toHaveLength(4);

    const sources = [...images].map((image) => image.getAttribute('src'));
    for (const name of [
      'ajani-mobile-today-light',
      'ajani-mobile-visits-dark',
      'ajani-mobile-visit-detail-light',
      'ajani-mobile-more-dark',
    ]) {
      expect(sources.some((src) => src && src.includes(name))).toBe(true);
    }
  });

  it('captions each screen in a figure', async () => {
    const { container } = await renderCaseStudy();

    const figures = container.querySelectorAll('.screen-figure');
    expect(figures).toHaveLength(4);

    for (const [index, figure] of figures.entries()) {
      expect(figure.tagName).toBe('FIGURE');
      const caption = figure.querySelector('figcaption');
      expect(caption).toBeInTheDocument();
      expect(caption.textContent).toBe(SCREEN_CAPTIONS[index]);
      expect(figure.querySelectorAll('img')).toHaveLength(1);
    }
  });

  it('does not repeat the caption wording in the alternative text', async () => {
    const { container } = await renderCaseStudy();

    for (const figure of container.querySelectorAll('.screen-figure')) {
      const alt = figure.querySelector('img').getAttribute('alt');
      const caption = figure.querySelector('figcaption').textContent;

      /* Every screenshot is described, and described differently: an empty or
         caption-echoing alt would make a screen reader say the same thing
         twice. */
      expect(alt.length).toBeGreaterThan(40);
      expect(alt).not.toBe(caption);
      expect(alt.toLowerCase()).not.toContain(caption.toLowerCase());
    }
  });

  it('holds the image slot open so the gallery cannot shift as it loads', async () => {
    const { container } = await renderCaseStudy();

    for (const image of container.querySelectorAll('.phone-frame-shot')) {
      expect(image).toHaveAttribute('width', '941');
      expect(image).toHaveAttribute('height', '2048');
      expect(image).toHaveAttribute('loading', 'lazy');
    }
  });
});

describe('the case-study links', () => {
  it('points at the exact native repository, opened safely', async () => {
    await renderCaseStudy();

    const repoLinks = screen.getAllByRole('link', { name: /View native repository/i });
    /* Once in the hero and once in the closing section, plus the footer. */
    expect(repoLinks.length).toBeGreaterThanOrEqual(2);

    for (const link of repoLinks) {
      expect(link).toHaveAttribute('href', FIELD_OPERATIONS_REPO_URL);
      expect(link).toHaveAttribute('target', '_blank');
      expect(link).toHaveAttribute('rel', expect.stringContaining('noopener'));
      expect(within(link).getByText(/opens in a new tab/i)).toBeInTheDocument();
    }
  });

  it('offers an in-page link to the screens and the two closing routes', async () => {
    await renderCaseStudy();

    expect(screen.getByRole('link', { name: /View the product screens/i })).toHaveAttribute(
      'href',
      `${AJANI_MOBILE_ROUTE}#product-screens`,
    );
    expect(document.getElementById('product-screens')).toBeInTheDocument();

    expect(screen.getByRole('link', { name: /Return to products/i })).toHaveAttribute(
      'href',
      '/#products',
    );
    expect(screen.getByRole('link', { name: /Discuss a digital product/i })).toHaveAttribute(
      'href',
      '/contact',
    );
  });

  it('gives every external link the same new-tab treatment as the rest of the site', async () => {
    const { container } = await renderCaseStudy();

    for (const link of container.querySelectorAll('main a[target="_blank"]')) {
      expect(link).toHaveAttribute('rel', expect.stringContaining('noopener'));
      expect(within(link).getByText(/opens in a new tab/i)).toBeInTheDocument();
      expect(link.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
    }
  });
});

describe('what the case study does not claim', () => {
  it('makes no claim the native application cannot support', async () => {
    await renderCaseStudy();

    const main = screen.getByRole('main');
    for (const claim of [
      /App Store/i,
      /TestFlight/i,
      /download/i,
      /offline/i,
      /\bmaps?\b/i,
      /live location/i,
      /location-aware/i,
      /synchronis|synchroniz|\bsync\b/i,
      /authentication/i,
      /AI assistant/i,
      /sign in|log in/i,
    ]) {
      expect(main).not.toHaveTextContent(claim);
    }
  });

  it('describes the screens as captures of the native application', async () => {
    await renderCaseStudy();

    const main = screen.getByRole('main');
    expect(main).toHaveTextContent(/native SwiftUI iPhone application/i);
    expect(main).toHaveTextContent(/Captured from Ajani Mobile running on iPhone/i);

    /* The demo is now offered, so the page may name it — but it must never
       suggest the native application itself runs in a browser, and it must
       not defer anything to a future that has not happened. */
    expect(main).not.toHaveTextContent(/coming soon|not yet available/i);
    expect(main).not.toHaveTextContent(/run the (native|iPhone) app in your browser/i);
    expect(main).not.toHaveTextContent(/this is not the real app|prototype|mock-?up/i);
  });

  it('renders no control that does nothing', async () => {
    const { container } = await renderCaseStudy();

    /* The page is a static case study: every link goes somewhere real and
       there are no buttons at all. */
    expect(container.querySelectorAll('main button')).toHaveLength(0);
    for (const link of container.querySelectorAll('main a')) {
      expect(link.getAttribute('href')).toBeTruthy();
    }
  });
});

describe('the home page is unaffected by the case study', () => {
  it('keeps the home page free of images', () => {
    const { container } = renderApp('/');
    expect(container.querySelectorAll('img')).toHaveLength(0);
  });

  it('links to the case study from the products section and the footer', () => {
    renderApp('/');

    const teaser = document.querySelector('.ajani-mobile-teaser');
    expect(within(teaser).getByRole('link', { name: 'Explore Ajani Mobile' })).toHaveAttribute(
      'href',
      AJANI_MOBILE_ROUTE,
    );

    const footer = screen.getByRole('contentinfo');
    expect(within(footer).getByRole('link', { name: 'Ajani Mobile case study' })).toHaveAttribute(
      'href',
      AJANI_MOBILE_ROUTE,
    );
    expect(within(footer).getByRole('link', { name: /Native repository/i })).toHaveAttribute(
      'href',
      FIELD_OPERATIONS_REPO_URL,
    );
  });

  it('restores the home page title after leaving the case study', async () => {
    const { unmount } = await renderCaseStudy();
    expect(document.title).toContain('Ajani Mobile');

    unmount();
    expect(document.title).not.toContain('Ajani Mobile');
  });
});

describe('the lazy route fallback', () => {
  /*
   * Rendered directly rather than caught mid-Suspense: once the case-study
   * module is in the test runner's cache the boundary resolves inside the same
   * act(), so trying to observe the transient state through the router is a
   * race. What matters is what the fallback itself guarantees.
   */
  it('keeps the skip link target present while a chunk is in flight', () => {
    render(<RouteFallback label="Loading the Ajani Mobile case study…" />);

    const main = screen.getByRole('main');
    expect(main).toHaveAttribute('id', 'main-content');
    expect(main).toHaveAttribute('tabindex', '-1');
  });

  it('announces the load politely rather than silently', () => {
    render(<RouteFallback label="Loading the Ajani Mobile case study…" />);

    expect(screen.getByRole('status')).toHaveTextContent(
      /Loading the Ajani Mobile case study/i,
    );
  });

  it('reserves height so the footer cannot jump when the page arrives', () => {
    const { container } = render(<RouteFallback />);

    /* The height itself lives in RouteFallback.css; this holds the class that
       carries it, and the stylesheet assertion below covers the rule. */
    expect(container.querySelector('.route-fallback')).toBeInTheDocument();
  });

  it('spins nothing: the fallback is static, like the rest of the site', () => {
    const { container } = render(<RouteFallback />);
    expect(container.querySelectorAll('[class*="spin"], [class*="loader"]')).toHaveLength(0);
  });
});

describe('the phone frame does not clip what it contains', () => {
  const phoneCss = readFileSync('src/components/PhoneFrame.css', 'utf8');
  const teaserCss = readFileSync('src/components/AjaniMobileTeaser.css', 'utf8');

  it('leaves the screen unclipped, so a focus ring inside it can paint', () => {
    /* The whole reason the screen is not `overflow: hidden`: the site's focus
       ring is a 3px outline at a 2px offset, and a clipped screen would slice
       it off the teaser's link. */
    const screenRule = /\.phone-frame-screen\s*\{([^}]*)\}/.exec(phoneCss);
    expect(screenRule).not.toBeNull();
    expect(screenRule[1]).not.toMatch(/overflow/);
  });

  it('clips the decoration instead, and keeps the link out of it', () => {
    const wallpaperRule = /\.teaser-wallpaper\s*\{([^}]*)\}/.exec(teaserCss);
    expect(wallpaperRule[1]).toMatch(/overflow:\s*hidden/);

    renderApp('/');
    const cta = screen.getByRole('link', { name: 'Explore Ajani Mobile' });
    expect(cta.closest('.teaser-wallpaper')).toBeNull();
    expect(cta.closest('.teaser-content')).not.toBeNull();
  });

  it('gives the link a focus treatment of its own on the gold pill', () => {
    expect(teaserCss).toMatch(/\.teaser-cta:focus-visible\s*\{/);
  });

  it("meets the site's 44px minimum target size", () => {
    const ctaRule = /\.teaser-cta\s*\{([^}]*)\}/.exec(teaserCss);
    expect(ctaRule[1]).toMatch(/min-height:\s*44px/);
  });
});

describe("the new stylesheets keep the site's motion rules", () => {
  const sheets = [
    'src/components/PhoneFrame.css',
    'src/components/AjaniMobileTeaser.css',
    'src/components/FieldOperationsProduct.css',
    'src/components/RouteFallback.css',
    'src/components/pages/AjaniMobile.css',
  ].map((path) => [path, readFileSync(path, 'utf8')]);

  it('runs no continuous animation anywhere', () => {
    for (const [path, css] of sheets) {
      expect(`${path}: ${/infinite|@keyframes/.test(css)}`).toBe(`${path}: false`);
    }
  });

  it('transitions no layout property', () => {
    for (const [path, css] of sheets) {
      for (const declaration of css.match(/transition:[^;]+;/g) ?? []) {
        expect(`${path}: ${declaration}`).not.toMatch(
          /height|width|margin|padding|top|bottom|left|right/,
        );
      }
    }
  });

  /*
   * Regression guard for the collapsed-phone bug.
   *
   * Everything inside .phone-frame-screen is absolutely positioned, so the
   * frame has no in-flow content and its max-content width is only its
   * padding. While the frame took its width from its parent
   * (`width: 100%; max-width: var(--phone-width)`) that was invisible in an
   * `fr` track and fatal in an `auto` one: the demo page's
   * `minmax(0, 1fr) auto` sized the track to ~18px and aspect-ratio collapsed
   * the height with it.
   *
   * The invariant that fixes it is cheap to state and would have caught the
   * bug: the frame's width must be intrinsic, and only its cap may be a
   * percentage. Asserted on the stylesheet rather than on a rendered pixel,
   * because jsdom performs no layout and a pixel test here would be fiction.
   */
  it('gives the phone an intrinsic width so an auto-sized track cannot collapse it', () => {
    const [, phoneCss] = sheets[0];
    const frameRule = /\.phone-frame\s*\{([^}]*)\}/.exec(phoneCss);

    expect(frameRule).not.toBeNull();
    expect(frameRule[1]).toMatch(/width:\s*var\(--phone-width/);
    expect(frameRule[1]).toMatch(/max-width:\s*100%/);

    /* The old, collapsing arrangement must not come back. */
    expect(frameRule[1]).not.toMatch(/(?<!max-)width:\s*100%/);
    expect(frameRule[1]).not.toMatch(/max-width:\s*var\(--phone-width/);
  });

  it('never sets a phone width to a percentage, which would undo that', () => {
    const declarations = [
      'src/components/PhoneFrame.css',
      'src/components/AjaniMobileTeaser.css',
      'src/components/FieldOperationsProduct.css',
      'src/components/pages/AjaniMobile.css',
      'src/components/pages/AjaniMobileDemo.css',
      'src/components/demo/DemoPhone.css',
    ].flatMap((path) => {
      const css = readFileSync(path, 'utf8');
      /* Both the frame's own property and the demo page's shared one: the
         frame reads the second through the first, so a percentage in either
         reaches the same place. */
      return [...css.matchAll(/--(?:demo-)?phone-width:\s*([^;]+);/g)].map((match) => [
        path,
        match[1].trim(),
      ]);
    });

    expect(declarations.length).toBeGreaterThan(0);
    for (const [path, value] of declarations) {
      /*
       * A percentage makes the width parent-derived again, which is exactly
       * what collapsed the phone to its bezel in an auto grid track. Lengths,
       * viewport units and clamps of those are all definite and all fine —
       * only a percentage is not.
       */
      expect(`${path}: ${value}`).not.toMatch(/%/);
    }
  });

  it("keeps the screen's aspect ratio, which is what gives the frame height", () => {
    const [, phoneCss] = sheets[0];
    const screenRule = /\.phone-frame-screen\s*\{([^}]*)\}/.exec(phoneCss);
    expect(screenRule[1]).toMatch(/aspect-ratio:\s*941\s*\/\s*2048/);
  });
});

describe('the teaser is composed in two regions, not one centred block', () => {
  const teaserCss = readFileSync('src/components/AjaniMobileTeaser.css', 'utf8');

  it('places the lockup high and the call to action low, in named rows', () => {
    const contentRule = /\.teaser-content\s*\{([^}]*)\}/.exec(teaserCss);
    expect(contentRule).not.toBeNull();

    /* Five tracks: space, lockup, space, button, space. The lockup lands in
       the upper third and the button low, with the gap between them owned by
       a track rather than a margin. */
    expect(contentRule[1]).toMatch(/grid-template-rows:\s*1fr auto 1\.6fr auto 0\.7fr/);

    /* The old layout centred everything as one block; that is the thing this
       pass replaced, so it must not come back. */
    expect(contentRule[1]).not.toMatch(/justify-content:\s*center/);

    expect(/\.teaser-lockup\s*\{([^}]*)\}/.exec(teaserCss)[1]).toMatch(/grid-row:\s*2/);
    expect(/\.teaser-cta\s*\{([^}]*)\}/.exec(teaserCss)[1]).toMatch(/grid-row:\s*4/);
  });

  it('positions in fractions, not pixel offsets, so it holds at every width', () => {
    const contentRule = /\.teaser-content\s*\{([^}]*)\}/.exec(teaserCss);
    /* A top offset in px would only look right at one phone width. */
    expect(contentRule[1]).not.toMatch(/(top|margin-top):\s*[0-9]+px/);
  });

  it('keeps a bottom track between the button and the home indicator', () => {
    const rows = /grid-template-rows:([^;]*);/.exec(teaserCss)[1];
    const last = Number(rows.trim().split(/\s+/).at(-1).replace('fr', ''));
    expect(last).toBeGreaterThan(0);
  });
});
