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

  it('qualifies nothing: the section claims no formal regulatory or safety work', () => {
    renderApp('/');

    const services = document.getElementById('services');
    /* The removed sentence answered a concern the section never raised. It
       must not come back, here or anywhere else on the page. */
    expect(document.body).not.toHaveTextContent(/appropriately qualified specialists/i);
    expect(services).not.toHaveTextContent(/clinical-safety/i);

    /* And no claim to do that work either, which is why no qualification is
       needed in the first place. */
    expect(services).not.toHaveTextContent(/regulatory sign-off|clinical-safety certification/i);
  });

  it('gives every service card the same four-bullet structure', () => {
    renderApp('/');

    const cards = document.querySelectorAll('.service-card');
    expect(cards).toHaveLength(3);

    for (const card of cards) {
      expect(card.querySelectorAll('.service-card-list li')).toHaveLength(4);
      expect(card.querySelector('.service-card-note')).toBeNull();
    }
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

describe('the leadership introduction', () => {
  const LEADERSHIP =
    'Ajani Healthcare is led by Olasupo Ajani, a registered nurse and full-stack product '
    + 'engineer with experience in team leadership, clinical governance, service improvement '
    + 'and healthcare operations. That combination brings frontline care and operational '
    + 'decision-making into product strategy, UI/UX and software delivery.';

  it('names Olasupo Ajani exactly once on the page', () => {
    renderApp('/');
    expect(screen.getAllByText(/Olasupo Ajani/)).toHaveLength(1);
  });

  it('carries the statement in full', () => {
    renderApp('/');
    expect(document.querySelector('.about-leadership-body').textContent.replace(/\s+/g, ' ').trim())
      .toBe(LEADERSHIP);
  });

  it('sits inside the About section, after the narrative it supports', () => {
    renderApp('/');

    const about = document.getElementById('about');
    const leadership = about.querySelector('.about-leadership');
    expect(leadership).toBeInTheDocument();

    /* A note within About, not a section of its own: the company stays the
       subject of the page. */
    expect(leadership.closest('#about')).toBe(about);
    expect(about.querySelectorAll('section')).toHaveLength(0);

    const narrative = about.querySelector('.about-body p');
    expect(narrative.compareDocumentPosition(leadership) & Node.DOCUMENT_POSITION_FOLLOWING)
      .toBeTruthy();
  });

  it('introduces no second H1 and no new heading level', () => {
    renderApp('/');

    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    /* The label is an eyebrow, not a heading, so the outline is untouched. */
    expect(document.querySelector('.about-leadership').querySelectorAll('h1, h2, h3, h4, h5, h6'))
      .toHaveLength(0);
  });

  it('adds no image, link or control', () => {
    renderApp('/');

    const leadership = document.querySelector('.about-leadership');
    expect(leadership.querySelectorAll('img')).toHaveLength(0);
    expect(leadership.querySelectorAll('a, button, input, select, textarea')).toHaveLength(0);
  });

  it('claims no grade, title or employer that was not given', () => {
    renderApp('/');

    /* Invented detail a reader would take as fact. None of it was supplied,
       so none of it may appear anywhere on the page. */
    for (const claim of [
      /senior registered nurse/i,
      /\bBand [0-9]/i,
      /years of experience/i,
      /award|certified|accredited/i,
    ]) {
      expect(document.body).not.toHaveTextContent(claim);
    }

    /* Employer and job-title wording is checked against the leadership note
       itself rather than the page: the Operations service card legitimately
       says "NHS and UK care settings", which is a setting the company works
       in, not an employer being claimed here. */
    const leadership = document.querySelector('.about-leadership');
    for (const claim of [
      /\bNHS\b/,
      /\bTrust\b/i,
      /\bfounder\b|\bCEO\b|\bdirector\b/i,
    ]) {
      expect(leadership).not.toHaveTextContent(claim);
    }
  });

  it('does not restate the perspectives sentence it follows', () => {
    renderApp('/');

    /* The About narrative used to open its second paragraph with "brings
       clinical, operational and technical perspectives together", which
       collided with both this statement and the revised transparency
       principle. Only that clause changed. */
    const about = document.getElementById('about');
    expect(about).not.toHaveTextContent(/brings clinical, operational and technical perspectives/i);
    expect(about).toHaveTextContent(/works across all three at once/i);
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
