import React from 'react';

/*
 * Small inline icon set, drawn locally as SVG paths.
 *
 * Kept in-repo on purpose: the site loads no icon font, no CDN script and no
 * third-party icon package, so nothing here depends on a remote request.
 * Every icon is decorative and renders aria-hidden; meaning always comes from
 * the adjacent text.
 */

function Icon({ size = 22, children, ...props }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      focusable="false"
      aria-hidden="true"
      {...props}
    >
      {children}
    </svg>
  );
}

export function MenuIcon(props) {
  return (
    <Icon {...props}>
      <path d="M3 6h18M3 12h18M3 18h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </Icon>
  );
}

export function CloseIcon(props) {
  return (
    <Icon {...props}>
      <path d="M5 5l14 14M19 5L5 19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </Icon>
  );
}

export function ExternalLinkIcon(props) {
  return (
    <Icon size={14} {...props}>
      <path
        d="M7 17L17 7M9 7h8v8"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Icon>
  );
}

/* Workforce: people arranged as a staffed team. */
export function WorkforceIcon(props) {
  return (
    <Icon size={20} {...props}>
      <circle cx="9" cy="8" r="3" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M3.5 19v-1.2A4.3 4.3 0 0 1 7.8 13.5h2.4a4.3 4.3 0 0 1 4.3 4.3V19"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <circle cx="17.5" cy="9.5" r="2.2" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M16.5 14h1.2A2.8 2.8 0 0 1 20.5 16.8V19"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </Icon>
  );
}

/* Digital products and UX: an interface frame with a pointer. */
export function DigitalIcon(props) {
  return (
    <Icon size={20} {...props}>
      <rect
        x="3"
        y="4"
        width="18"
        height="13"
        rx="2"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path d="M3 8h18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="6" cy="6" r="0.9" fill="currentColor" />
      <path
        d="M11 11.2l5 4.4-2.2.5-.6 2.2z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </Icon>
  );
}

/* Operations and readiness: a checked assurance frame. */
export function ReadinessIcon(props) {
  return (
    <Icon size={20} {...props}>
      <path
        d="M12 3.2l7 2.6v5.4c0 4.1-2.8 7.4-7 9.6-4.2-2.2-7-5.5-7-9.6V5.8z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path
        d="M8.8 11.9l2.3 2.3 4.1-4.4"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Icon>
  );
}
