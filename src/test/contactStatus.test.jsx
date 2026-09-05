import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderApp } from './renderApp';
import { setReducedMotion } from './viewport';

const sendMock = vi.hoisted(() => vi.fn());
vi.mock('@emailjs/browser', () => ({
  default: { send: sendMock },
  send: sendMock,
}));

const LABELS = {
  name: /Your name/i,
  email: /Email address/i,
  address: /Organisation or address/i,
  subject: /^Subject/i,
  message: /^Message/i,
};

/*
 * Deliberately terse.
 *
 * userEvent types a character at a time, and every keystroke dispatches
 * through the form reducer and re-renders the route, so these tests cost
 * roughly 18ms per character. Prose-length fixtures pushed the five tests that
 * fill the form to ~2.8s each, which was comfortably inside Vitest's 5s
 * timeout in isolation and intermittently outside it once fourteen test files
 * were competing for the CPU.
 *
 * Every field is still populated with a valid value and the assertions still
 * compare the whole submitted payload against this object, so the contract
 * coverage is unchanged — only the typing is shorter.
 */
const VALID = {
  name: 'A Test',
  email: 'a@test.com',
  address: 'S1',
  subject: 'Help',
  message: 'Test enquiry',
};

/* No "@", so it fails the address pattern rather than the required check. */
const MALFORMED_EMAIL = 'invalid';

async function fillForm(user, values = VALID) {
  for (const [field, value] of Object.entries(values)) {
    if (!value) continue;
    await user.type(screen.getByLabelText(LABELS[field]), value);
  }
}

function submit(user) {
  return user.click(screen.getByRole('button', { name: /Send enquiry/i }));
}

beforeEach(() => {
  sendMock.mockReset();
});

