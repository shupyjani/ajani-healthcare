import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderApp } from './renderApp';
import { AJANI_MOBILE_DEMO_ROUTE, AJANI_MOBILE_ROUTE } from '../lib/site';

/*
 * The interactive demonstration, driven the way a visitor drives it.
 *
 * These cases press the buttons rather than inspecting the reducer — the rules
 * themselves are covered in demoState.test.js. What is checked here is that
 * the interface exposes them: that the controls are reachable and named, that
 * pressing them changes what is on screen, and that the page around the phone
 * says what it should.
 */

const DISTINCTION =
  'Explore a browser-based recreation of selected Ajani Mobile journeys. '
  + 'The native iPhone application is built in SwiftUI.';

async function renderDemo() {
  const result = renderApp(AJANI_MOBILE_DEMO_ROUTE);
  await screen.findByRole('heading', { level: 1, name: 'Ajani Mobile interactive demo' });
  return result;
}

const tab = (name) => screen.getByRole('tab', { name });
const dialog = () => screen.getByRole('dialog');

/* Priya opens with two tasks outstanding, so every completion of hers meets
   the warning first. Cases about something else accept it and move on. */
async function completeThroughWarning(user, label = 'Complete with tasks outstanding') {
  await user.click(within(phone()).getByRole('button', { name: 'Complete visit' }));
  await user.click(within(dialog()).getByRole('button', { name: label }));
}
const phone = () => document.querySelector('.demo-app');

describe('the demo route', () => {
  it('renders at /products/ajani-mobile/demo', async () => {
    await renderDemo();

    expect(screen.getByRole('main')).toHaveAttribute('id', 'main-content');
    expect(screen.getByRole('banner')).toBeInTheDocument();
    expect(screen.getByRole('contentinfo')).toBeInTheDocument();
  });

  it('has exactly one H1 and a contiguous heading hierarchy', async () => {
    await renderDemo();

    const levels = screen
      .getAllByRole('heading')
      .filter((heading) => heading.closest('main'))
      .map((heading) => Number(heading.tagName.slice(1)));

    expect(levels.filter((level) => level === 1)).toHaveLength(1);
    expect(levels[0]).toBe(1);
    for (const [index, level] of levels.entries()) {
      if (index === 0) continue;
      expect(level - levels[index - 1]).toBeLessThanOrEqual(1);
    }
  });

  it('sets its own document title', async () => {
    await renderDemo();
    expect(document.title).toBe('Ajani Mobile interactive demo | Ajani Healthcare');
  });

  it('lets the skip link reach the demo main content', async () => {
    const user = userEvent.setup();
    await renderDemo();

    await user.click(screen.getByRole('link', { name: /Skip to main content/i }));
    expect(screen.getByRole('main')).toHaveFocus();
  });

  it('states the browser/native distinction exactly once', async () => {
    await renderDemo();

    expect(screen.getAllByText(DISTINCTION)).toHaveLength(1);

    /* One sentence, and no second explanation dressed up as a caveat. */
    const main = screen.getByRole('main');
    expect(main).not.toHaveTextContent(/not the real app|simulation|prototype|mock|placeholder/i);
    expect(main).not.toHaveTextContent(/App Store|TestFlight|coming soon|unfinished/i);
  });

  it('uses no screenshot for the interactive interface', async () => {
    const { container } = await renderDemo();

    expect(container.querySelectorAll('img')).toHaveLength(0);
    expect(container.innerHTML).not.toMatch(/ajani-mobile-(today|visits|visit-detail|more)/i);
  });
});

describe('reaching the demo', () => {
  it('is offered from the case study as its primary action', async () => {
    renderApp(AJANI_MOBILE_ROUTE);
    await screen.findByRole('heading', { level: 1, name: 'Ajani Mobile' });

    const [cta] = screen.getAllByRole('link', { name: 'Try the interactive demo' });
    expect(cta).toHaveAttribute('href', AJANI_MOBILE_DEMO_ROUTE);
    expect(cta).toHaveClass('btn--primary');

    /* The repository stays available, as the secondary external action. */
    const [repo] = screen.getAllByRole('link', { name: /View native repository/i });
    expect(repo).toHaveClass('btn--outline');
    expect(repo).toHaveAttribute('target', '_blank');
  });

  it('keeps the case study reachable from the demo', async () => {
    await renderDemo();

    expect(screen.getByRole('link', { name: /Back to the case study/i })).toHaveAttribute(
      'href',
      AJANI_MOBILE_ROUTE,
    );
  });

  it('is not linked from the home page: the teaser still goes to the case study', () => {
    renderApp('/');

    const teaser = document.querySelector('.ajani-mobile-teaser');
    expect(within(teaser).getByRole('link', { name: 'Explore Ajani Mobile' })).toHaveAttribute(
      'href',
      AJANI_MOBILE_ROUTE,
    );
    expect(document.body).not.toHaveTextContent(/Try the interactive demo/i);
    expect(document.querySelectorAll(`a[href="${AJANI_MOBILE_DEMO_ROUTE}"]`)).toHaveLength(0);
  });
});

describe('Today', () => {
  it('opens on 2 of 7 complete, with Priya Raman in hand', async () => {
    await renderDemo();

    expect(within(phone()).getByText('2 of 7 visits complete · 5 remaining')).toBeInTheDocument();
    expect(within(phone()).getByRole('progressbar')).toHaveAttribute('aria-valuenow', '2');

    const current = within(phone()).getByRole('heading', { name: 'Priya Raman', level: 4 });
    expect(current).toBeInTheDocument();
    expect(within(phone()).getByText('In progress')).toBeInTheDocument();
  });

  it('lists the whole round in time order', async () => {
    await renderDemo();

    const rows = within(phone()).getAllByRole('button', { name: /Marguerite|Desmond|Priya|Ivor|Halina|Terrence|Sunita/ });
    expect(rows).toHaveLength(7);
    expect(rows[0]).toHaveTextContent('Marguerite Okonjo');
    expect(rows[6]).toHaveTextContent('Sunita Kaur');
  });

  it('moves progress and the next visit on as soon as one completes', async () => {
    const user = userEvent.setup();
    await renderDemo();

    await completeThroughWarning(user);

    expect(within(phone()).getByText('3 of 7 visits complete · 4 remaining')).toBeInTheDocument();
    expect(within(phone()).getByRole('progressbar')).toHaveAttribute('aria-valuenow', '3');

    /* The card now offers the next visit, which is planned rather than started. */
    expect(within(phone()).getByRole('heading', { name: 'Ivor Bankole', level: 4 })).toBeInTheDocument();
    expect(within(phone()).getByText('Next visit')).toBeInTheDocument();
  });
});

describe('the status sequence through the interface', () => {
  it('offers only the next step, never a skip or a reversal', async () => {
    const user = userEvent.setup();
    await renderDemo();

    /* Priya is active, and only one visit may be. Finish her first, or Ivor
       cannot legally start. */
    await completeThroughWarning(user);

    await user.click(tab('Visits'));
    await user.click(within(phone()).getByRole('button', { name: /Ivor Bankole/ }));

    /* Planned: the only action is to start travelling. */
    expect(within(phone()).getByRole('button', { name: 'Start travelling' })).toBeInTheDocument();
    expect(within(phone()).queryByRole('button', { name: 'Complete visit' })).toBeNull();
    expect(within(phone()).queryByRole('button', { name: 'Mark as arrived' })).toBeNull();

    await user.click(within(phone()).getByRole('button', { name: 'Start travelling' }));
    expect(within(phone()).getByRole('button', { name: 'Mark as arrived' })).toBeInTheDocument();
    expect(within(phone()).queryByRole('button', { name: 'Start travelling' })).toBeNull();

    await user.click(within(phone()).getByRole('button', { name: 'Mark as arrived' }));
    expect(within(phone()).getByRole('button', { name: 'Complete visit' })).toBeInTheDocument();

    await user.click(within(phone()).getByRole('button', { name: 'Complete visit' }));
    await user.click(
      within(dialog()).getByRole('button', { name: 'Complete with tasks outstanding' }),
    );

    /* Completed is terminal: no control remains to change it. */
    expect(within(phone()).queryByRole('button', { name: /Start travelling|Mark as arrived|Complete visit/ })).toBeNull();
    expect(within(phone()).getByText(/status cannot be changed again/i)).toBeInTheDocument();
  });
});

