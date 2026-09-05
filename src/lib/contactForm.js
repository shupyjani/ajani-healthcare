/*
 * The contact form, described as data.
 *
 * Every field, its validation and its submitted payload key are declared once
 * in FIELDS. The Contact component renders whatever is in this list and holds
 * no per-field state of its own, so adding or reordering a field is an edit
 * here alone.
 *
 * The `name` of each field is also its EmailJS template variable. The set —
 * name, email, address, subject, message — is the existing provider contract
 * and must not be renamed here without the EmailJS template being changed to
 * match.
 */

export const FIELDS = [
  {
    name: 'name',
    label: 'Your name',
    type: 'text',
    autoComplete: 'name',
    required: true,
    requiredMessage: 'Enter your name so we know who we are replying to.',
  },
  {
    name: 'email',
    label: 'Email address',
    type: 'email',
    autoComplete: 'email',
    required: true,
    requiredMessage: 'Enter an email address so we can reply.',
    /* Deliberately permissive. The form should not be the thing that decides
       an unusual but valid address is wrong; delivery will. */
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    patternMessage: 'Enter an email address in the format name@example.com.',
  },
  {
    name: 'address',
    label: 'Organisation or address',
    type: 'text',
    autoComplete: 'organization',
    required: false,
    hint: 'Optional. Helpful if your enquiry relates to a specific site or service.',
  },
  {
    name: 'subject',
    label: 'Subject',
    type: 'text',
    required: true,
    requiredMessage: 'Add a short subject so your enquiry reaches the right person.',
  },
  {
    name: 'message',
    label: 'Message',
    type: 'textarea',
    rows: 6,
    required: true,
    requiredMessage: 'Add a message describing what you would like to discuss.',
  },
];

/* Blank values for every declared field, in declaration order. */
export function emptyValues() {
  return Object.fromEntries(FIELDS.map((field) => [field.name, '']));
}

/**
 * Validate the whole form at once.
 * Returns an object keyed by field name; an empty object means valid.
 */
export function validate(values) {
  const errors = {};

  for (const field of FIELDS) {
    const value = (values[field.name] ?? '').trim();

    if (field.required && value === '') {
      errors[field.name] = field.requiredMessage;
      continue;
    }

    if (value !== '' && field.pattern && !field.pattern.test(value)) {
      errors[field.name] = field.patternMessage;
    }
  }

  return errors;
}

/* Trimmed payload containing exactly the contract's five keys. */
export function toPayload(values) {
  return Object.fromEntries(
    FIELDS.map((field) => [field.name, (values[field.name] ?? '').trim()]),
  );
}

/* --- Reducer ---------------------------------------------------------- */

export const INITIAL_STATE = {
  values: emptyValues(),
  errors: {},
  status: 'idle', // idle | invalid | sending | sent | error
};

export function formReducer(state, action) {
  switch (action.type) {
    case 'edit': {
      /* Clearing the field's error as the user types means a corrected field
         stops being announced as invalid without waiting for a resubmit. */
      const { [action.field]: _removed, ...errors } = state.errors;
      return {
        ...state,
        values: { ...state.values, [action.field]: action.value },
        errors,
        status: state.status === 'sent' || state.status === 'error' ? 'idle' : state.status,
      };
    }
    case 'invalid':
      return { ...state, errors: action.errors, status: 'invalid' };
    case 'sending':
      return { ...state, errors: {}, status: 'sending' };
    case 'sent':
      return { values: emptyValues(), errors: {}, status: 'sent' };
    case 'failed':
      return { ...state, status: 'error' };
    default:
      return state;
  }
}
