import React from 'react';
import { Link } from 'react-router-dom';
import Reveal from './Reveal';
import './ClosingCta.css';

function ClosingCta() {
  return (
    <section className="section closing-cta" aria-labelledby="closing-cta-heading">
      <div className="container closing-cta-inner">
        <Reveal
          as="h2"
          id="closing-cta-heading"
          className="section-heading"
          variant="headline"
        >
          Let's talk about a workforce, operational or digital challenge
        </Reveal>
        <Reveal as="p" className="section-intro" variant="up" order={1}>
          Whether you lead a healthcare provider, a care organisation, or a health-technology
          team, we're glad to hear what you're working through.
        </Reveal>
        <Reveal variant="up" order={2}>
          <Link to="/contact" className="btn btn--primary">
            Discuss a challenge
          </Link>
        </Reveal>
      </div>
    </section>
  );
}

export default ClosingCta;
