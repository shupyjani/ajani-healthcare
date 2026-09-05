import { readFileSync } from 'node:fs';
import React from 'react';
import { describe, expect, it } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation, useNavigate } from 'react-router-dom';
import App from '../App';
import { MOBILE_WIDTH, setReducedMotion, setViewportWidth } from './viewport';

/*
 * Section navigation replaced react-router-hash-link with a local
 * implementation, so these cases cover the behaviour that dependency used to
 * provide plus the parts it never did: focus, history and repeat activation.
 */

/** Reports the current URL, and offers the two history controls a browser has. */
function History() {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <div>
      <span data-testid="url">{`${location.pathname}${location.hash}`}</span>
      <button type="button" onClick={() => navigate(-1)}>
        history back
      </button>
      <button type="button" onClick={() => navigate(1)}>
        history forward
      </button>
    </div>
  );
}

function renderSite(route = '/') {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <App />
      <History />
    </MemoryRouter>,
  );
}

const url = () => screen.getByTestId('url').textContent;

function navLink(name) {
  return within(screen.getByRole('navigation', { name: 'Main' })).getByRole('link', { name });
}

describe('section links', () => {
  it('point at shareable /#section URLs', () => {
    renderSite('/');

    expect(navLink('Services')).toHaveAttribute('href', '/#services');
    expect(navLink('Products')).toHaveAttribute('href', '/#products');
    expect(navLink('About')).toHaveAttribute('href', '/#about');
  });

  it('take the reader to the section from the home page', async () => {
    const user = userEvent.setup();
    renderSite('/');

    await user.click(navLink('Services'));

    await waitFor(() => expect(url()).toBe('/#services'));
    expect(document.getElementById('services')).toHaveFocus();
    expect(Element.prototype.scrollIntoView).toHaveBeenCalledWith({
      behavior: 'smooth',
      block: 'start',
    });
  });

  it('move focus to the section without putting it in the tab order', async () => {
    const user = userEvent.setup();
    renderSite('/');

    await user.click(navLink('Products'));

    const products = document.getElementById('products');
    await waitFor(() => expect(products).toHaveFocus());
    expect(products).toHaveAttribute('tabindex', '-1');
  });

  it('reach a home-page section from the contact route', async () => {
    const user = userEvent.setup();
    renderSite('/contact');

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      /Tell us what you are working through/i,
    );

    await user.click(navLink('About'));

    await waitFor(() => expect(url()).toBe('/#about'));
    expect(document.getElementById('about')).toHaveFocus();
  });

  it('reach a home-page section from the not-found route', async () => {
    const user = userEvent.setup();
    renderSite('/no-such-page');

    await user.click(navLink('Services'));

    await waitFor(() => expect(url()).toBe('/#services'));
    expect(document.getElementById('services')).toHaveFocus();
  });

  it('work from the footer as well as the header', async () => {
    const user = userEvent.setup();
    renderSite('/contact');

    const footer = screen.getByRole('contentinfo');
    await user.click(within(footer).getByRole('link', { name: 'Transparency' }));

    await waitFor(() => expect(url()).toBe('/#transparency'));
    expect(document.getElementById('transparency')).toHaveFocus();
  });

  it('scroll again when the section already in the address bar is chosen', async () => {
    const user = userEvent.setup();
    renderSite('/#services');

    await waitFor(() => expect(document.getElementById('services')).toHaveFocus());

    document.body.focus();
    Element.prototype.scrollIntoView.mockClear();

    await user.click(navLink('Services'));

    await waitFor(() => expect(document.getElementById('services')).toHaveFocus());
    expect(Element.prototype.scrollIntoView).toHaveBeenCalled();
  });
});

describe('direct and shared hash URLs', () => {
  it.each(['services', 'products', 'about'])('opens /#%s at that section', async (id) => {
    renderSite(`/#${id}`);

    await waitFor(() => expect(document.getElementById(id)).toHaveFocus());
    expect(Element.prototype.scrollIntoView).toHaveBeenCalled();
  });

  it('ignores a fragment that names nothing on the page', async () => {
    renderSite('/#not-a-section');

    await waitFor(() => expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument());
    expect(Element.prototype.scrollIntoView).not.toHaveBeenCalled();
  });
});