describe('Visits', () => {
  async function openVisits(user) {
    await user.click(tab('Visits'));
  }

  it('gives the search field an accessible name', async () => {
    const user = userEvent.setup();
    await renderDemo();
    await openVisits(user);

    expect(
      within(phone()).getByRole('searchbox', { name: /Search visits by name, visit reference or address/i }),
    ).toBeInTheDocument();
  });

  it('searches by name, reference and address', async () => {
    const user = userEvent.setup();
    await renderDemo();
    await openVisits(user);

    const field = within(phone()).getByRole('searchbox');

    await user.type(field, 'Bramble');
    expect(within(phone()).getByText('Showing 1 of 7 visits')).toBeInTheDocument();
    expect(within(phone()).getByRole('button', { name: /Marguerite Okonjo/ })).toBeInTheDocument();

    await user.clear(field);
    await user.type(field, 'AV-1044');
    expect(within(phone()).getByRole('button', { name: /Ivor Bankole/ })).toBeInTheDocument();
  });

  it('shows a genuine empty state when nothing matches', async () => {
    const user = userEvent.setup();
    await renderDemo();
    await openVisits(user);

    await user.type(within(phone()).getByRole('searchbox'), 'zzzzz');

    expect(within(phone()).getByText('No visits match this search')).toBeInTheDocument();
    expect(within(phone()).getByText('Nothing to show')).toBeInTheDocument();
    expect(within(phone()).queryByRole('button', { name: /Priya Raman/ })).toBeNull();
  });

  it('offers all four filters, one selected at a time, with an accurate count', async () => {
    const user = userEvent.setup();
    await renderDemo();
    await openVisits(user);

    const group = within(phone()).getByRole('radiogroup', { name: /Filter visits by status/i });
    expect(within(group).getAllByRole('radio')).toHaveLength(4);
    expect(within(group).getByRole('radio', { name: 'All' })).toBeChecked();

    await user.click(within(group).getByRole('radio', { name: 'Completed' }));
    expect(within(group).getByRole('radio', { name: 'Completed' })).toBeChecked();
    expect(within(group).getByRole('radio', { name: 'All' })).not.toBeChecked();
    expect(within(phone()).getByText('Showing 2 of 7 visits')).toBeInTheDocument();

    await user.click(within(group).getByRole('radio', { name: 'In progress' }));
    expect(within(phone()).getByText('Showing 1 of 7 visits')).toBeInTheDocument();

    await user.click(within(group).getByRole('radio', { name: 'Planned' }));
    expect(within(phone()).getByText('Showing 4 of 7 visits')).toBeInTheDocument();

    await user.click(within(group).getByRole('radio', { name: 'All' }));
    expect(within(phone()).getByText('Showing all 7 visits')).toBeInTheDocument();
  });

  it('opens a visit into its detail inside the phone', async () => {
    const user = userEvent.setup();
    await renderDemo();
    await openVisits(user);

    await user.click(within(phone()).getByRole('button', { name: /Priya Raman/ }));

    expect(within(phone()).getByText('AV-1043')).toBeInTheDocument();
    expect(within(phone()).getByText('Operational notes')).toBeInTheDocument();
    /* Still inside the simulated app, not a new page. */
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
  });
});

describe('visit detail', () => {
  async function openPriya(user) {
    await user.click(within(phone()).getByRole('button', { name: 'Open visit' }));
  }

  it('shows the reference, times, travel, location and notes', async () => {
    const user = userEvent.setup();
    await renderDemo();
    await openPriya(user);

    expect(within(phone()).getByText('AV-1043')).toBeInTheDocument();
    expect(within(phone()).getByText('9:40–10:40 · 1 hr')).toBeInTheDocument();
    expect(within(phone()).getByText(/15 min from the previous call/)).toBeInTheDocument();
    expect(within(phone()).getByText(/21 Halesmere Gardens/)).toBeInTheDocument();
    expect(within(phone()).getByText(/escalate any new pain to the duty line/i)).toBeInTheDocument();
  });

  it('has a working task checklist that keeps its count', async () => {
    const user = userEvent.setup();
    await renderDemo();
    await openPriya(user);

    expect(within(phone()).getByText('1 of 3 done')).toBeInTheDocument();

    const task = within(phone()).getByRole('checkbox', { name: 'Check wound dressing' });
    expect(task).not.toBeChecked();

    await user.click(task);
    expect(task).toBeChecked();
    expect(within(phone()).getByText('2 of 3 done')).toBeInTheDocument();

    await user.click(task);
    expect(within(phone()).getByText('1 of 3 done')).toBeInTheDocument();
  });

  it('returns to the previous screen and restores focus to the row it came from', async () => {
    const user = userEvent.setup();
    await renderDemo();

    await user.click(tab('Visits'));
    const row = within(phone()).getByRole('button', { name: /Terrence Boakye/ });
    await user.click(row);

    expect(within(phone()).getByText('AV-1046')).toBeInTheDocument();

    await user.click(within(phone()).getByRole('button', { name: /Back to the visit list/i }));

    expect(within(phone()).getByRole('searchbox')).toBeInTheDocument();
    expect(within(phone()).getByRole('button', { name: /Terrence Boakye/ })).toHaveFocus();
  });

  it('updates Today and the overall progress when a visit is completed from detail', async () => {
    const user = userEvent.setup();
    await renderDemo();
    await openPriya(user);

    await user.click(within(phone()).getByRole('button', { name: 'Complete visit' }));
    await user.click(
      within(dialog()).getByRole('button', { name: 'Complete with tasks outstanding' }),
    );
    await user.click(within(phone()).getByRole('button', { name: /Back to the visit list/i }));

    expect(within(phone()).getByText('3 of 7 visits complete · 4 remaining')).toBeInTheDocument();

    await user.click(tab('Visits'));
    await user.click(within(phone()).getByRole('radio', { name: 'Completed' }));
    expect(within(phone()).getByText('Showing 3 of 7 visits')).toBeInTheDocument();
  });
});

