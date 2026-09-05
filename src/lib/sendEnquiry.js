import { send } from '@emailjs/browser';
import { getEmailConfig } from './emailConfig';

/**
 * Deliver a contact enquiry through EmailJS.
 *
 * The payload keys are passed straight through as template variables, which is
 * what preserves the existing provider contract: name, email, address, subject
 * and message reach the template under exactly those names.
 *
 * Resolves on success and rejects on anything else, so the caller only has to
 * distinguish two outcomes.
 */
export async function sendEnquiry(payload) {
  const { serviceId, templateId, publicKey, isConfigured } = getEmailConfig();

  if (!isConfigured) {
    throw new Error('EmailJS is not configured for this build.');
  }

  return send(serviceId, templateId, payload, { publicKey });
}

export default sendEnquiry;
