import { describe, expect, it } from 'vitest';
import { screen, within } from '@testing-library/react';
import { renderApp } from './renderApp';
import { WORKFORCE_PREVIEW_URL, WORKFORCE_REPO_URL } from '../lib/site';

describe('Ajani Workforce', () => {
  it('is presented as a featured, pre-production Ajani Healthcare product', () => {
    renderApp('/');

    const products = document.getElementById('products');
    expect(
      within(products).getByRole('heading', { name: 'Ajani Workforce', level: 3 }),
    ).toBeInTheDocument();

    const statuses = within(products).getByRole('list', { name: 'Product status' });
    expect(within(statuses).getByText('Pre-production preview')).toBeInTheDocument();
    expect(within(statuses).getByText('An Ajani Healthcare product')).toBeInTheDocument();
    /* Two labels only: the synthetic-data point is made once, in the
       disclosure beside the preview link. */
    expect(within(statuses).getAllByRole('listitem')).toHaveLength(2);
  });

  it('discloses the preview stage and its data once, beside the link', () => {
    renderApp('/');

    const products = document.getElementById('products');
    expect(
      within(products).getByText(
        /Pre-production preview using synthetic demonstration data; not used for live healthcare operations\./i,
      ),
    ).toBeInTheDocument();

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
  it('is labelled a planned concept rather than a released product', () => {
    renderApp('/');

    const products = document.getElementById('products');
    expect(
      within(products).getByRole('heading', { name: 'Ajani Field Operations', level: 3 }),
    ).toBeInTheDocument();
    expect(within(products).getByText(/Planned concept/i)).toBeInTheDocument();
    expect(
      within(products).getByText(/not a released or downloadable application/i),
    ).toBeInTheDocument();
  });

  it('describes it as iOS-first with Android considered later', () => {
    renderApp('/');

    const summary = within(document.getElementById('products')).getByText(
      /An iOS-first field-operations concept/i,
    );
    expect(summary).toHaveTextContent(/future Android support considered/i);
  });

  it('offers no download or store link', () => {
    renderApp('/');

    const planned = document.querySelector('.planned-product');
    expect(planned).toBeInTheDocument();
    expect(planned.querySelectorAll('a')).toHaveLength(0);
  });
});