describe('More', () => {
  async function openMore(user) {
    await user.click(tab('More'));
  }

  it('shows the practitioner profile and the application name', async () => {
    const user = userEvent.setup();
    await renderDemo();
    await openMore(user);

    expect(within(phone()).getByRole('heading', { name: 'Naomi Adeyemi' })).toBeInTheDocument();
    expect(within(phone()).getByText('Southside field team')).toBeInTheDocument();
    expect(within(phone()).getByText('FT-2291')).toBeInTheDocument();
    expect(within(phone()).getByText('Ajani Mobile')).toBeInTheDocument();
  });

  it('genuinely hides completed visits from Today when the preference is turned off', async () => {
    const user = userEvent.setup();
    await renderDemo();
    await openMore(user);

    const preference = within(phone()).getByRole('checkbox', {
      name: 'Show completed visits on Today',
    });
    expect(preference).toBeChecked();
    await user.click(preference);

    await user.click(tab('Today'));
    expect(within(phone()).queryByRole('button', { name: /Marguerite Okonjo/ })).toBeNull();
    expect(within(phone()).getByRole('button', { name: /Priya Raman/ })).toBeInTheDocument();

    /* And the Visits screen still holds the full round. */
    await user.click(tab('Visits'));
    expect(within(phone()).getByText('Showing all 7 visits')).toBeInTheDocument();
  });

  it('genuinely asks before completing when that preference is turned on', async () => {
    const user = userEvent.setup();
    await renderDemo();
    await openMore(user);

    await user.click(
      within(phone()).getByRole('checkbox', { name: 'Confirm before completing a visit' }),
    );

    /* Every task ticked, so the plain confirmation is the one that applies. */
    await user.click(tab('Today'));
    await user.click(within(phone()).getByRole('button', { name: 'Open visit' }));
    await user.click(within(phone()).getByRole('checkbox', { name: 'Check wound dressing' }));
    await user.click(
      within(phone()).getByRole('checkbox', { name: 'Confirm follow-up appointment is diarised' }),
    );
    await user.click(within(phone()).getByRole('button', { name: /Back to the visit list/i }));

    await user.click(within(phone()).getByRole('button', { name: 'Complete visit' }));

    expect(dialog()).toHaveAccessibleName('Complete this visit?');
    expect(dialog()).toHaveAttribute('aria-modal', 'true');
    /* Nothing has changed while the question stands. */
    expect(within(phone()).getByText('2 of 7 visits complete · 5 remaining')).toBeInTheDocument();

    await user.click(within(dialog()).getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(within(phone()).getByText('2 of 7 visits complete · 5 remaining')).toBeInTheDocument();

    await user.click(within(phone()).getByRole('button', { name: 'Complete visit' }));
    await user.click(within(dialog()).getByRole('button', { name: 'Complete visit' }));
    expect(within(phone()).getByText('3 of 7 visits complete · 4 remaining')).toBeInTheDocument();
  });

  it('closes the confirmation on Escape without completing', async () => {
    const user = userEvent.setup();
    await renderDemo();
    await openMore(user);

    await user.click(
      within(phone()).getByRole('checkbox', { name: 'Confirm before completing a visit' }),
    );
    await user.click(tab('Today'));
    await user.click(within(phone()).getByRole('button', { name: 'Complete visit' }));

    await user.keyboard('{Escape}');

    expect(screen.queryByRole('dialog')).toBeNull();
    expect(within(phone()).getByText('2 of 7 visits complete · 5 remaining')).toBeInTheDocument();
  });
});

describe('the tab bar', () => {
  it('exposes which section is selected', async () => {
    const user = userEvent.setup();
    await renderDemo();

    expect(tab('Today')).toHaveAttribute('aria-selected', 'true');
    expect(tab('Visits')).toHaveAttribute('aria-selected', 'false');

    await user.click(tab('Visits'));
    expect(tab('Visits')).toHaveAttribute('aria-selected', 'true');
    expect(tab('Today')).toHaveAttribute('aria-selected', 'false');
  });

  it('points every tab at the panel it governs', async () => {
    await renderDemo();

    const panel = screen.getByRole('tabpanel');
    for (const name of ['Today', 'Visits', 'More']) {
      expect(tab(name)).toHaveAttribute('aria-controls', panel.id);
    }
    expect(panel).toHaveAttribute('aria-labelledby', 'demo-tab-today');
  });

  it('moves between tabs with the arrow keys', async () => {
    const user = userEvent.setup();
    await renderDemo();

    tab('Today').focus();
    await user.keyboard('{ArrowRight}');
    expect(tab('Visits')).toHaveAttribute('aria-selected', 'true');

    await user.keyboard('{ArrowRight}');
    expect(tab('More')).toHaveAttribute('aria-selected', 'true');

    /* Wraps rather than dead-ending. */
    await user.keyboard('{ArrowRight}');
    expect(tab('Today')).toHaveAttribute('aria-selected', 'true');
  });
});

describe('Reset demo', () => {
  it('restores every part of the demo and announces that it did', async () => {
    const user = userEvent.setup();
    await renderDemo();

    /* Disturb as much as possible first. */
    await completeThroughWarning(user);
    await user.click(tab('More'));
    await user.click(
      within(phone()).getByRole('checkbox', { name: 'Show completed visits on Today' }),
    );
    await user.click(tab('Visits'));
    await user.type(within(phone()).getByRole('searchbox'), 'priya');
    await user.click(within(phone()).getByRole('radio', { name: 'Completed' }));

    await user.click(screen.getByRole('button', { name: 'Reset demo' }));

    expect(tab('Today')).toHaveAttribute('aria-selected', 'true');
    expect(within(phone()).getByText('2 of 7 visits complete · 5 remaining')).toBeInTheDocument();
    expect(within(phone()).getByRole('heading', { name: 'Priya Raman', level: 4 })).toBeInTheDocument();

    await user.click(tab('Visits'));
    expect(within(phone()).getByRole('searchbox')).toHaveValue('');
    expect(within(phone()).getByRole('radio', { name: 'All' })).toBeChecked();
    expect(within(phone()).getByText('Showing all 7 visits')).toBeInTheDocument();

    await user.click(tab('More'));
    expect(
      within(phone()).getByRole('checkbox', { name: 'Show completed visits on Today' }),
    ).toBeChecked();
  });

  it('announces the restored state through a live region', async () => {
    const user = userEvent.setup();
    await renderDemo();

    const status = document.querySelector('.demo-reset-status');
    expect(status).toHaveAttribute('role', 'status');
    expect(status).toHaveTextContent('');

    await user.click(screen.getByRole('button', { name: 'Reset demo' }));
    expect(status).toHaveTextContent('Demo reset. 2 of 7 visits complete, Today selected.');
  });

  it('sits outside the phone, above the simulated interface', async () => {
    await renderDemo();

    const reset = screen.getByRole('button', { name: 'Reset demo' });
    expect(reset.closest('.demo-app')).toBeNull();
    expect(reset.closest('.demo-companion')).not.toBeNull();
  });
});

describe('the phone hardware stays out of the way', () => {
  it('hides the decorative frame from assistive technology', async () => {
    await renderDemo();

    for (const part of phone().querySelectorAll('.phone-frame-button, .phone-frame-island, .phone-frame-indicator')) {
      expect(part).toHaveAttribute('aria-hidden', 'true');
    }
  });

  it('does not collapse the app into one accessibility element', async () => {
    await renderDemo();

    /* The phone is not a single image, button or labelled group: its contents
       are individually reachable. */
    expect(phone().querySelector('[role="img"]')).toBeNull();
    expect(screen.getAllByRole('tab')).toHaveLength(3);
    expect(within(phone()).getAllByRole('button').length).toBeGreaterThan(5);
  });

  it('draws focus rings inside the scrolling screen so they cannot be clipped', () => {
    const css = readFileSync('src/components/demo/DemoPhone.css', 'utf8');
    const rule = /\.demo-app :focus-visible\s*\{([^}]*)\}/.exec(css);

    expect(rule).not.toBeNull();
    expect(rule[1]).toMatch(/outline:\s*3px solid/);
    /* Negative offset: the ring is drawn within the control, so a scrolling
       ancestor cannot cut it off. */
    expect(rule[1]).toMatch(/outline-offset:\s*-3px/);
  });
});

describe('the demo stylesheets keep the site rules', () => {
  const sheets = [
    'src/components/demo/DemoPhone.css',
    'src/components/pages/AjaniMobileDemo.css',
  ].map((path) => [path, readFileSync(path, 'utf8')]);

  it('run no continuous animation', () => {
    for (const [path, css] of sheets) {
      expect(`${path}: ${/infinite|@keyframes/.test(css)}`).toBe(`${path}: false`);
    }
  });

  it('transition no layout property', () => {
    for (const [path, css] of sheets) {
      for (const declaration of css.match(/transition:[^;]+;/g) ?? []) {
        expect(`${path}: ${declaration}`).not.toMatch(
          /height|width|margin|padding|top|bottom|left|right/,
        );
      }
    }
  });

  it('follow the system appearance rather than forcing one', () => {
    const [, phoneCss] = sheets[0];
    expect(phoneCss).toMatch(/@media \(prefers-color-scheme: dark\)/);
    expect(phoneCss).toMatch(/@media \(prefers-reduced-motion: reduce\)/);
  });
});

describe('the demo does not reach outside itself', () => {
  it('adds no dependency and no image asset', () => {
    const pkg = JSON.parse(readFileSync('package.json', 'utf8'));

    expect(Object.keys(pkg.dependencies).sort()).toEqual([
      '@emailjs/browser',
      'react',
      'react-dom',
      'react-router-dom',
    ]);

    const sources = [
      'src/components/demo/DemoPhone.jsx',
      'src/components/demo/TodayScreen.jsx',
      'src/components/demo/VisitsScreen.jsx',
      'src/components/demo/VisitDetailScreen.jsx',
      'src/components/demo/MoreScreen.jsx',
      'src/components/pages/AjaniMobileDemo.jsx',
      'src/lib/demoState.js',
      'src/lib/demoVisits.js',
    ];

    for (const path of sources) {
      const source = readFileSync(path, 'utf8');
      /* In memory only: no storage, no request, no service. */
      expect(`${path}: ${/fetch\(|XMLHttpRequest|localStorage|sessionStorage|indexedDB/.test(source)}`)
        .toBe(`${path}: false`);
      expect(`${path}: ${/\.(png|jpe?g|webp|gif|svg)['"]/.test(source)}`).toBe(`${path}: false`);
    }
  });
});

describe('the interaction cue', () => {
  it('appears once, above the workspace and outside the phone column', async () => {
    await renderDemo();

    const cue = document.querySelector('.demo-cue');
    expect(cue).toBeInTheDocument();
    expect(document.querySelectorAll('.demo-cue')).toHaveLength(1);

    expect(screen.getAllByText('Interactive preview')).toHaveLength(1);
    expect(
      screen.getAllByText('Use the controls inside the phone to explore the round.'),
    ).toHaveLength(1);

    /*
     * Structural, not pixel. The cue is a sibling of the phone and the card
     * inside the workspace grid, never a child of the phone's column — if it
     * were, the phone would start below it instead of level with it.
     */
    const workspace = document.querySelector('.demo-layout');
    const stage = document.querySelector('.demo-stage');
    const companion = document.querySelector('.demo-companion');

    expect(cue.closest('.demo-stage')).toBeNull();
    expect(cue.parentElement).toBe(workspace);
    expect(stage.parentElement).toBe(workspace);
    expect(companion.parentElement).toBe(workspace);

    /* The phone's column holds the phone and nothing else, which is what lets
       it span both rows and set the workspace's height. */
    expect(stage.children).toHaveLength(1);
    expect(stage.firstElementChild).toBe(phone());

    /* Source order is the stacked order: cue, phone, card. No CSS `order`
       is needed to produce it, so it cannot drift from the reading order. */
    expect([...workspace.children]).toEqual([cue, stage, companion]);
  });

  it('is the heading for the region the phone sits in', async () => {
    await renderDemo();

    const heading = screen.getByRole('heading', { name: 'Interactive preview' });
    expect(heading.tagName).toBe('H2');
    expect(heading.closest('.demo-cue')).not.toBeNull();

    /* A peer of the companion's own heading, both under the page h1. */
    expect(screen.getByRole('heading', { name: 'Journeys to try' }).tagName).toBe('H2');
  });

  it('makes sense without pointing at a position on the page', async () => {
    await renderDemo();

    const cue = document.querySelector('.demo-cue');
    /* It sits above the workspace now, so any "on the right" phrasing would
       be wrong on a narrow screen and wrong here too. */
    expect(cue).not.toHaveTextContent(/on the right|below|opposite|beside/i);
  });

  it('is labelling, not instruction, and repeats nothing inside the phone', async () => {
    await renderDemo();

    const cue = document.querySelector('.demo-cue');
    expect(cue).not.toHaveTextContent(/please/i);
    expect(cue.querySelectorAll('a, button, input')).toHaveLength(0);

    /* One heading — the region label — and nothing that looks like a card:
       no border, no panel, no nested sections. */
    expect(cue.querySelectorAll('h1, h2, h3, h4, h5, h6')).toHaveLength(1);
    expect(cue.querySelectorAll('section, aside, ul, ol')).toHaveLength(0);

    /* The cue lives outside the simulated application. */
    expect(phone()).not.toHaveTextContent(/Interactive preview/);
    expect(phone()).not.toHaveTextContent(/explore the round/);
  });
});

