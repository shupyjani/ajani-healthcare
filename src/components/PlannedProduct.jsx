import React from 'react';
import Reveal from './Reveal';
import './PlannedProduct.css';

function PlannedProduct() {
  return (
    <Reveal className="planned-product" variant="panel" order={4}>
      <p className="planned-product-label">Planned concept &middot; in our product roadmap</p>
      <h3 className="planned-product-title">Ajani Field Operations</h3>
      <p className="planned-product-summary">
        An iOS-first field-operations concept for teams working across changing locations and
        unreliable connectivity, with future Android support considered as the product develops.
      </p>
      <ul className="planned-product-list">
        <li>Offline-first working</li>
        <li>Location-aware assignments</li>
        <li>Field-task completion</li>
        <li>Secure synchronisation</li>
      </ul>
      <p className="planned-product-disclaimer">
        This is a concept under consideration, not a released or downloadable application.
      </p>
    </Reveal>
  );
}

export default PlannedProduct;
