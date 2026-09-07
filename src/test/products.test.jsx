import { describe, expect, it } from 'vitest';
import { screen, within } from '@testing-library/react';
import { renderApp } from './renderApp';
import {
  AJANI_MOBILE_ROUTE,
  FIELD_OPERATIONS_REPO_URL,
  WORKFORCE_PREVIEW_URL,
  WORKFORCE_REPO_URL,
} from '../lib/site';

describe('Ajani Workforce', () => {
  it('is presented as a featured Ajani Healthcare product with a live preview', () => {
    renderApp('/');

    const products = document.getElementById('products');
    expect(
      within(products).getByRole('heading', { name: 'Ajani Workforce', level: 3 }),
    ).toBeInTheDocument();

    const statuses = within(products).getByRole('list', { name: 'Product status' });
    expect(within(statuses).getByText('Interactive preview')).toBeInTheDocument();
    expect(within(statuses).getByText('An Ajani Healthcare product')).toBeInTheDocument();
    /* Two labels only: the demonstration-data point is made once, in the
       disclosure beside the preview link. */
    expect(within(statuses).getAllByRole('listitem')).toHaveLength(2);
  });

  it('names the three journeys the platform connects', () => {
    renderApp('/');

    const summary = document.querySelector('.featured-product-summary');
    expect(summary).toHaveTextContent(/Workers finding and accepting shifts/i);
    expect(summary).toHaveTextContent(/Managers coordinating cover and compliance/i);
    expect(summary).toHaveTextContent(/Administrators overseeing timesheets and approvals/i);
  });

  it('discloses the preview data once, beside the link, and qualifies nothing twice', () => {
    renderApp('/');

    const products = document.getElementById('products');
    expect(
      within(products).getByText(
        /The public preview runs on synthetic demonstration records and is not connected to live healthcare operations\./i,
      ),
    ).toBeInTheDocument();

    /* The card used to say "pre-production" three times over. The stage is
       carried by the status label alone now. */
    expect(document.querySelector('.featured-product')).not.toHaveTextContent(/pre-production/i);

    /* The preview's authentication model is a detail for the product's own
       documentation, not for the company homepage. */
    expect(products).not.toHaveTextContent(/Authentication and authorisation/i);
  });

  it('preserves the live preview and public repository links', () => {
    renderApp('/');

    const preview = screen.getByRole('link', { name: /Open the live preview/i });
    expect(preview).toHaveAttribute('href', WORKFORCE_PREVIEW_URL);
    expect(preview).toHaveAttribute('target', '_blank');
    expect(preview).toHaveAttribute('rel', expect.stringContaining('noopener'));

    const repo = screen.getByRole('link', { name: /View the public repository/i });
    expect(repo).toHaveAttribute('href', WORKFORCE_REPO_URL);
    expect(repo).toHaveAttribute('target', '_blank');
    expect(repo).toHaveAttribute('rel', expect.stringContaining('noopener'));
  });

  it('repeats both links in the footer', () => {
    renderApp('/');

    const footer = screen.getByRole('contentinfo');
    expect(within(footer).getByRole('link', { name: /Live preview/i })).toHaveAttribute(
      'href',
      WORKFORCE_PREVIEW_URL,
    );
    expect(within(footer).getByRole('link', { name: /Public repository/i })).toHaveAttribute(
      'href',
      WORKFORCE_REPO_URL,
    );
  });

  it('warns that every external link opens in a new tab', () => {
    renderApp('/');

    const preview = screen.getByRole('link', { name: /Open the live preview/i });
    expect(within(preview).getByText(/opens in a new tab/i)).toBeInTheDocument();
  });
});