describe('completing with tasks outstanding, through the interface', () => {
  it('warns with the outstanding count rather than completing', async () => {
    const user = userEvent.setup();
    await renderDemo();

    await user.click(within(phone()).getByRole('button', { name: 'Complete visit' }));

    expect(dialog()).toHaveAccessibleName('2 tasks are still outstanding');
    expect(dialog()).toHaveAttribute('aria-modal', 'true');
    expect(within(dialog()).getByRole('button', { name: 'Review tasks' })).toBeInTheDocument();
    expect(
      within(dialog()).getByRole('button', { name: 'Complete with tasks outstanding' }),
    ).toBeInTheDocument();

    /* Nothing has moved while the question stands. */
    expect(within(phone()).getByText('2 of 7 visits complete · 5 remaining')).toBeInTheDocument();
  });

  it('uses singular wording when one task remains', async () => {
    const user = userEvent.setup();
    await renderDemo();

    await user.click(within(phone()).getByRole('button', { name: 'Open visit' }));
    await user.click(within(phone()).getByRole('checkbox', { name: 'Check wound dressing' }));
    await user.click(within(phone()).getByRole('button', { name: 'Complete visit' }));

    expect(dialog()).toHaveAccessibleName('1 task is still outstanding');
    expect(dialog()).toHaveTextContent(/with that task outstanding/i);
    expect(
      within(dialog()).getByRole('button', { name: 'Complete with task outstanding' }),
    ).toBeInTheDocument();
  });

  it('opens the checklist from Today when Review tasks is pressed', async () => {
    const user = userEvent.setup();
    await renderDemo();

    await user.click(within(phone()).getByRole('button', { name: 'Complete visit' }));
    await user.click(within(dialog()).getByRole('button', { name: 'Review tasks' }));

    expect(screen.queryByRole('dialog')).toBeNull();
    /* On Priya's detail, at her checklist. */
    expect(within(phone()).getByText('AV-1043')).toBeInTheDocument();
    expect(within(phone()).getByText('1 of 3 done')).toBeInTheDocument();
    expect(within(phone()).getByRole('checkbox', { name: 'Check wound dressing' })).toBeInTheDocument();
  });

  it('stays on the checklist and returns focus to the action when reviewed from detail', async () => {
    const user = userEvent.setup();
    await renderDemo();

    await user.click(within(phone()).getByRole('button', { name: 'Open visit' }));
    const action = within(phone()).getByRole('button', { name: 'Complete visit' });
    await user.click(action);
    await user.click(within(dialog()).getByRole('button', { name: 'Review tasks' }));

    expect(screen.queryByRole('dialog')).toBeNull();
    expect(within(phone()).getByText('1 of 3 done')).toBeInTheDocument();
    expect(within(phone()).getByRole('button', { name: 'Complete visit' })).toHaveFocus();
  });

  it('completes when the visitor accepts, leaving the tasks as they were', async () => {
    const user = userEvent.setup();
    await renderDemo();

    await completeThroughWarning(user);

    expect(within(phone()).getByText('3 of 7 visits complete · 4 remaining')).toBeInTheDocument();

    await user.click(tab('Visits'));
    await user.click(within(phone()).getByRole('button', { name: /Priya Raman/ }));
    /* A declined task is legitimate: it is not silently ticked. */
    expect(within(phone()).getByText('1 of 3 done')).toBeInTheDocument();
  });

  it('changes nothing when the warning is dismissed with Escape', async () => {
    const user = userEvent.setup();
    await renderDemo();

    await user.click(within(phone()).getByRole('button', { name: 'Complete visit' }));
    await user.keyboard('{Escape}');

    expect(screen.queryByRole('dialog')).toBeNull();
    /* Escape backs out entirely — it does not open the checklist. */
    expect(within(phone()).getByText('2 of 7 visits complete · 5 remaining')).toBeInTheDocument();
    expect(within(phone()).getByRole('heading', { name: 'Priya Raman', level: 4 })).toBeInTheDocument();
  });

  it('asks once, not twice, when the confirmation preference is also on', async () => {
    const user = userEvent.setup();
    await renderDemo();

    await user.click(tab('More'));
    await user.click(
      within(phone()).getByRole('checkbox', { name: 'Confirm before completing a visit' }),
    );
    await user.click(tab('Today'));
    await user.click(within(phone()).getByRole('button', { name: 'Complete visit' }));

    expect(dialog()).toHaveAccessibleName('2 tasks are still outstanding');

    await user.click(
      within(dialog()).getByRole('button', { name: 'Complete with tasks outstanding' }),
    );

    /* One question, one completion — no second dialog behind the first. */
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(within(phone()).getByText('3 of 7 visits complete · 4 remaining')).toBeInTheDocument();
  });
});

describe('only one visit may be active', () => {
  async function tryToStartIvor(user) {
    await user.click(tab('Visits'));
    await user.click(within(phone()).getByRole('button', { name: /Ivor Bankole/ }));
    await user.click(within(phone()).getByRole('button', { name: 'Start travelling' }));
  }

  it('blocks a second visit and names the one already active', async () => {
    const user = userEvent.setup();
    await renderDemo();
    await tryToStartIvor(user);

    expect(dialog()).toHaveAccessibleName('Priya Raman is still active');
    expect(dialog()).toHaveTextContent(/Only one visit can be active at a time/i);
    expect(dialog()).toHaveTextContent(/Ivor Bankole/);

    expect(within(dialog()).getByRole('button', { name: 'Open active visit' })).toBeInTheDocument();
    expect(within(dialog()).getByRole('button', { name: 'Stay here' })).toBeInTheDocument();
  });

  it('leaves both visits exactly as they were', async () => {
    const user = userEvent.setup();
    await renderDemo();
    await tryToStartIvor(user);

    await user.click(within(dialog()).getByRole('button', { name: 'Stay here' }));

    /* Ivor is still planned: the only action open to him is to start. */
    expect(within(phone()).getByRole('button', { name: 'Start travelling' })).toBeInTheDocument();

    /* And Priya has not been completed, paused or replaced. */
    await user.click(within(phone()).getByRole('button', { name: /Back to the visit list/i }));
    await user.click(tab('Today'));
    expect(within(phone()).getByText('2 of 7 visits complete · 5 remaining')).toBeInTheDocument();
    expect(within(phone()).getByRole('heading', { name: 'Priya Raman', level: 4 })).toBeInTheDocument();
    expect(within(phone()).getByText('In progress')).toBeInTheDocument();
  });

  it('opens the active visit on request', async () => {
    const user = userEvent.setup();
    await renderDemo();
    await tryToStartIvor(user);

    await user.click(within(dialog()).getByRole('button', { name: 'Open active visit' }));

    expect(screen.queryByRole('dialog')).toBeNull();
    expect(within(phone()).getByText('AV-1043')).toBeInTheDocument();
  });

  it('blocks the same way from Today, not only from the visit list', async () => {
    const user = userEvent.setup();
    await renderDemo();

    /* Today's schedule reaches every visit, so the rule has to hold there too. */
    await user.click(within(phone()).getAllByRole('button', { name: /Ivor Bankole/ })[0]);
    await user.click(within(phone()).getByRole('button', { name: 'Start travelling' }));

    expect(dialog()).toHaveAccessibleName('Priya Raman is still active');
  });

  it('changes nothing when the block is dismissed with Escape', async () => {
    const user = userEvent.setup();
    await renderDemo();
    await tryToStartIvor(user);

    await user.keyboard('{Escape}');

    expect(screen.queryByRole('dialog')).toBeNull();
    expect(within(phone()).getByRole('button', { name: 'Start travelling' })).toBeInTheDocument();
  });

  it('releases the next visit once the active one is completed', async () => {
    const user = userEvent.setup();
    await renderDemo();

    await completeThroughWarning(user);

    await user.click(tab('Visits'));
    await user.click(within(phone()).getByRole('button', { name: /Ivor Bankole/ }));
    await user.click(within(phone()).getByRole('button', { name: 'Start travelling' }));

    /* No dialog this time: the round is free. */
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(within(phone()).getByRole('button', { name: 'Mark as arrived' })).toBeInTheDocument();
  });

  it('restores the single active visit on reset', async () => {
    const user = userEvent.setup();
    await renderDemo();

    await completeThroughWarning(user);
    await user.click(tab('Visits'));
    await user.click(within(phone()).getByRole('button', { name: /Ivor Bankole/ }));
    await user.click(within(phone()).getByRole('button', { name: 'Start travelling' }));

    await user.click(screen.getByRole('button', { name: 'Reset demo' }));

    expect(within(phone()).getByText('2 of 7 visits complete · 5 remaining')).toBeInTheDocument();
    expect(within(phone()).getByRole('heading', { name: 'Priya Raman', level: 4 })).toBeInTheDocument();
    expect(within(phone()).getByText('In progress')).toBeInTheDocument();
  });
});

