import { describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { renderApp } from './renderApp';

/* Nothing in this file submits the form, but the SDK is still stubbed so an
   accidental network call would fail loudly rather than quietly go out. */
vi.mock('@emailjs/browser', () => ({
  default: { send: vi.fn() },
  send: vi.fn(),
}));

/* The five template variables of the existing EmailJS contract. */
const CONTRACT_FIELDS = ['name', 'email', 'address', 'subject', 'message'];

const LABELS = {
  name: /Your name/i,
  email: /Email address/i,
  address: /Organisation or address/i,
  subject: /^Subject/i,
  message: /^Message/i,
};

describe('contact route', () => {
  it('renders at /contact with a single H1', () => {
    renderApp('/contact');

    const headings = screen.getAllByRole('heading', { level: 1 });
    expect(headings).toHaveLength(1);
    expect(headings[0]).toHaveTextContent(/Tell us what you are working through/i);
  });

  it('renders inside a main landmark with the skip-link target', () => {
    renderApp('/contact');

    expect(screen.getByRole('main')).toHaveAttribute('id', 'main-content');
  });

  it('opens at the top of the page rather than keeping the previous scroll', () => {
    renderApp('/contact');

    expect(window.scrollTo).toHaveBeenCalledWith(0, 0);
  });

  it('asks people not to send patient-identifiable information', () => {
    renderApp('/contact');

    expect(screen.getByText(/not include patient-identifiable information/i)).toBeInTheDocument();
  });
});

describe('contact form fields', () => {
  it('renders every field of the EmailJS contract, labelled and named', () => {
    renderApp('/contact');

    for (const field of CONTRACT_FIELDS) {
      const control = screen.getByLabelText(LABELS[field]);
      expect(control).toBeInTheDocument();
      expect(control).toHaveAttribute('name', field);
    }
  });

  it('uses a textarea for the message and a typed input for the email', () => {
    renderApp('/contact');

    expect(screen.getByLabelText(LABELS.message).tagName).toBe('TEXTAREA');
    expect(screen.getByLabelText(LABELS.email)).toHaveAttribute('type', 'email');
  });

  it('requires the four fields the enquiry cannot be answered without', () => {
    renderApp('/contact');

    for (const field of ['name', 'email', 'subject', 'message']) {
      expect(screen.getByLabelText(LABELS[field])).toBeRequired();
    }
  });

  it('marks the optional field as optional', () => {
    renderApp('/contact');

    expect(screen.getByLabelText(LABELS.address)).not.toBeRequired();
    expect(screen.getByText(/^Optional\./i)).toBeInTheDocument();
  });

  it('gives the submit button an accessible name', () => {
    renderApp('/contact');

    expect(screen.getByRole('button', { name: /Send enquiry/i })).toBeEnabled();
  });
});
