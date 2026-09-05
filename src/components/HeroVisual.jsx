import React from 'react';
import BrandMark from './BrandMark';
import Reveal from './Reveal';
import { DigitalIcon, ReadinessIcon, WorkforceIcon } from './icons';
import './HeroVisual.css';

/*
 * The hero's supporting visual.
 *
 * Built entirely in markup, CSS and inline SVG: no photography, no stock
 * imagery and no third-party illustration. It is a diagram of how the company
 * actually works — Ajani Healthcare and its three connected capabilities —
 * drawn as a hub with a connector running through each strand.
 *
 * It states no figures. There is no dashboard, chart, percentage or count
 * here, because the company has no published performance data this visual
 * could honestly show. Everything it displays is a label that appears
 * elsewhere on the page as prose.
 *
 * Structurally it is a single column at every width, so the mobile rendering
 * is the same diagram at a smaller size rather than a degraded one. It is
 * never hidden on small screens.
 *
 * On entrance the diagram assembles once: the panel scales into place, then
 * the hub and each strand arrive in turn while the connectors draw downwards
 * between them. That sequence lives in src/styles/motion.css, keyed off the
 * panel's reveal state, and stops as soon as it has run — there is no looping
 * or ambient motion anywhere in it.
 */

const STRANDS = [
  {
    id: 'workforce',
    Icon: WorkforceIcon,
    name: 'Healthcare workforce',
    detail: 'Staffing shaped around rota and service continuity',
  },
  {
    id: 'digital',
    Icon: DigitalIcon,
    name: 'Digital products and UX',
    detail: 'Websites, web applications and internal tools',
  },
  {
    id: 'readiness',
    Icon: ReadinessIcon,
    name: 'Healthcare operations and readiness',
    detail: 'Workflow improvement, pathways and assurance planning',
  },
];

function HeroVisual() {
  return (
    <figure className="hero-visual">
      <Reveal className="hero-visual-panel" variant="panel" order={4}>
        <svg className="hero-visual-lattice" aria-hidden="true" focusable="false">
          <defs>
            <pattern
              id="ahc-hero-lattice"
              width="22"
              height="22"
              patternUnits="userSpaceOnUse"
            >
              <circle cx="1.5" cy="1.5" r="1.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#ahc-hero-lattice)" />
        </svg>

        <div className="hero-visual-flow">
          <div className="hv-hub">
            <span className="hv-badge hv-badge--hub">
              <BrandMark size={24} className="hv-hub-mark" />
            </span>
            <span className="hv-hub-text">
              <span className="hv-hub-name">Ajani Healthcare</span>
              <span className="hv-hub-role">Connected capabilities</span>
            </span>
          </div>

          <ul className="hv-strands">
            {STRANDS.map(({ id, Icon, name, detail }) => (
              <li className="hv-strand" key={id}>
                <span className="hv-badge">
                  <Icon />
                </span>
                <span className="hv-strand-text">
                  <span className="hv-strand-name">{name}</span>
                  <span className="hv-strand-detail">{detail}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>

        <p className="hero-visual-foot">
          Three connected strands of work, planned and delivered together.
        </p>
      </Reveal>

      <figcaption className="visually-hidden">
        A diagram of Ajani Healthcare connected to its three capabilities: healthcare
        workforce, digital products and UX, and healthcare operations and readiness.
      </figcaption>
    </figure>
  );
}

export default HeroVisual;
