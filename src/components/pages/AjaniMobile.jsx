import React from 'react';
import { Link } from 'react-router-dom';
import PhoneFrame from '../PhoneFrame';
import Reveal from '../Reveal';
import { ExternalLinkIcon } from '../icons';
import {
  AJANI_MOBILE_DEMO_ROUTE,
  AJANI_MOBILE_ROUTE,
  FIELD_OPERATIONS_REPO_URL,
} from '../../lib/site';
import { useDocumentTitle } from '../../lib/useDocumentTitle';
import todayLight from '../../assets/ajani-mobile/ajani-mobile-today-light.png';
import visitsDark from '../../assets/ajani-mobile/ajani-mobile-visits-dark.png';
import visitDetailLight from '../../assets/ajani-mobile/ajani-mobile-visit-detail-light.png';
import moreDark from '../../assets/ajani-mobile/ajani-mobile-more-dark.png';
import './AjaniMobile.css';

/*
 * The Ajani Mobile case study.
 *
 * Loaded lazily at the route boundary (see App.jsx), which is what keeps these
 * four screenshots out of the homepage's request graph entirely: they are
 * imported here, so Vite emits them as assets of this chunk and nothing asks
 * for them until someone opens this route.
 *
 * Everything on this page describes the native application. Nothing here
 * offers a runnable version of it, and nothing pretends to.
 */

/*
 * Caption and alt text do different jobs on purpose. The caption names the
 * screen and what it is for; the alt describes what is actually rendered in
 * the capture. A reader using a screen reader gets both without hearing the
 * same sentence twice.
 */
const SCREENS = [
  {
    id: 'today',
    src: todayLight,
    caption: 'Today — shift overview, progress and active visit',
    alt:
      'Light appearance. A greeting card gives the date, the shift window and the round, '
      + 'above a progress bar reading twenty-nine per cent and two of seven visits complete. '
      + 'Beneath it the visit in progress is marked Arrived and carries a Complete visit button.',
  },
  {
    id: 'visits',
    src: visitsDark,
    caption: 'Visits — searchable and filterable schedule with operational statuses',
    alt:
      'Dark appearance. A search field sits above filter chips for All, Planned, In progress '
      + 'and Completed, with seven visits listed below. Each row shows a time span, a name, a '
      + 'visit type and a status badge that pairs an icon with its wording.',
  },
  {
    id: 'visit-detail',
    src: visitDetailLight,
    caption: 'Visit detail — task completion and operational notes',
    alt:
      'Light appearance. A tasks card reads one of three done, with the finished task ticked '
      + 'and struck through and two still open. An operational notes card follows, above a '
      + 'full-width Complete visit button.',
  },
  {
    id: 'more',
    src: moreDark,
    caption: 'More — practitioner profile, working preferences and dark appearance',
    alt:
      'Dark appearance. A profile card names the practitioner, their team and staff reference. '
      + 'A preferences card below carries labelled switches, one on and one off, each with a '
      + 'sentence explaining what it changes.',
  },
];

const JOURNEY = [
  {
    step: 'Today',
    detail: 'The shift opens on its own summary: hours, round, progress, and the visit in hand.',
  },
  {
    step: 'Visits',
    detail: 'The full schedule, narrowed by search or by status when the day stops running to plan.',
  },
  {
    step: 'Visit detail',
    detail: 'One visit in full — where it is, what it is for, what has to be done, what to watch for.',
  },
  {
    step: 'Task completion',
    detail: 'Tasks are ticked off in place, and the count moves with them.',
  },
  {
    step: 'Status progression',
    detail: 'The visit advances through its stages, and the shift progress above follows.',
  },
];

const UX_DECISIONS = [
  {
    title: 'Glanceable shift progress',
    detail:
      'Progress is a bar, a percentage and a plain count together, so the state of the day '
      + 'reads in a second without being decoded.',
  },
  {
    title: 'One clear next action',
    detail:
      'Each screen resolves to a single primary action. There is never a question about which '
      + 'control is the one that moves the work forward.',
  },
  {
    title: 'Status in text and colour',
    detail:
      'Every status pairs its colour with wording and a shape. Nothing depends on a reader '
      + 'distinguishing green from amber.',
  },
  {
    title: 'Preference-driven behaviour',
    detail:
      'Practitioners decide whether finished visits stay in the list and whether closing a '
      + 'visit asks for confirmation first.',
  },
  {
    title: 'Responsive Dynamic Type layouts',
    detail:
      'Layouts reflow rather than truncate as text size grows, so the largest accessibility '
      + 'sizes stay usable rather than merely supported.',
  },
  {
    title: 'Light and dark appearance support',
    detail:
      'Both appearances are designed, not inherited: contrast and hierarchy are checked in '
      + 'each rather than one being a tint of the other.',
  },
];

