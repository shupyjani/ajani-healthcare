import React from 'react';
import Reveal from './Reveal';
import './Transparency.css';

/*
 * How the work is done.
 *
 * This section used to be a list of things the company is careful to say it
 * does not do. It now states how it works instead. That is a more useful
 * thing for a reader to know, and it stops the product disclosure being
 * repeated here — it is made once, next to the preview link it applies to.
 *
 * Every line is a practice, not a credential. Nothing here claims a
 * certification, a client or a compliance guarantee.
 */

const PRINCIPLES = [
  'Healthcare-led discovery, shaped around how care actually gets delivered.',
  'Product stage and scope communicated clearly, at every step.',
  'Privacy, accessibility and safety considered from the outset.',
  'Specialist input involved wherever formal assurance is required.',
];

function Transparency() {
  return (
    <section
      className="section transparency"
      id="transparency"
      aria-labelledby="transparency-heading"
    >
      <div className="container">
        <Reveal as="p" className="eyebrow" variant="label">
          How we work
        </Reveal>
        <Reveal
          as="h2"
          id="transparency-heading"
          className="section-heading"
          variant="headline"
          order={1}
        >
          Clear, practical and grounded in care
        </Reveal>
        <ul className="transparency-list">
          {PRINCIPLES.map((principle, index) => (
            <Reveal as="li" key={principle} variant="up" order={index}>
              {principle}
            </Reveal>
          ))}
        </ul>
      </div>
    </section>
  );
}

export default Transparency;
