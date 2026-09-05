import React, { useLayoutEffect, useRef } from 'react';
import { motionEnabled, revealOnEnter } from '../lib/motion';

/**
 * Wraps a piece of content in a scroll reveal.
 *
 * The rendered element carries only its own classes plus `reveal`, which on
 * its own does nothing visible. The pre-reveal state (`is-pending`) is added
 * imperatively in a layout effect — after mount, before paint — and only when
 * motion is enabled. That ordering is what makes the reveal a genuine
 * enhancement: with JavaScript disabled, with no IntersectionObserver, or
 * under `prefers-reduced-motion`, the element is simply rendered and shown.
 *
 * Classes are toggled directly rather than through state because React never
 * re-renders these nodes, and going through state would mean a synchronous
 * re-render inside a layout effect on every revealed element on the page.
 *
 * @param {string}  variant  which motion to use; see src/styles/motion.css
 * @param {number}  order    stagger position within its group (0 = first)
 */
function Reveal({
  as: Component = 'div',
  variant = 'up',
  order = 0,
  className = '',
  style,
  children,
  ...rest
}) {
  const ref = useRef(null);

  useLayoutEffect(() => {
    const element = ref.current;
    if (!element || !motionEnabled()) return undefined;

    element.classList.add('is-pending');

    const cancel = revealOnEnter(element, () => {
      element.classList.remove('is-pending');
      element.classList.add('is-revealed');
    });

    return () => {
      cancel();
      element.classList.remove('is-pending');
    };
  }, []);

  const classes = ['reveal', `reveal--${variant}`, className].filter(Boolean).join(' ');

  return (
    <Component
      ref={ref}
      className={classes}
      style={order ? { '--reveal-order': order, ...style } : style}
      {...rest}
    >
      {children}
    </Component>
  );
}

export default Reveal;
