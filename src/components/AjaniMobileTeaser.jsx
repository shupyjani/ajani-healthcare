import React from 'react';
import { Link } from 'react-router-dom';
import BrandMark from './BrandMark';
import PhoneFrame from './PhoneFrame';
import { AJANI_MOBILE_ROUTE } from '../lib/site';
import './AjaniMobileTeaser.css';

/*
 * The homepage Ajani Mobile teaser.
 *
 * A splash screen, not a simulation. There is deliberately no tab bar, no
 * visit row, no toggle and no button that does nothing: a control that cannot
 * be operated is worse than no control, both for a reader who tries it and for
 * a screen-reader user who is told it exists. Everything here is either text,
 * decoration, or the single real link out to the case study.
 *
 * The wallpaper is built from the brand mark and plain CSS shapes — no
 * screenshot is loaded on the home page, which is what keeps the homepage
 * image-free and keeps the case study's screenshots inside its own lazy chunk.
 */
function AjaniMobileTeaser() {
  return (
    <PhoneFrame className="ajani-mobile-teaser">
      {/* Clips itself rather than the screen, so the link's focus ring below
          is never sliced by the bezel radius. */}
      <span className="teaser-wallpaper" aria-hidden="true">
        <span className="teaser-glow" />
        <span className="teaser-arc teaser-arc--one" />
        <span className="teaser-arc teaser-arc--two" />
        <span className="teaser-arc teaser-arc--three" />
        <span className="teaser-rule" />
      </span>

      {/* Two placed regions rather than one centred stack: the lockup sits in
          the upper third and the call to action low, with the space between
          them owned by a grid track. Sized in fractions of the screen, so the
          balance holds at every phone width instead of depending on a pixel
          offset that only looks right at one. */}
      <div className="teaser-content">
        <span className="teaser-lockup">
          <span className="teaser-mark">
            <BrandMark size={40} className="brand-mark teaser-brand-mark" />
          </span>

          <span className="teaser-name">Ajani Mobile</span>
          <span className="teaser-line">Field visits, clearly organised.</span>
        </span>

        <Link className="teaser-cta" to={AJANI_MOBILE_ROUTE}>
          Explore Ajani Mobile
        </Link>
      </div>
    </PhoneFrame>
  );
}

export default AjaniMobileTeaser;
