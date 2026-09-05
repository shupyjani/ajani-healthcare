import React from 'react';
import { Link } from 'react-router-dom';
import './NotFound.css';

function NotFound() {
  return (
    <main id="main-content" tabIndex={-1} className="not-found">
      <div className="container not-found-inner">
        <p className="eyebrow">Page not found</p>
        <h1>We could not find that page</h1>
        <p className="section-intro">
          The page you asked for does not exist, or it has moved. The links below will get you
          back to the parts of the site that do.
        </p>
        <div className="btn-row">
          <Link to="/" className="btn btn--primary">
            Go to the home page
          </Link>
          <Link to="/contact" className="btn btn--outline">
            Contact us
          </Link>
        </div>
      </div>
    </main>
  );
}

export default NotFound;
