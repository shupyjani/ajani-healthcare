import { describe, expect, it } from 'vitest';
import { screen, within } from '@testing-library/react';
import { renderApp } from './renderApp';

describe('home page', () => {
  it('renders the landmarks the page navigation depends on', () => {
    renderApp('/');

    expect(screen.getByRole('banner')).toBeInTheDocument();
    expect(screen.getByRole('main')).toBeInTheDocument();
    expect(screen.getByRole('contentinfo')).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: 'Main' })).toBeInTheDocument();
  });

  it('has exactly one H1, and it names the company offer', () => {
    renderApp('/');

    const headings = screen.getAllByRole('heading', { level: 1 });
    expect(headings).toHaveLength(1);
    expect(headings[0]).toHaveTextContent(/Healthcare workforce, operations and digital/i);
  });

  it('presents the hero visual without stock imagery or invented figures', () => {
    const { container } = renderApp('/');

    /* The visual is code-built: there is no <img> anywhere on the page. */
    expect(container.querySelectorAll('img')).toHaveLength(0);

    const figure = container.querySelector('.hero-visual');
    expect(figure).toBeInTheDocument();
    /* No percentages, and no "N+"-style counts masquerading as results. */
    expect(figure.textContent).not.toMatch(/%|\d+\s*\+/);
  });
});

describe('services section', () => {
  it('names all three capabilities', () => {
    renderApp('/');

    const services = document.getElementById('services');
    expect(services).toBeInTheDocument();

    expect(
      within(services).getByRole('heading', { name: /Three areas of healthcare support/i }),
    ).toBeInTheDocument();

    for (const area of [
      'Healthcare Workforce',
      'Digital Products & UX',
      'Healthcare Operations & UK Readiness',
    ]) {
      expect(within(services).getByRole('heading', { name: area, level: 3 })).toBeInTheDocument();
    }
  });

  it('states the specialist boundary positively rather than as a disclaimer', () => {
    renderApp('/');

    expect(
      within(document.getElementById('services')).getByText(
        /Where formal regulatory or clinical-safety work is required, we work alongside appropriately qualified specialists\./i,
      ),
    ).toBeInTheDocument();
  });
});

describe('about and transparency sections', () => {
  it('renders the about section', () => {
    renderApp('/');

    const about = document.getElementById('about');
    expect(about).toBeInTheDocument();
    expect(
      within(about).getByRole('heading', { name: /don't stay inside one lane/i, level: 2 }),
    ).toBeInTheDocument();
  });

  it('describes how the company works', () => {
    renderApp('/');

    const transparency = document.getElementById('transparency');
    expect(transparency).toBeInTheDocument();
    expect(
      within(transparency).getByRole('heading', {
        name: /Clear, practical and grounded in care/i,
        level: 2,
      }),
    ).toBeInTheDocument();
    expect(
      within(transparency).getByText(/Healthcare-led discovery, shaped around how care/i),
    ).toBeInTheDocument();
  });
});

describe('products section', () => {
  it('renders the products section heading', () => {
    renderApp('/');

    const products = document.getElementById('products');
    expect(products).toBeInTheDocument();
    expect(
      within(products).getByRole('heading', { name: /Genuine product work/i, level: 2 }),
    ).toBeInTheDocument();
  });
});
