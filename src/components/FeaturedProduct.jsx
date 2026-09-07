import React from 'react';
import Reveal from './Reveal';
import { ExternalLinkIcon } from './icons';
import { WORKFORCE_PREVIEW_URL, WORKFORCE_REPO_URL } from '../lib/site';
import './FeaturedProduct.css';

function FeaturedProduct() {
  return (
    <Reveal className="featured-product" variant="panel" order={3}>
      <p className="eyebrow">Featured product</p>
      <h3 className="featured-product-title">Ajani Workforce</h3>

      <ul className="status-tags" aria-label="Product status">
        <li className="status-tag">Interactive preview</li>
        <li className="status-tag">An Ajani Healthcare product</li>
      </ul>

      <p className="featured-product-summary">
        Ajani Workforce is a workforce operations platform connecting three journeys: Workers
        finding and accepting shifts, Managers coordinating cover and compliance, and
        Administrators overseeing timesheets and approvals.
      </p>

      {/* The single Ajani Workforce disclosure on the site. It sits directly
          above the preview link, which is the moment it matters. Saying it
          once is honest; the card used to qualify the product three separate
          times over, which only made it sound apologetic. Deeper technical
          detail belongs in the product's own documentation. */}
      <p className="featured-product-note">
        The public preview runs on synthetic demonstration records and is not connected to live
        healthcare operations.
      </p>

      <div className="btn-row">
        <a
          className="btn btn--primary external-link"
          href={WORKFORCE_PREVIEW_URL}
          target="_blank"
          rel="noopener noreferrer"
        >
          Open the live preview
          <ExternalLinkIcon />
          <span className="visually-hidden">(opens in a new tab)</span>
        </a>
        <a
          className="btn btn--outline external-link"
          href={WORKFORCE_REPO_URL}
          target="_blank"
          rel="noopener noreferrer"
        >
          View the public repository
          <ExternalLinkIcon />
          <span className="visually-hidden">(opens in a new tab)</span>
        </a>
      </div>
    </Reveal>
  );
}

export default FeaturedProduct;
