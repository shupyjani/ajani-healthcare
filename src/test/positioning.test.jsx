import { describe, expect, it } from 'vitest';
import { screen, within } from '@testing-library/react';
import { renderApp } from './renderApp';

/*
 * How the company presents itself.
 *
 * Ajani Healthcare is not a staffing company that also does other things, and
 * the homepage should never read that way. These cases guard the positioning
 * itself: three equal capabilities, no "umbrella company" framing, and a
 * product disclosure that is made once rather than apologised for repeatedly.
 */

const SERVICE_TITLES = [
  'Healthcare Workforce',
  'Digital Products & UX',
  'Healthcare Operations & UK Readiness',
];

describe('three connected capabilities', () => {
  it('names all three services as equal headings', () => {
    renderApp('/');

    const services = document.getElementById('services');
    for (const title of SERVICE_TITLES) {
      expect(within(services).getByRole('heading', { name: title, level: 3 })).toBeInTheDocument();
    }
  });

  it('gives each capability its own card, at the same heading level', () => {
    renderApp('/');

    const cards = document.querySelectorAll('.service-card');
    expect(cards).toHaveLength(3);

    for (const card of cards) {
      expect(card.querySelectorAll('h3')).toHaveLength(1);
      expect(card.querySelector('.service-card-description')).toBeInTheDocument();
      /* Exactly four, in every card. Unequal bullet counts were what made one
         capability look like the detailed one and the others like summaries. */
      expect(card.querySelectorAll('.service-card-list li')).toHaveLength(4);
    }
  });

  it('gives all three the same structure: one paragraph, four bullets, no footer', () => {
    renderApp('/');

    for (const card of document.querySelectorAll('.service-card')) {
      expect(card.querySelectorAll('.service-card-description')).toHaveLength(1);
      expect(card.querySelectorAll('.service-card-list')).toHaveLength(1);
      /* No per-card footer: the qualification that used to sit under the third
         card is a section note now, so no card carries one. */
      expect(card.querySelector('.service-card-note')).toBeNull();
    }

    expect(document.querySelectorAll('.service-card-note')).toHaveLength(0);
  });

  it('does not let staffing crowd out the other two', () => {
    renderApp('/');

    const [workforce, digital, operations] = document.querySelectorAll('.service-card');

    /* Equal substance in each card, not merely comparable: the three
       capabilities are presented on equal footing, so they carry the same
       number of bullets as well as the same card. */
    const bullets = (card) => card.querySelectorAll('.service-card-list li').length;
    expect(bullets(workforce)).toBe(4);
    expect(bullets(digital)).toBe(bullets(workforce));
    expect(bullets(operations)).toBe(bullets(workforce));

    /* Staffing is not the first thing the page says about itself. */
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      /workforce, operations and digital solutions/i,
    );
  });

  it('says up front that it covers workforce, operations and digital', () => {
    renderApp('/');

    expect(document.querySelector('.hero-lede')).toHaveTextContent(
      /strengthen their workforce, improve operations, and design and build better digital services/i,
    );
  });
});

describe('digital and UX capability is explicit', () => {
  it('spells out the digital, software and UX work on offer', () => {
    renderApp('/');

    const digital = document.querySelectorAll('.service-card')[1];

    for (const item of [
      /Healthcare websites and web applications/i,
      /UX research, journey mapping and interface design/i,
      /Prototypes and internal operational tools/i,
      /Technical discovery and iterative product delivery/i,
    ]) {
      expect(within(digital).getByText(item)).toBeInTheDocument();
    }
  });

  it('covers operations improvement and product readiness together', () => {
    renderApp('/');

    const operations = document.querySelectorAll('.service-card')[2];

    const bullets = [...operations.querySelectorAll('.service-card-list li')].map(
      (item) => item.textContent,
    );

    /* Discovery/readiness and assurance planning are one bullet now. Asserted
       exactly, so a loose substring match cannot quietly pass on the combined
       wording. */
    expect(bullets).toEqual([
      'Healthcare workflow and service improvement',
      'Care pathways and referral routes',
      'Product readiness and assurance planning',
      'Accessibility and interoperability considerations',
    ]);
    expect(operations).toHaveTextContent(/NHS and UK care settings/i);
  });

  it('makes no claim that would need a specialist qualification', () => {
    renderApp('/');

    /* The section never claims to provide regulatory sign-off or
       clinical-safety certification, so it carries no sentence saying it does
       not. Qualifying an unmade claim only introduces doubt. */
    expect(document.body).not.toHaveTextContent(/we provide (regulatory|clinical-safety|legal)/i);
    expect(document.body).not.toHaveTextContent(/appropriately qualified specialists/i);
    expect(document.querySelector('.services-note')).toBeNull();
  });
});

