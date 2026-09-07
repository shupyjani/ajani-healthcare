import React from 'react';
import './PhoneFrame.css';

/**
 * An iPhone-shaped frame, drawn in CSS.
 *
 * Shared by the homepage teaser, whose screen is a code-built wallpaper, and
 * the case study's gallery, whose screens are product screenshots. Keeping one
 * frame means both surfaces round the same corners and hold the same aspect
 * ratio, which is the ratio of the screenshots themselves.
 *
 * Purely presentational. The bezel, the side buttons and the home indicator
 * are `aria-hidden`, and the frame adds no role or name of its own: whatever
 * is placed inside is what gets announced, whether that is an image's alt text
 * or the teaser's own copy. It is not a control and it never wraps one.
 *
 * `overflow: hidden` is deliberately *not* set on the screen. Clipping to the
 * bezel radius is the usual way to round a phone screen, and it is exactly
 * what would slice the focus ring off a link sitting near the screen edge.
 * Anything needing the rounding clips itself instead — an <img> by its own
 * border-radius, the teaser's wallpaper by its own overflow.
 */
function PhoneFrame({ className = '', children }) {
  const classes = ['phone-frame', className].filter(Boolean).join(' ');

  return (
    <div className={classes}>
      <span className="phone-frame-button phone-frame-button--silence" aria-hidden="true" />
      <span className="phone-frame-button phone-frame-button--up" aria-hidden="true" />
      <span className="phone-frame-button phone-frame-button--down" aria-hidden="true" />
      <span className="phone-frame-button phone-frame-button--power" aria-hidden="true" />

      <div className="phone-frame-screen">
        <span className="phone-frame-island" aria-hidden="true" />
        {children}
        <span className="phone-frame-indicator" aria-hidden="true" />
      </div>
    </div>
  );
}

export default PhoneFrame;
