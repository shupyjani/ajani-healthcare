import React from 'react';
import AjaniMobileTeaser from './AjaniMobileTeaser';
import Reveal from './Reveal';
import { ExternalLinkIcon } from './icons';
import { FIELD_OPERATIONS_REPO_URL } from '../lib/site';
import './FieldOperationsProduct.css';

/*
 * Ajani Field Operations, presented through the application that exists.
 *
 * Two columns at desktop width: the product on the left, the Ajani Mobile
 * teaser on the right. Below 900px the phone stacks under the copy, because
 * the copy is what carries the meaning and the phone is what illustrates it.
 *
 * The eyebrow names what the product is — a native product — rather than what
 * stage it has reached. There is no closing disclaimer either: the repository
 * link is what makes the claim checkable, and qualifying the product would
 * only make it sound apologetic. Everything named here is implemented;
 * nothing is promised.
 */
function FieldOperationsProduct() {
  return (
    <Reveal className="field-operations-product" variant="panel" order={4}>
      <div className="field-operations-product-copy">
        <p className="eyebrow">Native product</p>
        <h3 className="field-operations-product-title">Ajani Field Operations</h3>

        <ul className="status-tags" aria-label="Ajani Mobile platform">
          <li className="status-tag">Native iPhone app</li>
          <li className="status-tag">SwiftUI</li>
          <li className="status-tag">iOS 18 and later</li>
        </ul>

        <p className="field-operations-product-summary">
          Ajani Mobile is the native SwiftUI iPhone application for Ajani Field Operations,
          built for practitioners working a daily round of visits away from a desk.
        </p>

        {/* Labelled through the visible lead rather than an aria-label, so the
            list is announced with the same words the reader sees once, not
            twice. */}
        <p className="field-operations-product-lead" id="field-operations-journeys">
          Current journeys
        </p>
        <ul className="field-operations-product-list" aria-labelledby="field-operations-journeys">
          <li>Shift overview and progress</li>
          <li>Searchable and filterable visits</li>
          <li>Validated visit-status progression</li>
          <li>Visit-task completion</li>
          <li>Practitioner preferences</li>
          <li>Light and dark appearance support</li>
        </ul>

        {/* The copy column carries the repository link only. "Explore Ajani
            Mobile" is the phone's own call to action, and repeating it here
            would put two links with the same name and the same destination a
            few tab stops apart. */}
        <div className="btn-row">
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
        </div>
      </div>

      <div className="field-operations-product-visual">
        <AjaniMobileTeaser />
      </div>
    </Reveal>
  );
}

export default FieldOperationsProduct;
