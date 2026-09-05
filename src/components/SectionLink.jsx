import React, { forwardRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { isModifiedClick, scrollToSection, sectionHref } from '../lib/sectionNavigation';

/**
 * A link to a section of the home page, including the brand link to its top.
 *
 * Renders a real React Router <Link> to `/#section`, so it is an ordinary
 * anchor with a shareable href: middle-click, open-in-new-tab and copy-link all
 * behave normally, and the URL that results can be pasted to anyone.
 * HashScroll is what performs the scroll once the location changes.
 *
 * The one case this component handles itself is activating the section that is
 * already in the address bar. React Router treats a navigation to the current
 * URL as a replace, and relying on that to still produce a fresh location for
 * HashScroll to react to would be depending on router internals. Scrolling
 * directly is both simpler and guaranteed.
 *
 * That case is exactly why the brand link is a SectionLink too: a plain
 * <Link to="/"> pressed while already on "/" changes no part of the location,
 * so nothing re-runs and a scrolled-down reader is left where they were.
 */
const SectionLink = forwardRef(function SectionLink(
  { section, onClick, children, ...rest },
  ref,
) {
  const location = useLocation();

  const handleClick = (event) => {
    if (onClick) onClick(event);
    if (event.defaultPrevented || isModifiedClick(event)) return;

    const alreadyThere = location.pathname === '/' && location.hash === `#${section}`;
    if (!alreadyThere) return;

    event.preventDefault();
    scrollToSection(section);
  };

  return (
    <Link ref={ref} to={sectionHref(section)} onClick={handleClick} {...rest}>
      {children}
    </Link>
  );
});

export default SectionLink;