describe('the desktop phone is capped by the viewport height', () => {
  const demoCss = readFileSync('src/components/pages/AjaniMobileDemo.css', 'utf8');

  it('derives the width from the height that is actually available', () => {
    const block = demoCss.slice(demoCss.indexOf('@media screen and (min-width: 901px)'));

    /* The frame's height follows its width through the screen's aspect ratio,
       so capping the width by the free height is what keeps the bottom of the
       device on screen. */
    expect(block).toMatch(/--demo-phone-width:\s*clamp\(/);
    expect(block).toMatch(/100dvh|100vh/);
    /* The sticky header this site already measures once. */
    expect(block).toMatch(/var\(--scroll-offset\)/);
    expect(block).toMatch(/941\s*\/\s*2048/);
  });

  it('scales without a transform, at any zoom', () => {
    expect(demoCss).not.toMatch(/transform:\s*scale/);
    expect(demoCss).not.toMatch(/zoom:/);
  });

  it('declares each workspace element exactly once', () => {
    /* The placement and the styling for each element belong in one rule. Two
       rules for the same selector is how a custom property quietly stops
       taking effect. */
    for (const selector of ['.demo-cue', '.demo-stage', '.demo-companion']) {
      const rules = demoCss.match(new RegExp(`^\\${selector}\\s*\\{`, 'gm')) ?? [];
      expect(`${selector}: ${rules.length}`).toBe(`${selector}: 1`);
    }
  });

  it('spans the phone across both rows so the columns align', () => {
    const layoutRule = /\.demo-layout\s*\{([^}]*)\}/.exec(demoCss);
    const stageRule = /\.demo-stage\s*\{([^}]*)\}/.exec(demoCss);

    /* Two rows, the second taking the slack; the phone spanning both is what
       makes its height the workspace's height. */
    expect(layoutRule[1]).toMatch(/grid-template-rows:\s*auto 1fr/);
    expect(stageRule[1]).toMatch(/grid-row:\s*1\s*\/\s*span 2/);
    /* Start-aligned, so the frame keeps its aspect-ratio height. */
    expect(stageRule[1]).toMatch(/align-self:\s*start/);

    /*
     * Nothing is faked into position: no absolute placement, no transform, and
     * no minimum height on any of the three workspace elements — the phone's
     * own height is what drives the rows. (The live region elsewhere on the
     * page reserves a line so it cannot jump; that is not part of this
     * alignment and is left alone.)
     */
    expect(demoCss).not.toMatch(/position:\s*absolute/);
    expect(demoCss).not.toMatch(/transform:/);

    const companionRule = /\.demo-companion\s*\{([^}]*)\}/.exec(demoCss);
    for (const rule of [layoutRule[1], stageRule[1], companionRule[1]]) {
      expect(rule).not.toMatch(/min-height|height:\s*[0-9]/);
    }
  });

  it('keeps the phone width on the stage, and the cue independent of it', () => {
    const stageRule = /\.demo-stage\s*\{([^}]*)\}/.exec(demoCss);
    const appRule = /\.demo-stage \.demo-app\s*\{([^}]*)\}/.exec(demoCss);
    const cueRule = /\.demo-cue\s*\{([^}]*)\}/.exec(demoCss);

    /* The stage still owns the value the frame reads. */
    expect(stageRule[1]).toMatch(/--demo-phone-width:/);
    expect(appRule[1]).toMatch(/--phone-width:\s*var\(--demo-phone-width/);

    /* The cue is no longer a sibling of the phone and must not depend on a
       property it can no longer inherit. */
    expect(cueRule[1]).not.toMatch(/--demo-phone-width/);
    expect(cueRule[1]).not.toMatch(/--phone-width/);

    /* And no percentage width in the stage's auto grid track, which is what
       collapsed the phone to its bezel before. */
    expect(stageRule[1]).not.toMatch(/(?<!max-|min-)width:\s*100%/);
  });
});

describe('returning an en route visit to Planned', () => {
  /* Free the round, start Ivor, and open him. */
  async function ivorEnRouteDetail(user) {
    await completeThroughWarning(user);
    await user.click(tab('Visits'));
    await user.click(within(phone()).getByRole('button', { name: /Ivor Bankole/ }));
    await user.click(within(phone()).getByRole('button', { name: 'Start travelling' }));
  }

  it('offers the action only while en route, and only as the secondary one', async () => {
    const user = userEvent.setup();
    await renderDemo();
    await ivorEnRouteDetail(user);

    const primary = within(phone()).getByRole('button', { name: 'Mark as arrived' });
    const secondary = within(phone()).getByRole('button', { name: 'Return to Planned' });

    expect(primary).toHaveClass('demo-button--primary');
    expect(secondary).toHaveClass('demo-button--quiet');

    /* Once arrived, there is no way back. */
    await user.click(primary);
    expect(within(phone()).queryByRole('button', { name: 'Return to Planned' })).toBeNull();
  });

  it('is absent for planned, arrived and completed visits', async () => {
    const user = userEvent.setup();
    await renderDemo();

    /* Arrived (Priya, on load). */
    await user.click(within(phone()).getByRole('button', { name: 'Open visit' }));
    expect(within(phone()).queryByRole('button', { name: 'Return to Planned' })).toBeNull();
    await user.click(within(phone()).getByRole('button', { name: /Back to the visit list/i }));

    /* Planned. */
    await user.click(tab('Visits'));
    await user.click(within(phone()).getByRole('button', { name: /Halina Nowak/ }));
    expect(within(phone()).queryByRole('button', { name: 'Return to Planned' })).toBeNull();

    /* Completed. */
    await user.click(within(phone()).getByRole('button', { name: /Back to the visit list/i }));
    await user.click(within(phone()).getByRole('button', { name: /Marguerite Okonjo/ }));
    expect(within(phone()).queryByRole('button', { name: 'Return to Planned' })).toBeNull();
  });

  it('asks first, naming the visit', async () => {
    const user = userEvent.setup();
    await renderDemo();
    await ivorEnRouteDetail(user);

    await user.click(within(phone()).getByRole('button', { name: 'Return to Planned' }));

    expect(dialog()).toHaveAccessibleName('Return Ivor Bankole to Planned?');
    expect(dialog()).toHaveAttribute('aria-modal', 'true');
    expect(dialog()).toHaveTextContent(
      'This will release the active visit so another visit can be started.',
    );
    expect(within(dialog()).getByRole('button', { name: 'Keep En route' })).toBeInTheDocument();
    expect(within(dialog()).getByRole('button', { name: 'Return to Planned' })).toBeInTheDocument();
  });

  it('changes nothing when kept en route, and hands focus back', async () => {
    const user = userEvent.setup();
    await renderDemo();
    await ivorEnRouteDetail(user);

    const opener = within(phone()).getByRole('button', { name: 'Return to Planned' });
    await user.click(opener);
    await user.click(within(dialog()).getByRole('button', { name: 'Keep En route' }));

    expect(screen.queryByRole('dialog')).toBeNull();
    expect(within(phone()).getByRole('button', { name: 'Mark as arrived' })).toBeInTheDocument();
    expect(within(phone()).getByRole('button', { name: 'Return to Planned' })).toHaveFocus();
  });

  it('changes nothing when dismissed with Escape', async () => {
    const user = userEvent.setup();
    await renderDemo();
    await ivorEnRouteDetail(user);

    await user.click(within(phone()).getByRole('button', { name: 'Return to Planned' }));
    await user.keyboard('{Escape}');

    expect(screen.queryByRole('dialog')).toBeNull();
    expect(within(phone()).getByRole('button', { name: 'Mark as arrived' })).toBeInTheDocument();
  });

  it('returns the visit, keeps its tasks, and lands focus on the next action', async () => {
    const user = userEvent.setup();
    await renderDemo();
    await ivorEnRouteDetail(user);

    await user.click(within(phone()).getByRole('button', { name: 'Return to Planned' }));
    await user.click(within(dialog()).getByRole('button', { name: 'Return to Planned' }));

    /* Back to planned: the only action is to start again. */
    const action = within(phone()).getByRole('button', { name: 'Start travelling' });
    expect(action).toBeInTheDocument();
    expect(action).toHaveFocus();

    /* Tasks untouched by the reversal. */
    expect(within(phone()).getByText('0 of 3 done')).toBeInTheDocument();
  });

  it('announces the change', async () => {
    const user = userEvent.setup();
    await renderDemo();
    await ivorEnRouteDetail(user);

    await user.click(within(phone()).getByRole('button', { name: 'Return to Planned' }));
    await user.click(within(dialog()).getByRole('button', { name: 'Return to Planned' }));

    const status = document.querySelector('.demo-reset-status');
    expect(status).toHaveAttribute('role', 'status');
    expect(status).toHaveTextContent('Ivor Bankole returned to Planned. No visit is active.');
  });

  it('releases the lock so a different visit can start', async () => {
    const user = userEvent.setup();
    await renderDemo();
    await ivorEnRouteDetail(user);

    await user.click(within(phone()).getByRole('button', { name: 'Return to Planned' }));
    await user.click(within(dialog()).getByRole('button', { name: 'Return to Planned' }));
    await user.click(within(phone()).getByRole('button', { name: /Back to the visit list/i }));

    await user.click(within(phone()).getByRole('button', { name: /Halina Nowak/ }));
    await user.click(within(phone()).getByRole('button', { name: 'Start travelling' }));

    /* No block: the round was free. */
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(within(phone()).getByRole('button', { name: 'Mark as arrived' })).toBeInTheDocument();
  });

  it('updates the Visits filters and Today immediately', async () => {
    const user = userEvent.setup();
    await renderDemo();
    await ivorEnRouteDetail(user);

    await user.click(within(phone()).getByRole('button', { name: 'Return to Planned' }));
    await user.click(within(dialog()).getByRole('button', { name: 'Return to Planned' }));
    await user.click(within(phone()).getByRole('button', { name: /Back to the visit list/i }));

    await user.click(within(phone()).getByRole('radio', { name: 'In progress' }));
    expect(within(phone()).getByText('No visits match this search')).toBeInTheDocument();

    await user.click(within(phone()).getByRole('radio', { name: 'Planned' }));
    expect(within(phone()).getByText('Showing 4 of 7 visits')).toBeInTheDocument();

    await user.click(tab('Today'));
    expect(within(phone()).getByRole('heading', { name: 'Ivor Bankole', level: 4 })).toBeInTheDocument();
    expect(within(phone()).getByText('Next visit')).toBeInTheDocument();
  });

  it('is not gated by the completion-confirmation preference', async () => {
    const user = userEvent.setup();
    await renderDemo();

    await user.click(tab('More'));
    await user.click(
      within(phone()).getByRole('checkbox', { name: 'Confirm before completing a visit' }),
    );
    await user.click(tab('Today'));
    await ivorEnRouteDetail(user);

    await user.click(within(phone()).getByRole('button', { name: 'Return to Planned' }));
    /* Its own question, not the completion one. */
    expect(dialog()).toHaveAccessibleName('Return Ivor Bankole to Planned?');

    await user.click(within(dialog()).getByRole('button', { name: 'Return to Planned' }));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(within(phone()).getByRole('button', { name: 'Start travelling' })).toBeInTheDocument();
  });
});

