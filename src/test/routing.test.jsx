import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import { renderApp } from './renderApp';

describe('sign-up compatibility redirect', () => {
  /* The previous site published a /sign-up route. Enquiries are handled on
     the contact route now, so old links must land there rather than 404. */
  it.each(['/sign-up', '/signup'])('redirects %s to the contact route', (route) => {
    renderApp(route);

    expect(
      screen.getByRole('heading', { level: 1, name: /Tell us what you are working through/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Send enquiry/i })).toBeInTheDocument();
  });
});

describe('unknown routes', () => {
  it('render a not-found page with its own single H1', () => {
    renderApp('/no-such-page');

    const headings = screen.getAllByRole('heading', { level: 1 });
    expect(headings).toHaveLength(1);
    expect(headings[0]).toHaveTextContent(/We could not find that page/i);
  });

  it('still offer a way back into the site', () => {
    renderApp('/no-such-page');

    expect(screen.getByRole('link', { name: /Go to the home page/i })).toBeInTheDocument();
  });
});
