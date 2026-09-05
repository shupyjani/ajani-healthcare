import { describe, expect, it } from 'vitest';
import {
  FIELDS,
  INITIAL_STATE,
  emptyValues,
  formReducer,
  toPayload,
  validate,
} from '../lib/contactForm';

const COMPLETE = {
  name: 'Ada Okafor',
  email: 'ada@example.org',
  address: '  Northside Community Trust  ',
  subject: 'Rota cover',
  message: 'Weekend cover for a district nursing team.',
};

describe('field descriptors', () => {
  it('declare exactly the EmailJS contract, in order', () => {
    expect(FIELDS.map((field) => field.name)).toEqual([
      'name',
      'email',
      'address',
      'subject',
      'message',
    ]);
  });

  it('start every field blank', () => {
    expect(emptyValues()).toEqual({
      name: '',
      email: '',
      address: '',
      subject: '',
      message: '',
    });
  });
});

describe('validate', () => {
  it('accepts a complete submission', () => {
    expect(validate(COMPLETE)).toEqual({});
  });

  it('flags every required field when nothing is filled in', () => {
    expect(Object.keys(validate(emptyValues()))).toEqual([
      'name',
      'email',
      'subject',
      'message',
    ]);
  });

  it('treats whitespace as empty', () => {
    expect(validate({ ...COMPLETE, name: '   ' })).toHaveProperty('name');
  });

  it('checks the shape of an email address only when one is given', () => {
    expect(validate({ ...COMPLETE, email: 'ada@example' })).toHaveProperty('email');
    expect(validate({ ...COMPLETE, address: '' })).toEqual({});
  });
});

describe('toPayload', () => {
  it('emits the five contract keys, trimmed', () => {
    const payload = toPayload(COMPLETE);

    expect(Object.keys(payload)).toEqual(['name', 'email', 'address', 'subject', 'message']);
    expect(payload.address).toBe('Northside Community Trust');
  });

  it('emits a key for a field that was never touched', () => {
    expect(toPayload({ name: 'Ada' })).toEqual({
      name: 'Ada',
      email: '',
      address: '',
      subject: '',
      message: '',
    });
  });
});

describe('formReducer', () => {
  it('records an edit and drops that field error', () => {
    const invalid = formReducer(INITIAL_STATE, {
      type: 'invalid',
      errors: { name: 'Enter your name.', email: 'Enter an email.' },
    });

    const edited = formReducer(invalid, { type: 'edit', field: 'name', value: 'Ada' });

    expect(edited.values.name).toBe('Ada');
    expect(edited.errors).toEqual({ email: 'Enter an email.' });
  });

  it('moves through sending to sent, clearing the form', () => {
    const filled = formReducer(INITIAL_STATE, {
      type: 'edit',
      field: 'name',
      value: 'Ada',
    });

    expect(formReducer(filled, { type: 'sending' }).status).toBe('sending');

    const sent = formReducer(filled, { type: 'sent' });
    expect(sent.status).toBe('sent');
    expect(sent.values).toEqual(emptyValues());
  });

  it('keeps what was typed when the send fails', () => {
    const filled = formReducer(INITIAL_STATE, {
      type: 'edit',
      field: 'message',
      value: 'Weekend cover',
    });

    const failed = formReducer(filled, { type: 'failed' });
    expect(failed.status).toBe('error');
    expect(failed.values.message).toBe('Weekend cover');
  });

  it('returns to idle when a resolved form is edited again', () => {
    const sent = formReducer(INITIAL_STATE, { type: 'sent' });
    const edited = formReducer(sent, { type: 'edit', field: 'name', value: 'A' });

    expect(edited.status).toBe('idle');
  });
});
