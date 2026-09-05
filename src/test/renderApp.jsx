import React from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import App from '../App';

/**
 * Render the whole application at a given route.
 *
 * Tests exercise the real App — router, header, page and footer together —
 * because most of what is being checked here (landmarks, a single H1, the
 * skip link's target, redirects) only exists once the pieces are assembled.
 */
export function renderApp(route = '/') {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <App />
    </MemoryRouter>,
  );
}

export default renderApp;