const ENGINEERING = [
  'Written in SwiftUI, targeting iOS 18 and later.',
  'Visit status changes run through validated domain transitions, so an invalid move cannot be made.',
  'Domain, state and view responsibilities are kept separate, which is what makes the domain testable on its own.',
  'Search and filtering are implemented over the visit schedule.',
  'Automated unit and UI tests cover the domain rules and the journeys through the interface.',
];

const ACCESSIBILITY = [
  'Dynamic Type across the interface, including the largest accessibility sizes.',
  'Reduced-motion preferences respected.',
  'Meaningful accessibility identifiers on the elements the UI tests drive.',
  'Touch targets sized for one-handed use while standing.',
  'Status and action labels that carry their meaning in words, not in colour alone.',
];

function AjaniMobile() {
  useDocumentTitle('Ajani Mobile — Ajani Field Operations | Ajani Healthcare');

  return (
    <main id="main-content" tabIndex={-1} className="ajani-mobile">
      <section className="ajani-mobile-hero" aria-labelledby="ajani-mobile-heading">
        <div className="container">
          <Reveal as="p" className="eyebrow" variant="label">
            Ajani Field Operations
          </Reveal>
          <Reveal
            as="h1"
            id="ajani-mobile-heading"
            className="ajani-mobile-title"
            variant="headline"
            order={1}
          >
            Ajani Mobile
          </Reveal>
          <Reveal as="p" className="ajani-mobile-lede" variant="up" order={2}>
            The native SwiftUI iPhone application for Ajani Field Operations, built for
            practitioners who work a daily round of visits away from a desk.
          </Reveal>

          <Reveal className="btn-row" variant="up" order={3}>
            <Link className="btn btn--primary" to={AJANI_MOBILE_DEMO_ROUTE}>
              Try the interactive demo
            </Link>
            <Link className="btn btn--outline" to={`${AJANI_MOBILE_ROUTE}#product-screens`}>
              View the product screens
            </Link>
            <a
              className="btn btn--outline external-link"
              href={FIELD_OPERATIONS_REPO_URL}
              target="_blank"
              rel="noopener noreferrer"
            >
              View native repository
              <ExternalLinkIcon />
              <span className="visually-hidden">(opens in a new tab)</span>
            </a>
          </Reveal>
        </div>
      </section>

      <section className="section ajani-mobile-problem" aria-labelledby="ajani-mobile-problem-heading">
        <div className="container">
          <Reveal as="h2" id="ajani-mobile-problem-heading" className="section-heading" variant="headline">
            The product problem
          </Reveal>
          <Reveal as="p" className="section-intro" variant="up" order={1}>
            A community practitioner works a round: a fixed set of visits, in an order that
            rarely survives contact with the day. The information they need is simple and
            constantly changing — which visit is next, how much of the shift is left, what has
            to be done at this address, and what the last person recorded.
          </Reveal>
          <Reveal as="p" className="section-intro" variant="up" order={2}>
            None of that is convenient to hold on a desktop system they cannot reach. Ajani
            Mobile puts the round in the practitioner's hand: the shape of the shift at a
            glance, one visit in full when it matters, and a way to move that visit through its
            stages and record what was done without leaving the doorstep.
          </Reveal>
        </div>
      </section>

      <section
        className="section ajani-mobile-screens"
        id="product-screens"
        aria-labelledby="ajani-mobile-screens-heading"
      >
        <div className="container">
          <Reveal as="p" className="eyebrow" variant="label">
            Product screens
          </Reveal>
          <Reveal as="h2" id="ajani-mobile-screens-heading" className="section-heading" variant="headline" order={1}>
            Four screens from the application
          </Reveal>
          <Reveal as="p" className="section-intro" variant="up" order={2}>
            Captured from Ajani Mobile running on iPhone, in both the light and dark
            appearances the application ships.
          </Reveal>

          <ul className="screen-gallery">
            {SCREENS.map(({ id, src, caption, alt }, index) => (
              <Reveal as="li" key={id} className="screen-gallery-item" variant="panel" order={index}>
                <figure className="screen-figure">
                  <PhoneFrame className="screen-phone">
                    <img
                      className="phone-frame-shot"
                      src={src}
                      alt={alt}
                      width="941"
                      height="2048"
                      loading="lazy"
                      decoding="async"
                    />
                  </PhoneFrame>
                  <figcaption className="screen-caption">{caption}</figcaption>
                </figure>
              </Reveal>
            ))}
          </ul>
        </div>
      </section>

      <section className="section ajani-mobile-journey" aria-labelledby="ajani-mobile-journey-heading">
        <div className="container">
          <Reveal as="p" className="eyebrow" variant="label">
            Core journey
          </Reveal>
          <Reveal as="h2" id="ajani-mobile-journey-heading" className="section-heading" variant="headline" order={1}>
            From the shift to a completed visit
          </Reveal>

          <ol className="journey-steps">
            {JOURNEY.map(({ step, detail }, index) => (
              <Reveal as="li" key={step} className="journey-step" variant="up" order={index}>
                <span className="journey-step-index" aria-hidden="true">
                  {index + 1}
                </span>
                <span className="journey-step-body">
                  <span className="journey-step-name">{step}</span>
                  <span className="journey-step-detail">{detail}</span>
                </span>
              </Reveal>
            ))}
          </ol>
        </div>
      </section>

      <section className="section ajani-mobile-ux" aria-labelledby="ajani-mobile-ux-heading">
        <div className="container">
          <Reveal as="p" className="eyebrow" variant="label">
            UX decisions
          </Reveal>
          <Reveal as="h2" id="ajani-mobile-ux-heading" className="section-heading" variant="headline" order={1}>
            The choices that shaped it
          </Reveal>

          <ul className="decision-cards">
            {UX_DECISIONS.map(({ title, detail }, index) => (
              <Reveal as="li" key={title} className="decision-card" variant="up" order={index}>
                <p className="decision-card-title">{title}</p>
                <p className="decision-card-detail">{detail}</p>
              </Reveal>
            ))}
          </ul>
        </div>
      </section>

      {/* Two sections side by side, each labelled by its own heading. The
          wrapper is a plain div carrying only the section spacing, so neither
          heading ends up labelling content that belongs to the other. */}
      <div className="section ajani-mobile-build">
        <div className="container ajani-mobile-build-inner">
          <section className="ajani-mobile-build-column" aria-labelledby="ajani-mobile-build-heading">
            <Reveal as="p" className="eyebrow" variant="label">
              Native engineering
            </Reveal>
            <Reveal as="h2" id="ajani-mobile-build-heading" className="section-heading" variant="headline" order={1}>
              How it is built
            </Reveal>
            <ul className="detail-list">
              {ENGINEERING.map((item, index) => (
                <Reveal as="li" key={item} variant="up" order={index}>
                  {item}
                </Reveal>
              ))}
            </ul>
          </section>

          <section
            className="ajani-mobile-build-column"
            aria-labelledby="ajani-mobile-accessibility-heading"
          >
            <Reveal as="p" className="eyebrow" variant="label">
              Accessibility
            </Reveal>
            <Reveal
              as="h2"
              id="ajani-mobile-accessibility-heading"
              className="section-heading"
              variant="headline"
              order={1}
            >
              Built to be usable
            </Reveal>
            <ul className="detail-list">
              {ACCESSIBILITY.map((item, index) => (
                <Reveal as="li" key={item} variant="up" order={index}>
                  {item}
                </Reveal>
              ))}
            </ul>
          </section>
        </div>
      </div>

      <section className="section ajani-mobile-closing" aria-labelledby="ajani-mobile-closing-heading">
        <div className="container">
          <Reveal as="h2" id="ajani-mobile-closing-heading" className="section-heading" variant="headline">
            Read the source, or talk to us
          </Reveal>
          <Reveal as="p" className="section-intro" variant="up" order={1}>
            Ajani Mobile is developed in the open. The repository carries the domain rules, the
            SwiftUI views and the test suite described above.
          </Reveal>
          <Reveal className="btn-row" variant="up" order={2}>
            <Link className="btn btn--primary" to={AJANI_MOBILE_DEMO_ROUTE}>
              Try the interactive demo
            </Link>
            <a
              className="btn btn--outline external-link"
              href={FIELD_OPERATIONS_REPO_URL}
              target="_blank"
              rel="noopener noreferrer"
            >
              View native repository
              <ExternalLinkIcon />
              <span className="visually-hidden">(opens in a new tab)</span>
            </a>
            <Link className="btn btn--outline" to="/#products">
              Return to products
            </Link>
            <Link className="btn btn--outline" to="/contact">
              Discuss a digital product
            </Link>
          </Reveal>
        </div>
      </section>
    </main>
  );
}

export default AjaniMobile;