describe('the active-visit message', () => {
  it('reads as one sentence about the rule and one about what to do', async () => {
    const user = userEvent.setup();
    await renderDemo();

    await user.click(tab('Visits'));
    await user.click(within(phone()).getByRole('button', { name: /Ivor Bankole/ }));
    await user.click(within(phone()).getByRole('button', { name: 'Start travelling' }));

    expect(dialog()).toHaveTextContent(
      'Only one visit can be active at a time. Complete Priya Raman’s visit before starting Ivor Bankole.',
    );
    /* The longer "Finish or complete" phrasing is gone. */
    expect(dialog()).not.toHaveTextContent(/Finish or complete/i);
  });
});

describe('the Today primary card follows the active visit', () => {
  /* Finish Priya so the round is free and Ivor is the earliest planned. */
  async function freeRound(user) {
    await completeThroughWarning(user);
  }

  async function startHalina(user) {
    await user.click(tab('Visits'));
    await user.click(within(phone()).getByRole('button', { name: /Halina Nowak/ }));
    await user.click(within(phone()).getByRole('button', { name: 'Start travelling' }));
    await user.click(within(phone()).getByRole('button', { name: /Back to the visit list/i }));
    await user.click(tab('Today'));
  }

  it('shows the earliest planned visit while nothing is active', async () => {
    const user = userEvent.setup();
    await renderDemo();
    await freeRound(user);

    expect(within(phone()).getByRole('heading', { name: 'Ivor Bankole', level: 4 })).toBeInTheDocument();
    expect(within(phone()).getByText('Next visit')).toBeInTheDocument();
  });

  it('replaces it as soon as a later visit is started out of order', async () => {
    const user = userEvent.setup();
    await renderDemo();
    await freeRound(user);
    await startHalina(user);

    /* The reported bug: the card stayed on Ivor. */
    expect(within(phone()).getByRole('heading', { name: 'Halina Nowak', level: 4 })).toBeInTheDocument();
    expect(within(phone()).queryByRole('heading', { name: 'Ivor Bankole', level: 4 })).toBeNull();

    /* And it says what she is, not what she would be. */
    expect(within(phone()).getByText('In progress')).toBeInTheDocument();
    expect(within(phone()).queryByText('Next visit')).toBeNull();
  });

  it('points the card actions at the active visit, not the earlier planned one', async () => {
    const user = userEvent.setup();
    await renderDemo();
    await freeRound(user);
    await startHalina(user);

    /* En route, so the primary action is Halina's next step. */
    await user.click(within(phone()).getByRole('button', { name: 'Mark as arrived' }));
    expect(within(phone()).getByRole('heading', { name: 'Halina Nowak', level: 4 })).toBeInTheDocument();

    /* And Open visit opens her record, not Ivor's. */
    await user.click(within(phone()).getByRole('button', { name: 'Open visit' }));
    expect(within(phone()).getByText('AV-1045')).toBeInTheDocument();
  });

  it('leaves Ivor planned in the schedule throughout', async () => {
    const user = userEvent.setup();
    await renderDemo();
    await freeRound(user);
    await startHalina(user);

    await user.click(tab('Visits'));
    await user.click(within(phone()).getByRole('radio', { name: 'Planned' }));

    expect(within(phone()).getByRole('button', { name: /Ivor Bankole/ })).toBeInTheDocument();
    expect(within(phone()).getByText('Showing 3 of 7 visits')).toBeInTheDocument();
  });

  it('hands the card back to Ivor when Halina is returned to Planned', async () => {
    const user = userEvent.setup();
    await renderDemo();
    await freeRound(user);
    await startHalina(user);

    await user.click(within(phone()).getByRole('button', { name: 'Open visit' }));
    await user.click(within(phone()).getByRole('button', { name: 'Return to Planned' }));
    await user.click(within(dialog()).getByRole('button', { name: 'Return to Planned' }));
    await user.click(within(phone()).getByRole('button', { name: /Back to the visit list/i }));
    await user.click(tab('Today'));

    /* No active visit, so the earliest planned leads again. */
    expect(within(phone()).getByRole('heading', { name: 'Ivor Bankole', level: 4 })).toBeInTheDocument();
    expect(within(phone()).getByText('Next visit')).toBeInTheDocument();
    expect(within(phone()).queryByRole('heading', { name: 'Halina Nowak', level: 4 })).toBeNull();
  });
});

describe('checklists are readable everywhere, editable only on arrival', () => {
  const tasksIn = () => within(phone()).getAllByRole('checkbox');

  async function openPlanned(user) {
    await user.click(tab('Visits'));
    await user.click(within(phone()).getByRole('button', { name: /Halina Nowak/ }));
  }

  it('leaves an arrived visit fully editable', async () => {
    const user = userEvent.setup();
    await renderDemo();
    await user.click(within(phone()).getByRole('button', { name: 'Open visit' }));

    const task = within(phone()).getByRole('checkbox', { name: 'Check wound dressing' });
    expect(task).toBeEnabled();

    await user.click(task);
    expect(task).toBeChecked();
    expect(within(phone()).getByText('2 of 3 done')).toBeInTheDocument();

    /* No lock sentence when there is no lock. */
    expect(phone()).not.toHaveTextContent(/Task completion becomes available after arrival/);
  });

  it('disables a planned visit checklist, and says why', async () => {
    const user = userEvent.setup();
    await renderDemo();
    await openPlanned(user);

    /* Readable: every task is still listed. */
    expect(tasksIn()).toHaveLength(3);
    expect(within(phone()).getByText('Prompt midday medication')).toBeInTheDocument();

    /* Genuinely disabled, not merely styled. */
    for (const task of tasksIn()) {
      expect(task).toBeDisabled();
    }

    expect(
      within(phone()).getByText('Task completion becomes available after arrival.'),
    ).toBeInTheDocument();
  });

  it('disables an en route visit checklist with the same sentence', async () => {
    const user = userEvent.setup();
    await renderDemo();
    await completeThroughWarning(user);

    await user.click(tab('Visits'));
    await user.click(within(phone()).getByRole('button', { name: /Ivor Bankole/ }));
    await user.click(within(phone()).getByRole('button', { name: 'Start travelling' }));

    for (const task of tasksIn()) {
      expect(task).toBeDisabled();
    }
    expect(
      within(phone()).getByText('Task completion becomes available after arrival.'),
    ).toBeInTheDocument();
  });

  it('freezes a completed visit checklist, and says so differently', async () => {
    const user = userEvent.setup();
    await renderDemo();

    await user.click(tab('Visits'));
    await user.click(within(phone()).getByRole('button', { name: /Marguerite Okonjo/ }));

    expect(tasksIn()).toHaveLength(3);
    for (const task of tasksIn()) {
      expect(task).toBeDisabled();
      expect(task).toBeChecked();
    }

    expect(
      within(phone()).getByText('This completed visit’s checklist is read-only.'),
    ).toBeInTheDocument();
    expect(phone()).not.toHaveTextContent(/becomes available after arrival/);
  });

  it('ties the explanation to each control rather than leaving it to colour', async () => {
    const user = userEvent.setup();
    await renderDemo();
    await openPlanned(user);

    const lock = within(phone()).getByText('Task completion becomes available after arrival.');
    for (const task of tasksIn()) {
      expect(task.getAttribute('aria-describedby')).toContain(lock.id);
    }
  });

  it('keeps a released visit’s recorded tasks intact', async () => {
    const user = userEvent.setup();
    await renderDemo();
    await completeThroughWarning(user);

    await user.click(tab('Visits'));
    await user.click(within(phone()).getByRole('button', { name: /Ivor Bankole/ }));
    await user.click(within(phone()).getByRole('button', { name: 'Start travelling' }));
    await user.click(within(phone()).getByRole('button', { name: 'Return to Planned' }));
    await user.click(within(dialog()).getByRole('button', { name: 'Return to Planned' }));

    /* Nothing cleared, nothing invented. */
    expect(within(phone()).getByText('0 of 3 done')).toBeInTheDocument();
    expect(tasksIn()).toHaveLength(3);
  });

  it('still warns about outstanding tasks on an arrived visit', async () => {
    const user = userEvent.setup();
    await renderDemo();

    await user.click(within(phone()).getByRole('button', { name: 'Complete visit' }));
    expect(dialog()).toHaveAccessibleName('2 tasks are still outstanding');
  });
});

