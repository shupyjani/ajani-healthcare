import React from 'react';
import Reveal from './Reveal';
import './About.css';

function About() {
  return (
    <section className="section about" id="about" aria-labelledby="about-heading">
      <div className="container about-inner">
        <div>
          <Reveal as="p" className="eyebrow" variant="label">
            About
          </Reveal>
          <Reveal as="h2" id="about-heading" className="section-heading" variant="headline" order={1}>
            Healthcare problems don't stay inside one lane
          </Reveal>
        </div>
        <Reveal className="about-body" variant="up" order={2}>
          <p>
            A staffing shortfall is rarely only a staffing problem. It shows up as strained
            rotas, workarounds in day-to-day operations, and systems that don't quite fit how
            care is actually delivered. Treating workforce, operations and technology as separate
            conversations tends to produce separate, partial fixes.
          </p>
          <p>
            Ajani Healthcare brings clinical, operational and technical perspectives together, so
            that workforce support, process improvement and digital work reinforce each other
            rather than pulling in different directions.
          </p>
        </Reveal>
      </div>
    </section>
  );
}

export default About;
