import React from 'react';
import Reveal from './Reveal';
import ServiceCard from './ServiceCard';
import { DigitalIcon, ReadinessIcon, WorkforceIcon } from './icons';
import './Services.css';

/*
 * The three capabilities, deliberately equal.
 *
 * Same card, same weight, same amount of detail: none of the three is the
 * headline offer. Ajani Healthcare is not a staffing company that also does
 * other things, and the layout should not imply otherwise.
 *
 * The section element itself is never revealed, only its contents. A reveal
 * uses transform, and the <section id="services"> is a scroll target: leaving
 * it untransformed keeps its box exactly where the anchor offset expects it.
 */
function Services() {
  return (
    <section className="section services" id="services" aria-labelledby="services-heading">
      <div className="container">
        <Reveal as="p" className="eyebrow" variant="label">
          Services
        </Reveal>
        <Reveal as="h2" id="services-heading" className="section-heading" variant="headline" order={1}>
          Three areas of healthcare support, working together
        </Reveal>
        <Reveal as="p" className="section-intro" variant="up" order={2}>
          Healthcare problems rarely stay inside one lane. We bring workforce, operational and
          digital perspectives together so support is practical rather than theoretical.
        </Reveal>

        <ul className="service-cards">
          <ServiceCard
            order={0}
            index={1}
            Icon={WorkforceIcon}
            title="Healthcare Workforce"
            description="Workforce and staffing support shaped around service requirements, continuity and safe care delivery, for hospitals, care homes and community services."
            items={[
              'Staffing shaped around rota and service continuity needs',
              'Support for safe, consistent care delivery',
              'Responsive cover for changing service demand',
            ]}
          />
          <ServiceCard
            order={1}
            index={2}
            Icon={DigitalIcon}
            title="Digital Products & UX"
            description="Design and delivery of digital healthcare services, from public websites to the internal tools care and administrative teams use every day."
            items={[
              'Healthcare websites and web applications',
              'UX research, journey mapping and interface design',
              'Prototypes and internal operational tools',
              'Technical discovery and iterative product delivery',
            ]}
          />
          <ServiceCard
            order={2}
            index={3}
            Icon={ReadinessIcon}
            title="Healthcare Operations & UK Readiness"
            description="Operational improvement for care teams, and discovery support for health-technology companies preparing a product for NHS and UK care settings."
            items={[
              'Healthcare workflow and service improvement',
              'Care pathways and referral routes',
              'Product discovery and readiness assessment',
              'Accessibility and interoperability considerations',
              'Assurance planning',
            ]}
            note="Where formal regulatory or clinical-safety work is required, we work alongside appropriately qualified specialists."
          />
        </ul>
      </div>
    </section>
  );
}

export default Services;