describe('company framing', () => {
  it('never calls itself an umbrella company', () => {
    renderApp('/');
    expect(document.body).not.toHaveTextContent(/umbrella/i);
  });

  it('explains the product relationship as an Ajani Healthcare product', () => {
    renderApp('/');
    expect(screen.getByText('An Ajani Healthcare product')).toBeInTheDocument();
  });

  it('keeps UK wording to the three places it earns', () => {
    renderApp('/');

    /* "UK-based" in the hero, "UK Readiness" in the third service title, and
       "NHS and UK care settings" once in that service's description. */
    expect(screen.getAllByText(/\bUK\b/)).toHaveLength(3);
  });
});

describe('Ajani Workforce disclosure appears once', () => {
  it('shows exactly two status labels', () => {
    renderApp('/');

    const statuses = screen.getByRole('list', { name: 'Product status' });
    const labels = within(statuses).getAllByRole('listitem').map((li) => li.textContent);

    expect(labels).toEqual(['Interactive preview', 'An Ajani Healthcare product']);
  });

  it('makes the synthetic-data disclosure exactly once, next to the preview link', () => {
    renderApp('/');

    const disclosures = screen.getAllByText(/synthetic/i);
    expect(disclosures).toHaveLength(1);
    expect(disclosures[0]).toHaveTextContent(
      /The public preview runs on synthetic demonstration records and is not connected to live healthcare operations\./i,
    );

    /* Close to the link it qualifies, not stranded elsewhere on the page. */
    const panel = document.querySelector('.featured-product');
    expect(within(panel).getByRole('link', { name: /Open the live preview/i })).toBeInTheDocument();
    expect(panel).toContainElement(disclosures[0]);
  });

  it('does not advertise the preview authentication model on the homepage', () => {
    renderApp('/');
    expect(document.body).not.toHaveTextContent(/authentication/i);
  });

  it('leaves no product disclaimer in the footer', () => {
    renderApp('/');

    const footer = screen.getByRole('contentinfo');
    expect(footer).not.toHaveTextContent(/synthetic/i);
    expect(footer).not.toHaveTextContent(/pre-production/i);
    expect(footer).not.toHaveTextContent(/not a released application/i);
    expect(footer).toHaveTextContent(/Ajani Healthcare\. All rights reserved\./i);
  });

  it('labels Field Operations by what it is, not by a stage it has reached', () => {
    renderApp('/');

    const card = document.querySelector('.field-operations-product');
    expect(within(card).getAllByText('Native product')).toHaveLength(1);

    /* The repository link is what makes this card's claims checkable, so it
       does not also qualify the product. No stage wording, in either
       direction: neither an apology nor an unsupported release claim. */
    expect(card).not.toHaveTextContent(/In development/i);
    expect(card).not.toHaveTextContent(/Planned concept/i);
    expect(card).not.toHaveTextContent(/not a released or downloadable application/i);
    expect(card).not.toHaveTextContent(/synthetic/i);
    expect(card).not.toHaveTextContent(/\breleased\b|\bproduction\b|App Store/i);
  });
});

