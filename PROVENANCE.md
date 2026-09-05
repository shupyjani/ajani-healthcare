# Provenance

An engineering record of where the material in this repository comes from. It is written to be
accurate rather than flattering, and it is scoped to what has actually been examined.

## Repository history

This repository has its own independent Git root. It is not configured as a fork of any other
repository, and it shares no commit history with one.

## Relationship to the earlier Ajani prototype

Ajani Healthcare business content, branding and approved design work were carried forward from
an earlier Ajani redesign prototype and refined here. That material — the site copy, the
positioning of the three capabilities, the product descriptions, the design tokens and the
brand direction — is Ajani-created or Ajani-commissioned work, and it is reused here
deliberately.

A local read-only comparison audit of the reachable root commit identified no substantive
implementation or visual asset originating from the original upstream starter project that the
earlier prototype was built on.

## Work implemented for this repository

The following were implemented directly for this clean repository rather than carried forward:

- the application shell and routing;
- the site header, primary navigation and footer;
- the section-navigation and scroll/focus behaviour;
- the contact form architecture and its provider integration boundary;
- the motion system;
- the hero diagram;
- the test suite and the lint configuration.

## Brand assets

The Ajani brand mark is defined as geometry maintained in this repository
(`src/lib/brandMarkGeometry.js`). The favicon, PWA and Apple touch icons in `public/` are
generated locally from that same geometry by `scripts/generate-icons.mjs`, using only Node's
standard library. No third-party artwork, icon package, stock photography or remote font is
used anywhere in the site.

## Third-party dependencies

Third-party software dependencies are not covered by this record and remain subject to their
own licences. The packages distributed in the production build, their versions and their
required notices are listed in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).

## Scope of this record

This is an engineering provenance record. It describes what was examined and what was found.

It is not a legal opinion, and it is not a representation that every conventional pattern in the
codebase is unique or legally protectable. Ordinary framework idioms, configuration shapes and
widely used implementation approaches appear here as they do in most projects of this kind.

Copyright © 2026 Ajani Healthcare. All rights reserved. This statement covers Ajani Healthcare's
own material in this repository and does not affect the third-party dependency licences
referenced above.