describe('browser history', () => {
  it('re-scrolls when back and forward move between sections', async () => {
    const user = userEvent.setup();
    renderSite('/');

    await user.click(navLink('Services'));
    await waitFor(() => expect(url()).toBe('/#services'));

    await user.click(navLink('Products'));
    await waitFor(() => expect(url()).toBe('/#products'));

    await user.click(screen.getByRole('button', { name: 'history back' }));
    await waitFor(() => expect(url()).toBe('/#services'));
    expect(document.getElementById('services')).toHaveFocus();

    await user.click(screen.getByRole('button', { name: 'history forward' }));
    await waitFor(() => expect(url()).toBe('/#products'));
    expect(document.getElementById('products')).toHaveFocus();
  });

  it('returns to the top of the page on a plain route change', async () => {
    const user = userEvent.setup();
    renderSite('/');

    await user.click(navLink('Contact'));

    await waitFor(() => expect(url()).toBe('/contact'));
    expect(window.scrollTo).toHaveBeenCalledWith(0, 0);
  });
});

describe('reduced motion', () => {
  it('jumps to the section instead of smooth-scrolling', async () => {
    setReducedMotion(true);
    const user = userEvent.setup();
    renderSite('/');

    await user.click(navLink('Services'));

    await waitFor(() =>
      expect(Element.prototype.scrollIntoView).toHaveBeenCalledWith({
        behavior: 'auto',
        block: 'start',
      }),
    );
  });
});

describe('mobile menu closure', () => {
  it('closes when a section is chosen', async () => {
    setViewportWidth(MOBILE_WIDTH);
    const user = userEvent.setup();
    renderSite('/');

    await user.click(screen.getByRole('button', { name: /Open main menu/i }));
    await user.click(navLink('Services'));

    await waitFor(() =>
      expect(screen.queryByRole('navigation', { name: 'Main' })).not.toBeInTheDocument(),
    );
    expect(url()).toBe('/#services');
  });

  it('closes even when the chosen section is the one already showing', async () => {
    setViewportWidth(MOBILE_WIDTH);
    const user = userEvent.setup();
    renderSite('/#services');

    await user.click(screen.getByRole('button', { name: /Open main menu/i }));
    expect(screen.getByRole('navigation', { name: 'Main' })).toBeInTheDocument();

    await user.click(navLink('Services'));

    await waitFor(() =>
      expect(screen.queryByRole('navigation', { name: 'Main' })).not.toBeInTheDocument(),
    );
  });

  it('closes when the contact route is chosen', async () => {
    setViewportWidth(MOBILE_WIDTH);
    const user = userEvent.setup();
    renderSite('/');

    await user.click(screen.getByRole('button', { name: /Open main menu/i }));
    await user.click(navLink('Contact'));

    await waitFor(() => expect(url()).toBe('/contact'));
    expect(screen.queryByRole('navigation', { name: 'Main' })).not.toBeInTheDocument();
  });
});

/* Comments in these stylesheets discuss scroll-margin and scroll-padding by
   name, so the checks below have to look at declarations, not prose. */
const withoutComments = (source) => source.replace(/\/\*[\s\S]*?\*\//g, '');

describe('sticky-header offset', () => {
  const themeCss = readFileSync('src/styles/theme.css', 'utf8');

  it('resolves to the 77px header: 76px of content plus its 1px border', () => {
    expect(themeCss).toMatch(/--header-height:\s*76px/);
    expect(themeCss).toMatch(/--header-border-width:\s*1px/);
    expect(themeCss).toMatch(
      /--scroll-offset:\s*calc\(var\(--header-height\) \+ var\(--header-border-width\)\)/,
    );
  });

  it('applies that offset exactly once, through scroll-padding on the scrollport', () => {
    const cssFiles = [
      'src/styles/theme.css',
      'src/styles/motion.css',
      'src/components/Navbar.css',
      'src/components/HeroSection.css',
      'src/components/Services.css',
      'src/components/Products.css',
      'src/components/About.css',
      'src/components/Transparency.css',
      'src/components/ClosingCta.css',
      'src/components/pages/Contact.css',
    ].map((path) => readFileSync(path, 'utf8'));

    const all = withoutComments(cssFiles.join('\n'));

    /* A scroll-margin-top on the targets would stack a second offset on top of
       the scroll-padding and expose a strip of the previous section. */
    expect(all).not.toMatch(/scroll-margin/);
    expect(all.match(/scroll-padding-top/g)).toHaveLength(1);
  });

  it('computes no offset in JavaScript either', () => {
    const nav = withoutComments(readFileSync('src/lib/sectionNavigation.js', 'utf8'));

    expect(nav).toMatch(/scrollIntoView/);
    expect(nav).not.toMatch(/scrollTo\s*\(|offsetTop|getBoundingClientRect/);
  });
});
