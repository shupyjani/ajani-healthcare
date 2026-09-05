import React, { useCallback, useEffect, useId, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import Brand from './Brand';
import SectionLink from './SectionLink';
import { CloseIcon, MenuIcon } from './icons';
import { HOME_SECTION_ID, SECTION_LINKS } from '../lib/site';
import { MOBILE_NAV_QUERY, useMediaQuery } from '../lib/useMediaQuery';
import './Navbar.css';

/*
 * Site header and primary navigation.
 *
 * The mobile menu is *conditionally rendered* rather than visually hidden.
 * A closed menu has no nodes in the document at all, so its links cannot be
 * reached by Tab and are not announced by a screen reader — the failure mode
 * a `display: none`-free "off-canvas" panel usually has. At desktop widths the
 * same list is always rendered, so keyboard and pointer users get the full
 * navigation without a disclosure step.
 */
function Navbar() {
  const isMobile = useMediaQuery(MOBILE_NAV_QUERY);
  const [isOpen, setIsOpen] = useState(false);
  const menuId = useId();
  const toggleRef = useRef(null);
  const firstItemRef = useRef(null);
  const shouldFocusFirstItem = useRef(false);
  const location = useLocation();

  const close = useCallback((options = {}) => {
    setIsOpen(false);
    if (options.returnFocus && toggleRef.current) {
      toggleRef.current.focus();
    }
  }, []);

  /* Leaving mobile widths while open must not strand the menu in an open
     state that desktop styling no longer describes. */
  useEffect(() => {
    if (!isMobile) {
      // oxlint-disable-next-line react/set-state-in-effect
      setIsOpen(false);
    }
  }, [isMobile]);

  /* Any navigation dismisses the menu; the destination is now on screen.
     Keyed on location.key rather than the pathname and hash so that choosing
     the section the reader is already viewing still closes the menu. */
  useEffect(() => {
    // oxlint-disable-next-line react/set-state-in-effect
    setIsOpen(false);
    // location.key is a re-run trigger, not a value the effect body reads; it
    // is what makes a repeat navigation to the current URL still close the menu.
    // oxlint-disable-next-line react/exhaustive-effect-dependencies
  }, [location.key]);

  /* Escape closes the menu and hands focus back to the control that opened
     it, so keyboard users are never left with focus on a removed node. */
  useEffect(() => {
    if (!isOpen) return undefined;

    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        close({ returnFocus: true });
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [isOpen, close]);

  /* Opening moves focus into the menu so the next Tab continues from there
     instead of restarting after the header. */
  useEffect(() => {
    if (isOpen && shouldFocusFirstItem.current && firstItemRef.current) {
      firstItemRef.current.focus();
    }
    shouldFocusFirstItem.current = false;
  }, [isOpen]);

  const onToggle = () => {
    shouldFocusFirstItem.current = !isOpen;
    setIsOpen((open) => !open);
  };

  /* Belt and braces alongside the location effect above: activating a section
     already in the address bar is handled without a navigation, so there is no
     new location for that effect to see. */
  const dismiss = () => setIsOpen(false);

  const isMenuRendered = !isMobile || isOpen;

  return (
    <header className="site-header">
      <div className="container site-header-inner">
        {/* Targets the hero section rather than the bare "/" route. A plain
            <Link to="/"> is a no-op when the reader is already on "/" — React
            Router treats it as a navigation to the current location, so no
            effect re-runs and a scrolled-down visitor stays where they are.
            Going through SectionLink means the logo scrolls and focuses the
            top of the page from anywhere, including from "/" itself. */}
        <SectionLink
          section={HOME_SECTION_ID}
          className="site-header-brand"
          aria-label="Ajani Healthcare, home"
          onClick={dismiss}
        >
          <Brand showWordmark />
        </SectionLink>

        {isMobile && (
          <button
            type="button"
            ref={toggleRef}
            className="nav-toggle"
            aria-expanded={isOpen}
            aria-controls={menuId}
            onClick={onToggle}
          >
            {isOpen ? <CloseIcon /> : <MenuIcon />}
            <span className="visually-hidden">
              {isOpen ? 'Close main menu' : 'Open main menu'}
            </span>
          </button>
        )}

        {isMenuRendered && (
          <nav
            id={menuId}
            className={`site-nav${isMobile ? ' site-nav--mobile' : ''}`}
            aria-label="Main"
          >
            <ul className="site-nav-list">
              {SECTION_LINKS.map((link, index) => (
                <li key={link.id}>
                  <SectionLink
                    section={link.id}
                    className="site-nav-link"
                    onClick={dismiss}
                    ref={index === 0 ? firstItemRef : undefined}
                  >
                    {link.label}
                  </SectionLink>
                </li>
              ))}
              <li>
                <Link to="/contact" className="btn btn--primary site-nav-cta" onClick={dismiss}>
                  Contact
                </Link>
              </li>
            </ul>
          </nav>
        )}
      </div>
    </header>
  );
}

export default Navbar;
