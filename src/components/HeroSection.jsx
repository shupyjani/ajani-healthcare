import React from 'react';
import { Link } from 'react-router-dom';
import HeroVisual from './HeroVisual';
import { HOME_SECTION_ID } from '../lib/site';
import Reveal from './Reveal';
import SectionLink from './SectionLink';
import './HeroSection.css';

/*
 * The hero entrance reveals meaningful groups, never individual words or
 * letters: the eyebrow, then the whole headline as one node, then the lede,
 * then the actions and the trust list, then the visual. Keeping the headline
 * in a single element is what stops the accessible name of the page's H1 from
 * being fragmented into per-fragment text nodes.
 */
function HeroSection() {
  return (
    <section className="hero" id={HOME_SECTION_ID} aria-labelledby="hero-heading">
      <div className="container hero-inner">
        <div className="hero-content">
          <Reveal as="p" className="hero-eyebrow" variant="label">
            Ajani Healthcare
          </Reveal>

          <Reveal as="h1" id="hero-heading" className="hero-heading" variant="headline" order={1}>
            Healthcare workforce, operations and digital solutions shaped by real-world care.
          </Reveal>

          <Reveal as="p" className="hero-lede" variant="up" order={2}>
            Ajani Healthcare helps healthcare organisations strengthen their workforce,
            improve operations, and design and build better digital services.
          </Reveal>

          <Reveal className="hero-actions" variant="up" order={3}>
            <SectionLink section="services" className="btn btn--primary">
              Explore our services
            </SectionLink>
            <Link to="/contact" className="btn btn--outline">
              Discuss a healthcare challenge
            </Link>
          </Reveal>

          <Reveal as="ul" className="hero-trust" variant="up" order={4} aria-label="At a glance">
            <li>UK-based</li>
            <li>Healthcare-focused</li>
            <li>Practical, user-centred delivery</li>
          </Reveal>
        </div>

        <HeroVisual />
      </div>
    </section>
  );
}

export default HeroSection;
