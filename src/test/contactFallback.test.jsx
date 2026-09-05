import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderApp } from './renderApp';
import { CONTACT_EMAIL } from '../lib/site';

/*
 * What the contact route does when the build has no EmailJS configuration.
 *
 * The environment variables are blanked here rather than filled in: this suite
 * is exactly the case where no provider values exist, and none are needed to
 * test it.
 */

const sendMock = vi.hoisted(() => vi.fn());
vi.mock('@emailjs/browser', () => ({
  default: { send: sendMock },
  send: sendMock,
}));

beforeEach(() => {
  sendMock.mockReset();
  vi.stubEnv('VITE_EMAILJS_SERVICE_ID', '');
  vi.stubEnv('VITE_EMAILJS_TEMPLATE_ID', '');
  vi.stubEnv('VITE_EMAILJS_PUBLIC_KEY', '');
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('contact form with no email provider configured', () => {
  it('says the online form is temporarily unavailable', () => {
    renderApp('/contact');

    expect(screen.getByText(/The online form is temporarily unavailable/i)).toBeInTheDocument();
  });

  it('offers a working mailto fallback', () => {
    renderApp('/contact');

    const fallback = screen.getByRole('link', { name: CONTACT_EMAIL });
    expect(fallback).toHaveAttribute('href', `mailto:${CONTACT_EMAIL}`);
    expect(CONTACT_EMAIL).toBe('contact@ajanihealthcare.com');
  });

  it('never suggests an enquiry was sent', () => {
    renderApp('/contact');

    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(screen.queryByText(/has been sent/i)).not.toBeInTheDocument();
    expect(screen.getByText(/Nothing typed into the form below will be sent/i)).toBeInTheDocument();
  });

  it('disables submission so nothing can be attempted', async () => {
    const user = userEvent.setup();
    renderApp('/contact');

    const submit = screen.getByRole('button', { name: /Send enquiry/i });
    expect(submit).toBeDisabled();

    await user.click(submit);
    expect(sendMock).not.toHaveBeenCalled();
  });

  it('still shows the form, its fields and the warning about patient data', () => {
    renderApp('/contact');

    for (const [field, label] of [
      ['name', /Your name/i],
      ['email', /Email address/i],
      ['address', /Organisation or address/i],
      ['subject', /^Subject/i],
      ['message', /^Message/i],
    ]) {
      expect(screen.getByLabelText(label)).toHaveAttribute('name', field);
    }

    expect(screen.getByLabelText(/Organisation or address/i)).not.toBeRequired();
    expect(screen.getByText(/not include patient-identifiable information/i)).toBeInTheDocument();
  });
});

describe('committed environment files', () => {
  it('ship blank EmailJS placeholders and nothing else', async () => {
    const { readFileSync } = await import('node:fs');
    const example = readFileSync('.env.example', 'utf8');

    for (const key of [
      'VITE_EMAILJS_SERVICE_ID',
      'VITE_EMAILJS_TEMPLATE_ID',
      'VITE_EMAILJS_PUBLIC_KEY',
    ]) {
      expect(example).toMatch(new RegExp(`^${key}=\\s*$`, 'm'));
    }
  });

  it('keep every real env file out of version control', async () => {
    const { readFileSync } = await import('node:fs');
    const ignore = readFileSync('.gitignore', 'utf8');

    expect(ignore).toMatch(/^\.env$/m);
    expect(ignore).toMatch(/^\.env\.\*$/m);
    expect(ignore).toMatch(/^!\.env\.example$/m);
  });
});
