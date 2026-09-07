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
            Ajani Healthcare works across all three at once, so that workforce support,
            process improvement and digital work reinforce each other rather than pulling in
            different directions.
          </p>

          {/* A short leadership note, not a founder section: an eyebrow, one
              paragraph and a hairline. It sits after the narrative it supports
              so the section still reads as being about the company, with the
              person as the reason the three perspectives actually meet. */}
          <div className="about-leadership">
            <p className="eyebrow">Leadership</p>
            <p className="about-leadership-body">
              Ajani Healthcare is led by Olasupo Ajani, a registered nurse and full-stack
              product engineer with experience in team leadership, clinical governance,
              service improvement and healthcare operations. That combination brings
              frontline care and operational decision-making into product strategy, UI/UX and
              software delivery.
            </p>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

export default About;
