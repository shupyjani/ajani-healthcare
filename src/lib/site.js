/*
 * Single source of truth for the site's outbound links and navigation.
 * Keeping them here means the Navbar, Footer, Products section and tests all
 * agree, and a URL change is a one-line edit.
 */

/* Ajani Workforce: the public pre-production preview and its open repository.
   Both are carried over unchanged from the existing published site. */
export const WORKFORCE_PREVIEW_URL = 'https://workforce.ajanihealthcare.com/';
export const WORKFORCE_REPO_URL = 'https://github.com/shupyjani/ajani-workforce';

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
