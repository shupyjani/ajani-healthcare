/*
 * EmailJS configuration.
 *
 * The three identifiers are supplied at build time through Vite environment
 * variables and are never hard-coded in the repository:
 *
 *   VITE_EMAILJS_SERVICE_ID
 *   VITE_EMAILJS_TEMPLATE_ID
 *   VITE_EMAILJS_PUBLIC_KEY
 *
 * See .env.example for the shape of the file. Real .env files are ignored by
 * git, so no value ever reaches version control.
 *
 * Read through a function rather than at module scope so a missing value is a
 * state the UI can describe, not an exception thrown while the page mounts.
 */

export function getEmailConfig() {
  const env = import.meta.env ?? {};

  const serviceId = trim(env.VITE_EMAILJS_SERVICE_ID);
  const templateId = trim(env.VITE_EMAILJS_TEMPLATE_ID);
  const publicKey = trim(env.VITE_EMAILJS_PUBLIC_KEY);

  return {
    serviceId,
    templateId,
    publicKey,
    isConfigured: Boolean(serviceId && templateId && publicKey),
  };
}

function trim(value) {
  return typeof value === 'string' ? value.trim() : '';
}
