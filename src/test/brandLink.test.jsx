import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router-dom';
import App from '../App';
import { HOME_SECTION_ID } from '../lib/site';
import { MOBILE_WIDTH, setViewportWidth } from './viewport';

/*
 * The brand link must always take the reader home.
 *
 * Regression: it used to be a plain <Link to="/">. React Router treats a
 * navigation to the location you are already on as a navigation to the same
 * URL, so from "/" nothing about the location changed, no effect re-ran, and a
 * reader who had scrolled halfway down the page stayed exactly where they
 * were. It only appeared to work from "/#services" or "/contact", where the
 * hash or the pathname genuinely changed.
 *
 * It is now a SectionLink to the hero section, which is the same
 * scroll-and-focus path every other in-page link already used.
 */

function Url() {
  const location = useLocation();
  return <span data-testid="url">{`${location.pathname}${location.hash}`}</span>;
}

function renderSite(route = '/') {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <App />
      <Url />
    </MemoryRouter>,
  );
}

const url = () => screen.getByTestId('url').textContent;
const brand = () => screen.getByRole('link', { name: 'Ajani Healthcare, home' });
const homeSection = () => document.getElementById(HOME_SECTION_ID);

/* The hero section is what the link targets; if that id ever moved, the logo
   would silently do nothing again. */
function spyOnHomeScroll() {
  return vi.spyOn(homeSection(), 'scrollIntoView');
}

describe('brand link', () => {
  it('keeps a real, shareable href to the home section', () => {
    renderSite('/');

    expect(brand()).toHaveAttribute('href', `/#${HOME_SECTION_ID}`);
    expect(brand().tagName).toBe('A');
  });

  it('keeps the accessible name that says it goes home', () => {
    renderSite('/');

    expect(brand()).toHaveAccessibleName('Ajani Healthcare, home');
    /* The visible wordmark is contained in that name, so speech input still
       matches what a user can see. */
    expect(brand()).toHaveTextContent('Ajani');
    expect(brand()).toHaveTextContent('Healthcare');
  });

  it('renders inside the one and only site header', () => {
    renderSite('/');

    const banners = screen.getAllByRole('banner');
    expect(banners).toHaveLength(1);
    expect(within(banners[0]).getByRole('link', { name: 'Ajani Healthcare, home' })).toBe(brand());
  });
});

describe('brand link returns to the top from anywhere', () => {
  it('scrolls home from "/" when the reader has scrolled down manually', async () => {
    const user = userEvent.setup();
    renderSite('/');

    /* The regression case: the location is already "/" and no fragment is
       present, so nothing about the URL is going to change on its own. */
    expect(url()).toBe('/');
    const scrolled = spyOnHomeScroll();

    await user.click(brand());

    await waitFor(() => expect(scrolled).toHaveBeenCalled());
    expect(homeSection()).toHaveFocus();
  });

  it('scrolls home again when "#home-section" is already the current hash', async () => {
    const user = userEvent.setup();
    renderSite(`/#${HOME_SECTION_ID}`);

    await waitFor(() => expect(homeSection()).toHaveFocus());

    /* Move focus and forget the arrival scroll, so the assertions below can
       only pass if the click itself did the work. */
    document.body.focus();
    const scrolled = spyOnHomeScroll();

    await user.click(brand());

    await waitFor(() => expect(scrolled).toHaveBeenCalled());
    expect(homeSection()).toHaveFocus();
    expect(url()).toBe(`/#${HOME_SECTION_ID}`);
  });

  it.each(['/#about', '/#services', '/#products'])('returns home from %s', async (route) => {
    const user = userEvent.setup();
    renderSite(route);

    const scrolled = spyOnHomeScroll();
    await user.click(brand());

    await waitFor(() => expect(url()).toBe(`/#${HOME_SECTION_ID}`));
    expect(scrolled).toHaveBeenCalled();
    expect(homeSection()).toHaveFocus();
  });

  it('returns home from the contact route', async () => {
    const user = userEvent.setup();
    renderSite('/contact');

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      /Tell us what you are working through/i,
    );

    await user.click(brand());

    await waitFor(() => expect(url()).toBe(`/#${HOME_SECTION_ID}`));
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      /Healthcare workforce, operations and digital/i,
    );
    expect(homeSection()).toHaveFocus();
  });

  it('returns home from the 404 route', async () => {
    const user = userEvent.setup();
    renderSite('/no-such-page');

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      /We could not find that page/i,
    );

    await user.click(brand());

    await waitFor(() => expect(url()).toBe(`/#${HOME_SECTION_ID}`));
    expect(homeSection()).toHaveFocus();
  });
});

describe('brand link uses the established section behaviour', () => {
  it('scrolls with the same options as every other section link', async () => {
    const user = userEvent.setup();
    renderSite('/');

    const scrolled = spyOnHomeScroll();
    await user.click(brand());

    await waitFor(() =>
      expect(scrolled).toHaveBeenCalledWith({ behavior: 'smooth', block: 'start' }),
    );
  });

  it('focuses the home section without putting it in the tab order', async () => {
    const user = userEvent.setup();
    renderSite('/');

    await user.click(brand());

    await waitFor(() => expect(homeSection()).toHaveFocus());
    expect(homeSection()).toHaveAttribute('tabindex', '-1');
  });

  it('targets a section that actually exists on the page', () => {
    renderSite('/');

    expect(homeSection()).toBeInTheDocument();
    expect(brand().getAttribute('href')).toBe(`/#${homeSection().id}`);
  });
});

describe('brand link leaves modified clicks to the browser', () => {
  it.each([
    ['ctrl', { ctrlKey: true }],
    ['meta', { metaKey: true }],
    ['shift', { shiftKey: true }],
    ['alt', { altKey: true }],
    ['middle', { button: 1 }],
  ])('does not hijack a %s click', (_label, init) => {
    renderSite(`/#${HOME_SECTION_ID}`);

    const scrolled = spyOnHomeScroll();
    scrolled.mockClear();

    /* On this route the link would otherwise preventDefault and scroll. A
       modified click must fall through so the browser can open a new tab. */
    const notPrevented = fireEvent.click(brand(), init);

    expect(notPrevented).toBe(true);
    expect(scrolled).not.toHaveBeenCalled();
  });
});

describe('brand link and the mobile menu', () => {
  it('leaves the menu closed when used from an open menu', async () => {
    setViewportWidth(MOBILE_WIDTH);
    const user = userEvent.setup();
    renderSite('/');

    await user.click(screen.getByRole('button', { name: /Open main menu/i }));
    expect(screen.getByRole('navigation', { name: 'Main' })).toBeInTheDocument();

    await user.click(brand());

    await waitFor(() =>
      expect(screen.queryByRole('navigation', { name: 'Main' })).not.toBeInTheDocument(),
    );
  });

  it('closes the menu even when already at the home section', async () => {
    setViewportWidth(MOBILE_WIDTH);
    const user = userEvent.setup();
    renderSite(`/#${HOME_SECTION_ID}`);

    await user.click(screen.getByRole('button', { name: /Open main menu/i }));
    expect(screen.getByRole('navigation', { name: 'Main' })).toBeInTheDocument();

    /* No navigation happens in this case, so the menu can only close because
       the link dismisses it directly. */
    await user.click(brand());

    await waitFor(() =>
      expect(screen.queryByRole('navigation', { name: 'Main' })).not.toBeInTheDocument(),
    );
  });
});
