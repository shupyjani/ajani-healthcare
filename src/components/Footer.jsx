import React from 'react';
import { Link } from 'react-router-dom';
import SectionLink from './SectionLink';
import Brand from './Brand';
import { ExternalLinkIcon } from './icons';
import { SECTION_LINKS, WORKFORCE_PREVIEW_URL, WORKFORCE_REPO_URL } from '../lib/site';
import './Footer.css';

/*
 * Site footer.
 *
 * Deliberately carries no social profiles: the site links only to
 * destinations Ajani Healthcare actually publishes, so nothing here is a
 * placeholder or an invented handle.
 */
function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="site-footer">
      <div className="container site-footer-inner">
        <div className="site-footer-identity">
          <Brand variant="inverse" showWordmark />
          <p className="site-footer-blurb">
            A healthcare company working across workforce support, digital products and
            UX, and healthcare operations and readiness.
          </p>
        </div>

        <nav className="site-footer-nav" aria-label="Footer">
          <div className="site-footer-group">
            <h2 className="site-footer-heading">Company</h2>
            <ul className="site-footer-list">
              {SECTION_LINKS.map((link) => (
                <li key={link.id}>
                  <SectionLink section={link.id} className="site-footer-link">
                    {link.label}
                  </SectionLink>
                </li>
              ))}
              <li>
                <SectionLink section="transparency" className="site-footer-link">
                  Transparency
                </SectionLink>
              </li>
              <li>
                <Link to="/contact" className="site-footer-link">
                  Contact
                </Link>
              </li>
            </ul>
          </div>

          <div className="site-footer-group">
            <h2 className="site-footer-heading">Ajani Workforce</h2>
            <ul className="site-footer-list">
              <li>
                <a
                  className="site-footer-link external-link"
                  href={WORKFORCE_PREVIEW_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Live preview
                  <ExternalLinkIcon />
                  <span className="visually-hidden">(opens in a new tab)</span>
                </a>
              </li>
              <li>
                <a
                  className="site-footer-link external-link"
                  href={WORKFORCE_REPO_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Public repository
                  <ExternalLinkIcon />
                  <span className="visually-hidden">(opens in a new tab)</span>
                </a>
              </li>
            </ul>
          </div>
        </nav>
      </div>

      <div className="container site-footer-legal">
        <p>&copy; {year} Ajani Healthcare. All rights reserved.</p>
      </div>
    </footer>
  );
}

export default Footer;
