import { readFileSync } from 'node:fs';
import React from 'react';
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import App from '../App';
import { renderApp } from './renderApp';
import { fragmentToId } from '../lib/sectionNavigation';

/*
 * Unknown-path handling.
 *
 * Half of these run through BrowserRouter rather than the MemoryRouter the
 * rest of the suite uses. MemoryRouter was the blind spot the first time this
 * was investigated: it exercises the route table but not the history and
 * location plumbing the deployed site actually runs on.
 */

const NOT_FOUND = /We could not find that page/i;

function renderInBrowserRouter(path) {
  window.history.pushState({}, '', path);
  return render(
    <BrowserRouter>
      <App />
    </BrowserRouter>,
  );
}

function h1() {
  const headings = screen.getAllByRole('heading', { level: 1 });
  expect(headings).toHaveLength(1);
  return headings[0];
}

describe('unknown paths render NotFound', () => {
  const unknown = [
    '/something-random',
    '/contact/something-random',
    '/a/b/c/d',
    '/sign-up/extra',
    '/products',
    '/services',
  ];

  it.each(unknown)('%s under MemoryRouter', (path) => {
    renderApp(path);
    expect(h1()).toHaveTextContent(NOT_FOUND);
  });

  it.each(unknown)('%s under BrowserRouter', (path) => {
    renderInBrowserRouter(path);
    expect(h1()).toHaveTextContent(NOT_FOUND);
  });

  it('offers a route back into the site', () => {
    renderApp('/contact/something-random');

    expect(screen.getByRole('link', { name: /Go to the home page/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Contact us/i })).toBeInTheDocument();
  });

  it('keeps the header, footer and main landmark on the 404 page', () => {
    renderApp('/deep/unknown/path');

    expect(screen.getByRole('banner')).toBeInTheDocument();
    expect(screen.getByRole('contentinfo')).toBeInTheDocument();
    expect(screen.getByRole('main')).toHaveAttribute('id', 'main-content');
  });

  it('is reached with a query string attached', () => {
    renderApp('/something-random?utm_source=newsletter');
    expect(h1()).toHaveTextContent(NOT_FOUND);
  });

  it('is reached with a fragment attached', () => {
    renderApp('/something-random#services');
    expect(h1()).toHaveTextContent(NOT_FOUND);
  });
});

describe('known routes are unaffected', () => {
  it.each([
    ['/', /Healthcare workforce, operations and digital/i],
    ['/contact', /Tell us what you are working through/i],
    ['/sign-up', /Tell us what you are working through/i],
    ['/signup', /Tell us what you are working through/i],
  ])('%s', (path, expected) => {
    renderApp(path);
    expect(h1()).toHaveTextContent(expected);
  });

  it.each(['/#services', '/#products', '/#about', '/#transparency'])(
    '%s stays on the home page',
    (path) => {
      renderApp(path);

      expect(h1()).toHaveTextContent(/Healthcare workforce, operations and digital/i);
      expect(screen.queryByText(NOT_FOUND)).not.toBeInTheDocument();
    },
  );
});

describe('malformed fragments do not take the page down', () => {
  /* Regression: HashScroll decoded the fragment with a bare
     decodeURIComponent, which throws URIError on any invalid percent-escape.
     Thrown from that effect it unmounted the whole tree, so a mistyped URL
     rendered a blank page instead of the site. */
  const malformed = ['/#%', '/#100%', '/#%zz', '/contact#%E0%A4%A'];

  it.each(malformed)('%s still renders the route', (path) => {
    renderApp(path);
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
  });

  it.each(['/something-random#%', '/nope/nope#100%'])(
    '%s still renders NotFound',
    (path) => {
      renderApp(path);
      expect(h1()).toHaveTextContent(NOT_FOUND);
    },
  );

  it('decodes ordinary fragments and passes malformed ones through untouched', () => {
    expect(fragmentToId('#services')).toBe('services');
    expect(fragmentToId('#a%20b')).toBe('a b');
    expect(fragmentToId('#100%')).toBe('100%');
    expect(fragmentToId('#%zz')).toBe('%zz');
    expect(fragmentToId('')).toBe('');
  });
});

describe('Netlify SPA fallback', () => {
  it('rewrites every unmatched path to index.html with a 200', () => {
    const redirects = readFileSync('public/_redirects', 'utf8').trim();

    expect(redirects).toMatch(/^\/\*\s+\/index\.html\s+200$/);
  });

  it('is the only rule, so nothing shadows it', () => {
    const lines = readFileSync('public/_redirects', 'utf8')
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith('#'));

    expect(lines).toHaveLength(1);
  });
});