describe('the journeys to try', () => {
  const LEADS = [
    'Complete a visit.',
    'Search and filter.',
    'Keep one visit active.',
    'Change priorities.',
    'Adjust preferences.',
  ];

  it('lists exactly five, in order, each once', async () => {
    await renderDemo();

    const items = [...document.querySelectorAll('.demo-try-list li')];
    expect(items).toHaveLength(5);
    expect(items.map((item) => item.querySelector('.demo-try-lead').textContent)).toEqual(LEADS);

    for (const lead of LEADS) {
      expect(screen.getAllByText(lead)).toHaveLength(1);
    }
  });

  it('reads as one connected run through the demo', async () => {
    await renderDemo();

    const [complete, search, active, priorities, preferences] = [
      ...document.querySelectorAll('.demo-try-list li'),
    ].map((item) => item.textContent.replace(/\s+/g, ' ').trim());

    expect(complete).toBe(
      'Complete a visit. Open Priya Raman, complete her remaining tasks, then complete the '
      + 'visit and watch progress move from 2 of 7 to 3 of 7.',
    );
    expect(search).toBe(
      'Search and filter. Search for “Ivor” by name, “Bramble” by address or “AV-1044” by '
      + 'visit reference, then select “Planned”.',
    );
    expect(active).toBe(
      'Keep one visit active. Start travelling to Ivor Bankole, then try to start Halina '
      + 'Nowak. The app will keep Ivor active and offer to take you back to his visit.',
    );
    expect(priorities).toBe(
      'Change priorities. In Ivor’s visit, choose “Return to Planned”, then start travelling '
      + 'to Halina instead.',
    );
    expect(preferences).toBe(
      'Adjust preferences. Under “More”, show or hide completed visits and turn completion '
      + 'confirmation on.',
    );
  });

  it('emphasises with weight and adds no controls', async () => {
    await renderDemo();

    const list = document.querySelector('.demo-try-list');

    /* Highlighted words are text, never something to press. */
    expect(list.querySelectorAll('a, button, input, [role="button"], [tabindex]')).toHaveLength(0);

    /* Counts and interface labels are emphasised by weight, in reading ink. */
    expect([...list.querySelectorAll('.demo-try-count')].map((n) => n.textContent))
      .toEqual(['2 of 7', '3 of 7']);
    expect([...list.querySelectorAll('.demo-try-ui')].map((n) => n.textContent))
      .toEqual(['“Ivor”', '“Bramble”', '“AV-1044”', '“Planned”', '“Return to Planned”', '“More”']);

    /* Every emphasis is a <b>, so weight carries it even without colour. */
    for (const node of list.querySelectorAll('.demo-try-lead, .demo-try-ui, .demo-try-count')) {
      expect(node.tagName).toBe('B');
    }
  });

  it('keeps people’s names in ordinary body text', async () => {
    await renderDemo();

    const list = document.querySelector('.demo-try-list');
    for (const name of ['Priya Raman', 'Ivor Bankole', 'Halina Nowak']) {
      expect(list).toHaveTextContent(name);
      expect([...list.querySelectorAll('b')].map((n) => n.textContent)).not.toContain(name);
    }
  });
});

describe('the visit reference is labelled', () => {
  it('names AV-1044 as a visit reference in the journeys', async () => {
    await renderDemo();

    const search = [...document.querySelectorAll('.demo-try-list li')][1];
    expect(search.textContent.replace(/\s+/g, ' ')).toContain('“AV-1044” by visit reference');
  });

  it('labels the reference visibly on a visit', async () => {
    const user = userEvent.setup();
    await renderDemo();
    await user.click(within(phone()).getByRole('button', { name: 'Open visit' }));

    const label = within(phone()).getByText('Visit reference');
    expect(label).toBeInTheDocument();
    /* The label is a term and the reference its definition, so they are read
       together rather than as two loose strings. */
    expect(label.tagName).toBe('DT');
    expect(label.nextElementSibling.textContent).toBe('AV-1043');
  });

  it('asks for a visit reference in the search prompt, not a bare reference', async () => {
    const user = userEvent.setup();
    await renderDemo();
    await user.click(tab('Visits'));

    const field = within(phone()).getByRole('searchbox', {
      name: /Search visits by name, visit reference or address/i,
    });
    expect(field).toHaveAttribute('placeholder', 'Search name, visit reference or address');
  });

  it('still finds a visit by its reference', async () => {
    const user = userEvent.setup();
    await renderDemo();
    await user.click(tab('Visits'));

    await user.type(within(phone()).getByRole('searchbox'), 'AV-1044');
    expect(within(phone()).getByRole('button', { name: /Ivor Bankole/ })).toBeInTheDocument();
    expect(within(phone()).getByText('Showing 1 of 7 visits')).toBeInTheDocument();
  });
});

