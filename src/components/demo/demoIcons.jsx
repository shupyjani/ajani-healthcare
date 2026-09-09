import React from 'react';

/*
 * The demo's own small icon set, drawn locally as inline SVG.
 *
 * Same rule as src/components/icons.jsx: no icon font, no CDN, no third-party
 * package. Every icon is decorative and renders aria-hidden — meaning always
 * comes from the text beside it, which is also what keeps status legible when
 * colour is not available.
 */

function Glyph({ size = 20, children, ...props }) {
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

/* Today: a sun over the horizon, matching the tab mark in the captures. */
export function TodayGlyph(props) {
  return (
    <Glyph {...props}>
      <circle cx="12" cy="12" r="3.4" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M12 4.2v1.6M12 18.2v1.6M4.2 12h1.6M18.2 12h1.6M6.5 6.5l1.1 1.1M16.4 16.4l1.1 1.1M17.5 6.5l-1.1 1.1M7.6 16.4l-1.1 1.1"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </Glyph>
  );
}

/* Visits: a list. */
export function VisitsGlyph(props) {
  return (
    <Glyph {...props}>
      <rect x="3" y="5" width="18" height="14" rx="2.5" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M7 9.5h4M7 12.5h10M7 15.5h7"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </Glyph>
  );
}

/* More: the three-dot disc. */
export function MoreGlyph(props) {
  return (
    <Glyph {...props}>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="8.2" cy="12" r="1.2" fill="currentColor" />
      <circle cx="12" cy="12" r="1.2" fill="currentColor" />
      <circle cx="15.8" cy="12" r="1.2" fill="currentColor" />
    </Glyph>
  );
}

export function ClockGlyph(props) {
  return (
    <Glyph size={16} {...props}>
      <circle cx="12" cy="12" r="8.2" stroke="currentColor" strokeWidth="1.9" />
      <path d="M12 7.6V12l3 1.8" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
    </Glyph>
  );
}

export function PinGlyph(props) {
  return (
    <Glyph size={16} {...props}>
      <path
        d="M12 3.5a4.3 4.3 0 0 0-4.3 4.3c0 3 4.3 7.2 4.3 7.2s4.3-4.2 4.3-7.2A4.3 4.3 0 0 0 12 3.5Z"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path d="M9 20.5h6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </Glyph>
  );
}

export function RouteGlyph(props) {
  return (
    <Glyph size={16} {...props}>
      <circle cx="6" cy="6.5" r="2.3" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="18" cy="17.5" r="2.3" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M6 8.8v3.4a3 3 0 0 0 3 3h6a3 3 0 0 1 3 3"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </Glyph>
  );
}

/* Carried by the Completed badge, so the status is a shape as well as a
   colour and a word. */
export function CheckGlyph(props) {
  return (
    <Glyph size={14} {...props}>
      <path
        d="M5 12.5l4.4 4.3L19 7.5"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Glyph>
  );
}

export function BackGlyph(props) {
  return (
    <Glyph size={20} {...props}>
      <path
        d="M14.5 5.5 8 12l6.5 6.5"
        stroke="currentColor"
        strokeWidth="2.1"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Glyph>
  );
}

export function SearchGlyph(props) {
  return (
    <Glyph size={17} {...props}>
      <circle cx="10.8" cy="10.8" r="6" stroke="currentColor" strokeWidth="1.9" />
      <path d="m15.3 15.3 4 4" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
    </Glyph>
  );
}

export function PersonGlyph(props) {
  return (
    <Glyph size={16} {...props}>
      <circle cx="12" cy="8.4" r="3.4" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M5.5 19.2a6.5 6.5 0 0 1 13 0"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </Glyph>
  );
}

export function BadgeGlyph(props) {
  return (
    <Glyph size={16} {...props}>
      <rect x="3.2" y="5.5" width="17.6" height="13" rx="2.4" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="8.8" cy="11" r="1.9" stroke="currentColor" strokeWidth="1.6" />
      <path d="M14 10h4M14 13.4h4M5.6 15.4a3.6 3.6 0 0 1 6.4 0" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </Glyph>
  );
}

export function ReferenceGlyph(props) {
  return (
    <Glyph size={16} {...props}>
      <path
        d="M9.4 4.2 7.8 19.8M16.2 4.2l-1.6 15.6M4.4 9.2h15.2M3.8 14.8h15.2"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </Glyph>
  );
}

export function AppGlyph(props) {
  return (
    <Glyph size={16} {...props}>
      <rect x="4.5" y="4.5" width="15" height="15" rx="4" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="17" cy="7" r="2.4" fill="currentColor" />
    </Glyph>
  );
}
