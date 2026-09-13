import React from 'react';
import { APPLICATION, PRACTITIONER } from '../../lib/demoVisits';
import { BadgeGlyph, PersonGlyph, RouteGlyph } from './demoIcons';
import BrandMark from '../BrandMark';

/*
 * More: who is working the round, and how they want the app to behave.
 *
 * Both preferences are real switches over real behaviour, not decoration —
 * one changes what the Today schedule contains, the other changes whether
 * completing a visit asks first. Each is a checkbox with a visible label and
 * a description tied to it by aria-describedby.
 */
const PREFERENCES = [
  {
    key: 'showCompletedOnToday',
    label: 'Show completed visits on Today',
    hint: 'Keeps finished calls in the schedule list.',
  },
  {
    key: 'confirmBeforeCompleting',
    label: 'Confirm before completing a visit',
    hint: 'Asks for confirmation before a visit is closed.',
  },
];

function MoreScreen({ state, onPreference, onOpenAssistant }) {
  return (
    <div className="demo-screen-body">
      <h3 className="demo-screen-title">More</h3>

      <section className="demo-card" aria-labelledby="demo-profile-heading">
        <div className="demo-profile">
          <span className="demo-avatar demo-avatar--large" aria-hidden="true">
            {PRACTITIONER.initials}
          </span>
          <div>
            <h4 id="demo-profile-heading" className="demo-profile-name">
              {PRACTITIONER.name}
            </h4>
            <p className="demo-profile-role">{PRACTITIONER.role}</p>
          </div>
        </div>

        <dl className="demo-detail-list">
          <div className="demo-detail-row">
            <dt>
              <PersonGlyph /> Team
            </dt>
            <dd>{PRACTITIONER.team}</dd>
          </div>
          <div className="demo-detail-row">
            <dt>
              <BadgeGlyph /> Staff reference
            </dt>
            <dd>{PRACTITIONER.staffReference}</dd>
          </div>
          <div className="demo-detail-row">
            <dt>
              <RouteGlyph /> Round
            </dt>
            <dd>{PRACTITIONER.round}</dd>
          </div>
        </dl>
      </section>

      <section className="demo-card" aria-labelledby="demo-preferences-heading">
        <h4 id="demo-preferences-heading" className="demo-section-title">
          Preferences
        </h4>

        <ul className="demo-preferences">
          {PREFERENCES.map(({ key, label, hint }) => (
            <li className="demo-preference" key={key}>
              <label className="demo-preference-label" htmlFor={`demo-pref-${key}`}>
                {label}
              </label>
              <p className="demo-preference-hint" id={`demo-pref-${key}-hint`}>
                {hint}
              </p>
              <input
                id={`demo-pref-${key}`}
                className="demo-switch"
                type="checkbox"
                checked={state.preferences[key]}
                aria-describedby={`demo-pref-${key}-hint`}
                onChange={(event) => onPreference(key, event.target.checked)}
              />
            </li>
          ))}
        </ul>
      </section>

      <section className="demo-card" aria-labelledby="demo-assistant-heading">
        <h4 className="demo-section-title" id="demo-assistant-heading">
          Ajani Assistant
        </h4>
        <p className="demo-empty-detail">
          Ask about the round, or how a control works.
        </p>
        <div className="demo-actions">
          <button
            type="button"
            className="demo-button demo-button--primary"
            onClick={onOpenAssistant}
          >
            Open assistant
          </button>
        </div>
      </section>

      <section className="demo-card" aria-labelledby="demo-application-heading">
        <h4 id="demo-application-heading" className="demo-section-title">
          Application
        </h4>
        {/*
          The symbol beside the name, on one row.

          There was a "Name" label here, paired with the value in a definition
          list. Under a heading that already says Application it named nothing
          the reader could not see, so the pair is now simply the product's own
          symbol and the product's own name. The heading still labels the
          section, and the symbol stays decorative.
        */}
        <p className="demo-application">
          <BrandMark size={36} className="brand-mark demo-app-mark" />
          <span className="demo-application-name">{APPLICATION.name}</span>
        </p>
      </section>
    </div>
  );
}

export default MoreScreen;