describe('the approved layout and selector must survive later passes', () => {
  it('keeps the workspace as cue, phone, card in source order', async () => {
    await renderDemo();

    const workspace = document.querySelector('.demo-layout');
    /* Matched on the identifying class rather than the first one: two of the
       three are wrapped in Reveal, which adds its own class ahead of theirs. */
    expect(
      [...workspace.children].map((child) =>
        ['demo-cue', 'demo-stage', 'demo-companion'].find((name) =>
          child.classList.contains(name),
        ),
      ),
    ).toEqual(['demo-cue', 'demo-stage', 'demo-companion']);

    /* Source order is the stacked order: no CSS `order` may reintroduce a
       difference between what is read and what is seen. */
    const demoCss = readFileSync('src/components/pages/AjaniMobileDemo.css', 'utf8');
    expect(demoCss).not.toMatch(/^\s*order:\s*[0-9]/m);
  });

  it('keeps Interactive preview as the h2 introducing the phone region', async () => {
    await renderDemo();

    const heading = screen.getByRole('heading', { name: 'Interactive preview' });
    expect(heading.tagName).toBe('H2');
    expect(heading.closest('.demo-cue')).not.toBeNull();
    expect(
      heading.compareDocumentPosition(phone()) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it('keeps the phone spanning both rows with its height-aware width cap', () => {
    const demoCss = readFileSync('src/components/pages/AjaniMobileDemo.css', 'utf8');
    const stageRule = /\.demo-stage\s*\{([^}]*)\}/.exec(demoCss);

    expect(stageRule[1]).toMatch(/grid-row:\s*1\s*\/\s*span 2/);
    expect(stageRule[1]).toMatch(/align-self:\s*start/);

    const cap = demoCss.slice(demoCss.indexOf('@media screen and (min-width: 901px)'));
    expect(cap).toMatch(/--demo-phone-width:\s*clamp\(/);
    expect(cap).toMatch(/100dvh|100vh/);
    expect(cap).toMatch(/941\s*\/\s*2048/);
    expect(demoCss).not.toMatch(/transform:|zoom:/);
  });

  it('keeps the active visit ahead of an earlier planned one on Today', async () => {
    const user = userEvent.setup();
    await renderDemo();

    await completeThroughWarning(user);
    await user.click(tab('Visits'));
    await user.click(within(phone()).getByRole('button', { name: /Halina Nowak/ }));
    await user.click(within(phone()).getByRole('button', { name: 'Start travelling' }));
    await user.click(within(phone()).getByRole('button', { name: /Back to the visit list/i }));
    await user.click(tab('Today'));

    expect(within(phone()).getByRole('heading', { name: 'Halina Nowak', level: 4 })).toBeInTheDocument();
    expect(within(phone()).queryByRole('heading', { name: 'Ivor Bankole', level: 4 })).toBeNull();
    expect(within(phone()).getByText('In progress')).toBeInTheDocument();
  });
});

describe('the filter row cannot wrap', () => {
  const phoneCss = readFileSync('src/components/demo/DemoPhone.css', 'utf8');
  const rule = (selector) =>
    new RegExp(`\\${selector}\\s*\\{([^}]*)\\}`).exec(phoneCss)[1];

  it('lays the four filters out in four fixed tracks, not a wrapping row', () => {
    const filters = rule('.demo-filters');

    /* Four tracks means four items on one line by construction. */
    expect(filters).toMatch(/display:\s*grid/);
    expect(filters).toMatch(/grid-template-columns:\s*repeat\(4,/);

    /* The wrapping flex row this replaced must not come back. */
    expect(filters).not.toMatch(/flex-wrap/);
    expect(filters).not.toMatch(/display:\s*flex/);
  });

  it('reserves the scrollbar gutter so the result count cannot change the width', () => {
    /* The root cause: the scroll container gave up ~15px the moment the list
       overflowed, and took it back when a search shortened the list, so the
       same row was measured against two different widths. */
    expect(rule('.demo-screen-scroll')).toMatch(/scrollbar-gutter:\s*stable/);
  });

  it('sizes the labels against the phone, with a readable 0.7rem floor', () => {
    const filter = rule('.demo-filter');

    expect(filter).toMatch(/font-size:\s*clamp\(0\.7rem,\s*3cqi,\s*0\.8rem\)/);
    /* A plain value first, for anywhere container units are unsupported. */
    expect(filter).toMatch(/font-size:\s*0\.7rem/);
    /* And a container to measure against. */
    expect(rule('.demo-screen-body')).toMatch(/container-type:\s*inline-size/);
  });

  it('rejects filter font-size overrides or fallback floors below 0.7rem', () => {
    const rules = [...phoneCss.matchAll(/([^{}]+)\{([^{}]*)\}/g)]
      .filter(([, selectors]) => /\.demo-filter(?![\w-])/.test(selectors));
    const sizes = rules.flatMap(([, , declarations]) =>
      [...declarations.matchAll(/font-size:\s*([^;]+);/g)].map(([, value]) => value),
    );
    expect(sizes.length).toBeGreaterThan(0);
    for (const value of sizes) {
      /* Inspect declarations, not physical pixels: jsdom has no layout. */
      const floor = /^(?:clamp\(\s*)?([\d.]+)rem(?:\s*,|$)/.exec(value);
      expect(floor).not.toBeNull();
      expect(Number(floor[1])).toBeGreaterThanOrEqual(0.7);
    }
  });

  it('uses compact fluid padding and a small gap without reducing target height', () => {
    expect(rule('.demo-filters')).toMatch(/gap:\s*0\.075rem/);
    expect(rule('.demo-filter')).toMatch(
      /padding:\s*0\.3rem clamp\(0\.025rem,\s*0\.1cqi,\s*0\.15rem\)/,
    );
    expect(rule('.demo-filter')).toMatch(/min-height:\s*44px/);
    expect(rule('.demo-app :focus-visible')).toMatch(/outline:\s*3px solid/);
    expect(rule('.demo-app :focus-visible')).toMatch(/outline-offset:\s*-3px/);
  });

  it('introduces no horizontal scrolling, truncation or clipping', () => {
    const filters = rule('.demo-filters');
    const filter = rule('.demo-filter');

    for (const declarations of [filters, filter]) {
      expect(declarations).not.toMatch(/overflow-x|overflow:\s*(auto|scroll|hidden)/);
      expect(declarations).not.toMatch(/text-overflow|ellipsis/);
    }
    /* nowrap keeps a label on one line; it never shortens one. */
    expect(filter).toMatch(/white-space:\s*nowrap/);
    expect(filter).toMatch(/min-width:\s*0/);
  });

  it('keeps the pill, the selected state and a usable target height', () => {
    const filter = rule('.demo-filter');
    expect(filter).toMatch(/border-radius:\s*999px/);
    expect(filter).toMatch(/min-height:\s*44px/);
    expect(rule('.demo-filter.is-active')).toMatch(/background-color:\s*var\(--d-accent\)/);
  });

  it('renders identical filter markup whatever the search returns', async () => {
    const user = userEvent.setup();
    await renderDemo();
    await user.click(tab('Visits'));

    const snapshot = () => {
      const group = within(phone()).getByRole('radiogroup', { name: /Filter visits by status/i });
      return {
        className: group.className,
        labels: within(group).getAllByRole('radio').map((r) => r.textContent),
        classes: within(group).getAllByRole('radio').map((r) => r.className),
      };
    };

    /* All seven — the list overflows and the scrollbar is present. */
    const all = snapshot();
    expect(all.labels).toEqual(['All', 'Planned', 'In progress', 'Completed']);

    const field = within(phone()).getByRole('searchbox');

    await user.type(field, 'Priya');
    expect(within(phone()).getByText('Showing 1 of 7 visits')).toBeInTheDocument();
    expect(snapshot()).toEqual(all);

    await user.clear(field);
    await user.type(field, 'zzzzz');
    expect(within(phone()).getByText('No visits match this search')).toBeInTheDocument();
    expect(snapshot()).toEqual(all);

    await user.clear(field);
    expect(within(phone()).getByText('Showing all 7 visits')).toBeInTheDocument();
    expect(snapshot()).toEqual(all);
  });

  it('keeps every label complete and every control a real button', async () => {
    const user = userEvent.setup();
    await renderDemo();
    await user.click(tab('Visits'));

    const group = within(phone()).getByRole('radiogroup', { name: /Filter visits by status/i });
    const radios = within(group).getAllByRole('radio');

    expect(radios).toHaveLength(4);
    for (const [index, name] of ['All', 'Planned', 'In progress', 'Completed'].entries()) {
      /* Whole words, not abbreviations, and a real button underneath. */
      expect(radios[index]).toHaveAccessibleName(name);
      expect(radios[index].tagName).toBe('BUTTON');
      expect(radios[index]).toHaveAttribute('type', 'button');
      expect(radios[index]).toBeEnabled();
    }

    /* Selection is still exposed, and still moves. */
    expect(radios[0]).toBeChecked();
    await user.click(radios[3]);
    expect(radios[3]).toBeChecked();
    expect(radios[0]).not.toBeChecked();
  });
});

describe('the companion card ends level with the phone', () => {
  const demoCss = readFileSync('src/components/pages/AjaniMobileDemo.css', 'utf8');

  it('puts the two navigation links side by side when there is room', () => {
    const links = /\.demo-companion-links\s*\{([^}]*)\}/.exec(demoCss)[1];

    /* auto-fit against a minimum: two columns while the card is wide enough,
       one when it is not — decided by the container, not a breakpoint. */
    expect(links).toMatch(/display:\s*grid/);
    expect(links).toMatch(/grid-template-columns:\s*repeat\(auto-fit,\s*minmax\(min\(100%,\s*11rem\),\s*1fr\)\)/);

    /* Still meets the card's bottom edge. */
    expect(links).toMatch(/margin-top:\s*auto/);
  });

  it('leaves Reset on its own row, and keeps the links secondary to it', async () => {
    await renderDemo();

    const reset = screen.getByRole('button', { name: 'Reset demo' });
    const caseStudy = screen.getByRole('link', { name: /Back to the case study/i });
    const repository = screen.getByRole('link', { name: /View native repository/i });

    /* Different groups, so Reset never shares the link row. */
    expect(reset.closest('.demo-companion-actions')).not.toBeNull();
    expect(reset.closest('.demo-companion-links')).toBeNull();
    expect(caseStudy.parentElement).toBe(repository.parentElement);
    expect(caseStudy.parentElement).toHaveClass('demo-companion-links');

    /* Filled primary against two outlines: the hierarchy still reads. */
    expect(reset).toHaveClass('btn--primary');
    expect(caseStudy).toHaveClass('btn--outline');
    expect(repository).toHaveClass('btn--outline');
  });

  it('keeps the repository link external and announced', async () => {
    await renderDemo();

    const repository = screen.getByRole('link', { name: /View native repository/i });
    expect(repository).toHaveAttribute('target', '_blank');
    expect(repository).toHaveAttribute('rel', expect.stringContaining('noopener'));
    expect(within(repository).getByText(/opens in a new tab/i)).toBeInTheDocument();
    expect(repository.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
  });

  it('shortens the card without touching the journeys', async () => {
    await renderDemo();

    /* The height came out of a button row, not out of the list. */
    const items = [...document.querySelectorAll('.demo-try-list li')];
    expect(items).toHaveLength(5);
    expect(items[0].querySelector('.demo-try-lead').textContent).toBe('Complete a visit.');
    expect(items[4].querySelector('.demo-try-lead').textContent).toBe('Adjust preferences.');

    const desktop = demoCss.slice(demoCss.indexOf('@media screen and (min-width: 901px)'));
    expect(desktop).toMatch(/\.demo-try-list li \{\s*margin-bottom:\s*0\.85rem/);

    /* And not out of a fixed height, filler or a transform. */
    expect(demoCss).not.toMatch(/transform:|zoom:|position:\s*absolute/);
    const companion = /\.demo-companion\s*\{([^}]*)\}/.exec(demoCss)[1];
    expect(companion).not.toMatch(/min-height|height:\s*[0-9]/);
  });
});
