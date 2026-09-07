/*
 * Single source of truth for the site's outbound links and navigation.
 * Keeping them here means the Navbar, Footer, Products section and tests all
 * agree, and a URL change is a one-line edit.
 */

/* Ajani Workforce: the public pre-production preview and its open repository.
   Both are carried over unchanged from the existing published site. */
export const WORKFORCE_PREVIEW_URL = 'https://workforce.ajanihealthcare.com/';
export const WORKFORCE_REPO_URL = 'https://github.com/shupyjani/ajani-workforce';

/* Ajani Field Operations: the open repository for Ajani Mobile, its native
   SwiftUI iPhone application. There is no preview URL to pair with it — the
   application is native, so the source is what a reader can actually open. */
export const FIELD_OPERATIONS_REPO_URL = 'https://github.com/shupyjani/field-operations-ios';

/* The Ajani Mobile case study. A route rather than a section, so it is not a
   member of SECTION_LINKS: those are in-page anchors on the home route and
   SectionLink builds "/#id" hrefs from them. */
export const AJANI_MOBILE_ROUTE = '/products/ajani-mobile';

export const SITE_NAME = 'Ajani Healthcare';

/* The published enquiry address. Used as the fallback route when the contact
   form has no email provider configured for the build. */
export const CONTACT_EMAIL = 'contact@ajanihealthcare.com';

/* The top of the home page. The hero section carries this id and the brand
   link targets it, so a rename cannot leave the logo pointing at nothing. */
export const HOME_SECTION_ID = 'home-section';

/* In-page sections of the home route, in document order. */
export const SECTION_LINKS = [
  { id: 'services', label: 'Services' },
  { id: 'products', label: 'Products' },
  { id: 'about', label: 'About' },
];