describe('Ajani Field Operations', () => {
  const card = () => document.querySelector('.field-operations-product');

  it('presents Ajani Mobile as its native SwiftUI iPhone application', () => {
    renderApp('/');

    const products = document.getElementById('products');
    expect(
      within(products).getByRole('heading', { name: 'Ajani Field Operations', level: 3 }),
    ).toBeInTheDocument();

    expect(card()).toBeInTheDocument();
    expect(card()).toHaveTextContent(
      /Ajani Mobile is the native SwiftUI iPhone application for Ajani Field Operations/i,
    );
  });

  it('names the platform it targets', () => {
    renderApp('/');

    const platform = within(card()).getByRole('list', { name: 'Ajani Mobile platform' });
    const labels = within(platform).getAllByRole('listitem').map((li) => li.textContent);

    expect(labels).toEqual(['Native iPhone app', 'SwiftUI', 'iOS 18 and later']);
  });

  it('lists the journeys the application actually implements', () => {
    renderApp('/');

    const journeys = within(card()).getByRole('list', { name: 'Current journeys' });
    const labels = within(journeys).getAllByRole('listitem').map((li) => li.textContent);

    expect(labels).toEqual([
      'Shift overview and progress',
      'Searchable and filterable visits',
      'Validated visit-status progression',
      'Visit-task completion',
      'Practitioner preferences',
      'Light and dark appearance support',
    ]);
  });

  it('offers the case study and the repository, and nothing else', () => {
    renderApp('/');

    /* The internal link is the phone's call to action; the copy column
       carries the repository. One each, so the card never presents the same
       destination twice under the same name. */
    const copy = card().querySelector('.field-operations-product-copy');
    const explore = within(card()).getByRole('link', { name: 'Explore Ajani Mobile' });
    expect(explore).toHaveAttribute('href', AJANI_MOBILE_ROUTE);
    /* Internal: it must not be treated as an external destination. */
    expect(explore).not.toHaveAttribute('target');

    const repo = within(copy).getByRole('link', { name: /View native repository/i });
    expect(repo).toHaveAttribute('href', FIELD_OPERATIONS_REPO_URL);
    expect(repo).toHaveAttribute('target', '_blank');
    expect(repo).toHaveAttribute('rel', expect.stringContaining('noopener'));
    expect(within(repo).getByText(/opens in a new tab/i)).toBeInTheDocument();
    /* The same decorative external-link mark the Workforce links carry. */
    expect(repo.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');

    /* Two links on the card, and no third: no store, download or preview. */
    expect(card().querySelectorAll('a')).toHaveLength(2);
    expect(copy.querySelectorAll('a')).toHaveLength(1);
  });

  it('claims no capability the application does not have', () => {
    renderApp('/');

    /* Every one of these was either on the old card or is the obvious thing to
       overclaim about a field app. None of them is true of Ajani Mobile today,
       so none of them may appear. */
    for (const claim of [
      /App Store/i,
      /TestFlight/i,
      /download/i,
      /offline/i,
      /\bmaps?\b/i,
      /location-aware/i,
      /live location/i,
      /synchronis|synchroniz|\bsync\b/i,
      /authentication/i,
      /AI assistant/i,
    ]) {
      expect(card()).not.toHaveTextContent(claim);
    }
  });

  it('no longer describes the product as a planned concept', () => {
    renderApp('/');

    const products = document.getElementById('products');
    expect(products).not.toHaveTextContent(/Planned concept/i);
    expect(products).not.toHaveTextContent(/product roadmap/i);
    expect(products).not.toHaveTextContent(/not a released or downloadable application/i);
    expect(products).not.toHaveTextContent(/iOS-first/i);
  });
});

describe('the homepage Ajani Mobile teaser', () => {
  const teaser = () => document.querySelector('.ajani-mobile-teaser');

  it('is a branded splash built in markup, not a screenshot', () => {
    renderApp('/');

    expect(teaser()).toBeInTheDocument();
    expect(teaser().querySelectorAll('img')).toHaveLength(0);
    /* The brand geometry, not a picture of it. */
    expect(teaser().querySelector('.teaser-brand-mark')).toBeInTheDocument();
  });

  it('carries the product name and line', () => {
    renderApp('/');

    expect(within(teaser()).getByText('Ajani Mobile')).toBeInTheDocument();
    expect(within(teaser()).getByText('Field visits, clearly organised.')).toBeInTheDocument();
  });

  it('contains exactly one control, and it is a real link', () => {
    renderApp('/');

    /* No fake tab bar, no dead toggle, no button that does nothing: anything
       that looks operable inside this phone must actually work. */
    const interactive = teaser().querySelectorAll('a[href], button, input, select, textarea');
    expect(interactive).toHaveLength(1);

    const cta = within(teaser()).getByRole('link', { name: 'Explore Ajani Mobile' });
    expect(cta).toHaveAttribute('href', AJANI_MOBILE_ROUTE);
    expect(interactive[0]).toBe(cta);
  });

  it('groups the mark, name and tagline, with the CTA in its own region', () => {
    renderApp('/');

    const lockup = teaser().querySelector('.teaser-lockup');
    expect(lockup).toBeInTheDocument();

    /* One intentional group: the mark, the name and the line together. */
    expect(lockup.querySelector('.teaser-mark')).toBeInTheDocument();
    expect(within(lockup).getByText('Ajani Mobile')).toBeInTheDocument();
    expect(within(lockup).getByText('Field visits, clearly organised.')).toBeInTheDocument();

    /* The button is a sibling of that group, not part of it, which is what
       lets the layout separate the two. */
    const cta = within(teaser()).getByRole('link', { name: 'Explore Ajani Mobile' });
    expect(cta.closest('.teaser-lockup')).toBeNull();
    expect(cta.parentElement).toBe(lockup.parentElement);
  });

  it('keeps its decoration out of the accessibility tree', () => {
    renderApp('/');

    const wallpaper = teaser().querySelector('.teaser-wallpaper');
    expect(wallpaper).toHaveAttribute('aria-hidden', 'true');

    for (const part of teaser().querySelectorAll('.phone-frame-button, .phone-frame-island')) {
      expect(part).toHaveAttribute('aria-hidden', 'true');
    }
  });
});

describe('the products section as a whole', () => {
  it('still loads no image on the home page', () => {
    const { container } = renderApp('/');
    expect(container.querySelectorAll('img')).toHaveLength(0);
  });

  it('does not reference a case-study screenshot from the home page', () => {
    const { container } = renderApp('/');
    expect(container.innerHTML).not.toMatch(/ajani-mobile-(today|visits|visit-detail|more)/i);
  });
});