describe('transparency section reads as practice, not disclaimer', () => {
  it('is introduced as how we work', () => {
    renderApp('/');

    const transparency = document.getElementById('transparency');
    expect(within(transparency).getByText('How we work')).toBeInTheDocument();
    expect(
      within(transparency).getByRole('heading', {
        name: /Clear, practical and grounded in care/i,
        level: 2,
      }),
    ).toBeInTheDocument();
  });

  it('lists the four working principles', () => {
    renderApp('/');

    const transparency = document.getElementById('transparency');
    const items = within(transparency).getAllByRole('listitem');

    expect(items).toHaveLength(4);
    /* Asserted as exact, whole strings: a substring match would have let the
       revised wording pass while the old text was still there. */
    expect(items.map((item) => item.textContent)).toEqual([
      'Healthcare-led discovery, shaped around how care actually gets delivered.',
      'Product stage and scope communicated clearly.',
      'Privacy, accessibility and safety considered from the outset.',
      'Clinical, operational and engineering perspectives considered together.',
    ]);
  });

  it('has dropped the two qualifying principles it used to carry', () => {
    renderApp('/');

    const transparency = document.getElementById('transparency');

    /* "at every step" was a promise to qualify; "specialist input ... formal
       assurance" restated the boundary the Services note used to carry. Both
       qualified claims the site does not make. */
    expect(transparency).not.toHaveTextContent(/at every step/i);
    expect(transparency).not.toHaveTextContent(/Specialist input/i);
    expect(transparency).not.toHaveTextContent(/formal assurance/i);
    expect(document.body).not.toHaveTextContent(/formal assurance/i);
  });

  it('states each revised principle exactly once on the page', () => {
    renderApp('/');

    for (const principle of [
      'Product stage and scope communicated clearly.',
      'Clinical, operational and engineering perspectives considered together.',
    ]) {
      expect(screen.getAllByText(principle)).toHaveLength(1);
    }
  });

  it('carries no product disclaimer and no unsupported claim', () => {
    renderApp('/');

    const transparency = document.getElementById('transparency');
    expect(transparency).not.toHaveTextContent(/synthetic/i);
    expect(transparency).not.toHaveTextContent(/certified|accredited|ISO |guarantee/i);
  });
});

describe('page structure', () => {
  it('renders exactly one site header and one footer', () => {
    renderApp('/');

    expect(screen.getAllByRole('banner')).toHaveLength(1);
    expect(screen.getAllByRole('contentinfo')).toHaveLength(1);
    expect(document.querySelectorAll('header.site-header')).toHaveLength(1);
  });

  it('keeps about, transparency and the closing CTA in the document', () => {
    renderApp('/');

    expect(document.getElementById('about')).toBeInTheDocument();
    expect(document.getElementById('transparency')).toBeInTheDocument();
    expect(document.querySelector('.closing-cta')).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: /Let's talk about a workforce/i, level: 2 }),
    ).toBeInTheDocument();
  });

  it('renders the sections in their approved order', () => {
    renderApp('/');

    const ids = [...document.querySelectorAll('main section')].map((s) => s.id || s.className);
    expect(ids[0]).toBe('home-section');
    expect(ids.slice(1, 5)).toEqual(['services', 'products', 'about', 'transparency']);
  });
});

describe('service-card presentation', () => {
  it('gives every card a header panel, a mark and a number', () => {
    renderApp('/');

    const cards = document.querySelectorAll('.service-card');
    expect(cards).toHaveLength(3);

    cards.forEach((card, position) => {
      const header = card.querySelector('.service-card-header');
      expect(header).toBeInTheDocument();
      /* The heading lives in the header panel, the detail in the body. */
      expect(header.querySelector('h3')).toBeInTheDocument();
      expect(card.querySelector('.service-card-body')).toBeInTheDocument();

      const mark = card.querySelector('.service-card-mark');
      expect(mark).toBeInTheDocument();
      expect(mark.querySelector('svg')).toBeInTheDocument();
      expect(mark.querySelector('.service-card-index')).toHaveTextContent(String(position + 1));
    });
  });

  it('keeps the mark decorative so the heading is the only accessible name', () => {
    renderApp('/');

    for (const mark of document.querySelectorAll('.service-card-mark')) {
      expect(mark).toHaveAttribute('aria-hidden', 'true');
    }

    /* The number must not be read out before the service name. */
    const [first] = document.querySelectorAll('.service-card');
    expect(first.querySelector('h3')).toHaveAccessibleName('Healthcare Workforce');
  });

  it('uses a distinct icon per capability, drawn locally', () => {
    const { container } = renderApp('/');

    const paths = [...document.querySelectorAll('.service-card-mark svg')].map(
      (svg) => svg.innerHTML,
    );
    expect(new Set(paths).size).toBe(3);

    /* Still no external asset of any kind on the page. */
    expect(container.querySelectorAll('img')).toHaveLength(0);
  });
});