describe('form status rendering', () => {
  it('shows no status message before the form is used', () => {
    renderApp('/contact');

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('reports validation failures without contacting the provider', async () => {
    const user = userEvent.setup();
    renderApp('/contact');

    await submit(user);

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(/Your enquiry has not been sent/i);
    expect(within(alert).getByText(/Enter your name/i)).toBeInTheDocument();
    expect(within(alert).getByText(/Enter an email address so we can reply/i)).toBeInTheDocument();
    expect(within(alert).getByText(/Add a short subject/i)).toBeInTheDocument();
    expect(within(alert).getByText(/Add a message/i)).toBeInTheDocument();

    expect(sendMock).not.toHaveBeenCalled();
    expect(screen.getByLabelText(LABELS.name)).toHaveAttribute('aria-invalid', 'true');
  });

  it('rejects a malformed email address', async () => {
    const user = userEvent.setup();
    renderApp('/contact');

    await fillForm(user, { ...VALID, email: MALFORMED_EMAIL });
    await submit(user);

    expect(await screen.findByRole('alert')).toHaveTextContent(/name@example.com/i);
    expect(sendMock).not.toHaveBeenCalled();
  });

  it('clears a field error as soon as the field is corrected', async () => {
    const user = userEvent.setup();
    renderApp('/contact');

    await submit(user);
    expect(await screen.findByRole('alert')).toBeInTheDocument();

    await user.type(screen.getByLabelText(LABELS.name), 'Ada');

    await waitFor(() => {
      expect(screen.getByLabelText(LABELS.name)).not.toHaveAttribute('aria-invalid');
    });
  });

  it('sends the contract fields and confirms success', async () => {
    sendMock.mockResolvedValue({ status: 200, text: 'OK' });
    const user = userEvent.setup();
    renderApp('/contact');

    await fillForm(user);
    await submit(user);

    const status = await screen.findByRole('status');
    expect(status).toHaveTextContent(/your enquiry has been sent/i);

    expect(sendMock).toHaveBeenCalledTimes(1);
    const [serviceId, templateId, payload, options] = sendMock.mock.calls[0];
    expect(serviceId).toBe('test_service_id');
    expect(templateId).toBe('test_template_id');
    expect(options).toEqual({ publicKey: 'test_public_key' });
    expect(payload).toEqual(VALID);
    expect(Object.keys(payload)).toEqual(['name', 'email', 'address', 'subject', 'message']);
  });

  it('empties the form after a successful send', async () => {
    sendMock.mockResolvedValue({ status: 200, text: 'OK' });
    const user = userEvent.setup();
    renderApp('/contact');

    await fillForm(user);
    await submit(user);
    await screen.findByRole('status');

    expect(screen.getByLabelText(LABELS.name)).toHaveValue('');
    expect(screen.getByLabelText(LABELS.message)).toHaveValue('');
  });

  it('disables the button and says so while the enquiry is in flight', async () => {
    let release;
    sendMock.mockImplementation(
      () =>
        new Promise((resolve) => {
          release = resolve;
        }),
    );

    const user = userEvent.setup();
    renderApp('/contact');

    await fillForm(user);
    await submit(user);

    const button = screen.getByRole('button', { name: /Sending your enquiry/i });
    expect(button).toBeDisabled();

    release({ status: 200 });
    await screen.findByRole('status');
  });

  it('reports a provider failure without losing what was typed', async () => {
    sendMock.mockRejectedValue(new Error('provider unavailable'));
    const user = userEvent.setup();
    renderApp('/contact');

    await fillForm(user);
    await submit(user);

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(/could not be sent/i);

    expect(screen.getByLabelText(LABELS.message)).toHaveValue(VALID.message);
    expect(screen.getByRole('button', { name: /Send enquiry/i })).toBeEnabled();
  });
});

/*
 * Where the feedback appears, and how a keyboard or screen-reader user
 * reaches it.
 *
 * The send outcome moved out of the top of the form to directly beneath the
 * submit button: that is where the reader is looking when they press it, and
 * on this form the top of the page can be well out of view by then.
 */

/** True when `node` comes after `reference` in document order. */
function isAfter(reference, node) {
  return Boolean(
    reference.compareDocumentPosition(node) & Node.DOCUMENT_POSITION_FOLLOWING,
  );
}

const submitButton = () => screen.getByRole('button', { name: /Send enquiry/i });
const firstField = () => screen.getByLabelText(LABELS.name);

describe('send feedback placement', () => {
  it('puts the success confirmation below the submit button', async () => {
    sendMock.mockResolvedValue({ status: 200, text: 'OK' });
    const user = userEvent.setup();
    renderApp('/contact');

    await fillForm(user);
    await submit(user);

    const confirmation = await screen.findByRole('status');
    expect(confirmation).toHaveTextContent(/your enquiry has been sent/i);
    expect(isAfter(submitButton(), confirmation)).toBe(true);
    expect(isAfter(firstField(), confirmation)).toBe(true);
  });

  it('puts a provider failure in the same place, below the button', async () => {
    sendMock.mockRejectedValue(new Error('provider unavailable'));
    const user = userEvent.setup();
    renderApp('/contact');

    await fillForm(user);
    await submit(user);

    const failure = await screen.findByRole('alert');
    expect(failure).toHaveTextContent(/could not be sent/i);
    expect(isAfter(submitButton(), failure)).toBe(true);
  });

  it('keeps the validation summary above the fields, where its links point', async () => {
    const user = userEvent.setup();
    renderApp('/contact');

    await submit(user);

    const summary = await screen.findByRole('alert');
    expect(summary).toHaveTextContent(/Your enquiry has not been sent/i);
    /* Every line in it is a link to a field, so it has to precede them. */
    expect(isAfter(summary, firstField())).toBe(true);
    expect(isAfter(summary, submitButton())).toBe(true);
  });
});

describe('send feedback accessibility', () => {
  it('moves focus to the confirmation so it is not missed', async () => {
    sendMock.mockResolvedValue({ status: 200, text: 'OK' });
    const user = userEvent.setup();
    renderApp('/contact');

    await fillForm(user);
    await submit(user);

    const confirmation = await screen.findByRole('status');
    await waitFor(() => expect(confirmation).toHaveFocus());
    /* Focusable programmatically, but never a stop on the Tab route. */
    expect(confirmation).toHaveAttribute('tabindex', '-1');
  });

  it('moves focus to a provider failure too', async () => {
    sendMock.mockRejectedValue(new Error('provider unavailable'));
    const user = userEvent.setup();
    renderApp('/contact');

    await fillForm(user);
    await submit(user);

    const failure = await screen.findByRole('alert');
    await waitFor(() => expect(failure).toHaveFocus());
  });

  it('brings the confirmation into view without a jarring jump', async () => {
    sendMock.mockResolvedValue({ status: 200, text: 'OK' });
    const user = userEvent.setup();
    renderApp('/contact');

    await fillForm(user);
    await submit(user);

    await screen.findByRole('status');
    expect(Element.prototype.scrollIntoView).toHaveBeenCalledWith({
      behavior: 'smooth',
      block: 'nearest',
    });
  });

  it('drops the smooth scroll under prefers-reduced-motion', async () => {
    setReducedMotion(true);
    sendMock.mockResolvedValue({ status: 200, text: 'OK' });
    const user = userEvent.setup();
    renderApp('/contact');

    await fillForm(user);
    await submit(user);

    await screen.findByRole('status');
    expect(Element.prototype.scrollIntoView).toHaveBeenCalledWith({
      behavior: 'auto',
      block: 'nearest',
    });
    /* Reduced motion removes the animation, never the message. */
    expect(screen.getByRole('status')).toHaveTextContent(/your enquiry has been sent/i);
  });
});

describe('send feedback is permanent, not a toast', () => {
  it('stays on screen instead of timing out', async () => {
    sendMock.mockResolvedValue({ status: 200, text: 'OK' });
    const user = userEvent.setup();
    renderApp('/contact');

    await fillForm(user);
    await submit(user);
    await screen.findByRole('status');

    /* Nothing schedules its removal, so it survives any number of turns of
       the event loop. A toast would be gone. */
    for (let turn = 0; turn < 5; turn += 1) {
      await Promise.resolve();
    }
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('clears only when the reader starts a new enquiry', async () => {
    sendMock.mockResolvedValue({ status: 200, text: 'OK' });
    const user = userEvent.setup();
    renderApp('/contact');

    await fillForm(user);
    await submit(user);
    await screen.findByRole('status');

    await user.type(firstField(), 'B');

    await waitFor(() => expect(screen.queryByRole('status')).not.toBeInTheDocument());
  });
});
