/** Trusted-contact repository. Revocation is enforced here, not in the UI. */
import type { TrustedContact } from '../domain/types';
import { audit, db, uuid } from './db';

export type ContactInput = Pick<
  TrustedContact,
  'name' | 'phone' | 'relation' | 'channels' | 'priority'
> &
  Partial<Pick<TrustedContact, 'consent'>>;

export async function listContacts(): Promise<TrustedContact[]> {
  const all = await db.contacts.toArray();
  return all.sort((a, b) => a.priority - b.priority);
}

export async function addContact(input: ContactInput): Promise<TrustedContact> {
  const count = await db.contacts.count();
  const contact: TrustedContact = {
    id: uuid(),
    name: input.name.trim(),
    phone: normalizePhone(input.phone),
    relation: input.relation?.trim() || undefined,
    consent: input.consent ?? 'INVITED',
    priority: input.priority ?? count,
    channels: input.channels,
    createdAt: Date.now(),
  };
  await db.contacts.add(contact);
  await audit('CONTACT_ADDED', `${contact.name} (${contact.relation ?? 'no relation'})`);
  return contact;
}

export async function updateContact(
  id: string,
  patch: Partial<TrustedContact>,
): Promise<void> {
  if (patch.phone) patch.phone = normalizePhone(patch.phone);
  await db.contacts.update(id, patch);
}

export async function deleteContact(id: string): Promise<void> {
  const c = await db.contacts.get(id);
  await db.contacts.delete(id);
  await audit('CONTACT_DELETED', c?.name);
}

/**
 * Consent lifecycle: INVITED → CONSENTED → REVOKED.
 * Revocation immediately blocks any future sends for this contact.
 */
export async function setConsent(id: string, consent: TrustedContact['consent']): Promise<void> {
  const c = await db.contacts.get(id);
  await db.contacts.update(id, { consent });
  await audit('CONTACT_CONSENT', `${c?.name ?? id}: ${consent}`);
}

/** Contacts eligible to receive an automatic SOS hand-off. */
export async function sendableContacts(): Promise<TrustedContact[]> {
  const all = await listContacts();
  return all.filter((c) => c.consent === 'CONSENTED' && c.channels.length > 0);
}

/** Phone → digits for sms:/wa.me links; keeps leading + as-is for tel:/sms:. */
export function normalizePhone(raw: string): string {
  const trimmed = raw.trim().replace(/[^\d+]/g, '');
  // collapse duplicate leading + and 00 prefixes into a single +
  const digits = trimmed.replace(/^\+*/, '');
  const plus = trimmed.startsWith('+') || trimmed.startsWith('00') ? '+' : '';
  return plus + digits.replace(/^00/, '');
}

/** wa.me requires digits only, international format without '+'. */
export function phoneForWhatsApp(phone: string): string {
  return phone.replace(/^\+/, '').replace(/^00/, '');
}
