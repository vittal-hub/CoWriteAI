import dns from 'dns/promises';
import validator from 'validator';

// Reusable, provider-agnostic deliverability check: format -> domain existence.
// Returns { valid: true } or { valid: false, reason: 'format' | 'domain' }.
// Cannot confirm the individual mailbox exists (that needs sending a real
// email) — this only proves the domain is a real, mail-capable host.
export async function validateEmailDeliverability(email) {
  if (typeof email !== 'string' || !validator.isEmail(email)) {
    return { valid: false, reason: 'format' };
  }

  const domain = email.split('@')[1].toLowerCase();

  try {
    const mxRecords = await dns.resolveMx(domain);
    if (mxRecords.length > 0) return { valid: true };
  } catch {
    // no MX records — fall through to the A/AAAA fallback below
  }

  // RFC 5321 §5.1: a domain with no MX record can still accept mail at its
  // A/AAAA address, so a plain host lookup is a valid fallback before rejecting.
  try {
    await dns.resolve(domain);
    return { valid: true };
  } catch {
    return { valid: false, reason: 'domain' };
  }
}
