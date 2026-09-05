import { describe, expect, it } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderApp } from './renderApp';
import { MOBILE_WIDTH, setViewportWidth } from './viewport';

/* Names of the links the primary navigation offers, in order. */
const NAV_LINKS = ['Services', 'Products', 'About', 'Contact'];

function openMenu(user) {
  return user.click(screen.getByRole('button', { name: /Open main menu/i }));
}

describe('desktop navigation', () => {
  it('exposes every link without a disclosure step', () => {
    renderApp('/');

    const nav = screen.getByRole('navigation', { name: 'Main' });
    for (const label of NAV_LINKS) {
      expect(within(nav).getByRole('link', { name: label })).toBeInTheDocument();
    }

    expect(screen.queryByRole('button', { name: /main menu/i })).not.toBeInTheDocument();
  });
});

describe('mobile navigation', () => {
  it('starts closed, with the toggle reporting its state', () => {
    setViewportWidth(MOBILE_WIDTH);
    renderApp('/');

    const toggle = screen.getByRole('button', { name: /Open main menu/i });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('navigation', { name: 'Main' })).not.toBeInTheDocument();
  });

  it('opens on click and moves focus to the first item', async () => {
    setViewportWidth(MOBILE_WIDTH);
    const user = userEvent.setup();
    renderApp('/');

    await openMenu(user);

    const nav = screen.getByRole('navigation', { name: 'Main' });
    expect(screen.getByRole('button', { name: /Close main menu/i })).toHaveAttribute(
      'aria-expanded',
      'true',
    );

    for (const label of NAV_LINKS) {
      expect(within(nav).getByRole('link', { name: label })).toBeInTheDocument();
    }

    await waitFor(() => {
      expect(within(nav).getByRole('link', { name: 'Services' })).toHaveFocus();
    });
  });

  it('the toggle points at the menu it controls', async () => {
    setViewportWidth(MOBILE_WIDTH);
    const user = userEvent.setup();
    renderApp('/');

    await openMenu(user);

    const toggle = screen.getByRole('button', { name: /Close main menu/i });
    const nav = screen.getByRole('navigation', { name: 'Main' });
    expect(toggle.getAttribute('aria-controls')).toBe(nav.getAttribute('id'));
  });

  it('closes on Escape and returns focus to the toggle', async () => {
    setViewportWidth(MOBILE_WIDTH);
    const user = userEvent.setup();
    renderApp('/');

    await openMenu(user);
    expect(screen.getByRole('navigation', { name: 'Main' })).toBeInTheDocument();

    await user.keyboard('{Escape}');

    expect(screen.queryByRole('navigation', { name: 'Main' })).not.toBeInTheDocument();

    const toggle = screen.getByRole('button', { name: /Open main menu/i });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(toggle).toHaveFocus();
  });

  it('closes again on a second click of the toggle', async () => {
    setViewportWidth(MOBILE_WIDTH);
    const user = userEvent.setup();
    renderApp('/');

    await openMenu(user);
    await user.click(screen.getByRole('button', { name: /Close main menu/i }));

    expect(screen.queryByRole('navigation', { name: 'Main' })).not.toBeInTheDocument();
  });
});

describe('closed mobile navigation is not reachable', () => {
  it('leaves no navigation links in the accessibility tree', () => {
    setViewportWidth(MOBILE_WIDTH);
    renderApp('/');

    const banner = screen.getByRole('banner');
    for (const label of NAV_LINKS) {
      expect(within(banner).queryByRole('link', { name: label })).not.toBeInTheDocument();
    }
  });

  it('leaves no tabbable node in the header but the brand and the toggle', () => {
    setViewportWidth(MOBILE_WIDTH);
    renderApp('/');

    const banner = screen.getByRole('banner');
    const tabbable = banner.querySelectorAll('a[href], button, input, select, textarea');

    expect(Array.from(tabbable).map((node) => node.tagName)).toEqual(['A', 'BUTTON']);
    expect(tabbable[0]).toHaveAccessibleName('Ajani Healthcare, home');
  });

  it('removes the links from the document entirely once Escape closes the menu', async () => {
    setViewportWidth(MOBILE_WIDTH);
    const user = userEvent.setup();
    renderApp('/');

    await openMenu(user);
    await user.keyboard('{Escape}');

    const banner = screen.getByRole('banner');
    expect(banner.querySelectorAll('a[href]')).toHaveLength(1);
  });
});

describe('skip link', () => {
  it('is the first focusable element and moves focus to main', async () => {
    const user = userEvent.setup();
    renderApp('/');

    const skipLink = screen.getByRole('link', { name: /Skip to main content/i });

    await user.tab();
    expect(skipLink).toHaveFocus();

    await user.click(skipLink);

    const main = screen.getByRole('main');
    expect(main).toHaveAttribute('id', 'main-content');
    expect(main).toHaveFocus();
  });

  it('points at a target that exists on the contact route too', async () => {
    const user = userEvent.setup();
    renderApp('/contact');

    await user.click(screen.getByRole('link', { name: /Skip to main content/i }));

    expect(screen.getByRole('main')).toHaveFocus();
  });
});
