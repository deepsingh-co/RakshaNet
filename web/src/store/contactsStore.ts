import { create } from 'zustand';
import type { TrustedContact } from '../domain/types';
import {
  addContact,
  deleteContact as deleteContactRepo,
  listContacts,
  setConsent as setConsentRepo,
  updateContact as updateContactRepo,
  type ContactInput,
} from '../data/contactsRepo';

interface ContactsState {
  contacts: TrustedContact[];
  loaded: boolean;
  load: () => Promise<void>;
  add: (input: ContactInput) => Promise<TrustedContact>;
  update: (id: string, patch: Partial<TrustedContact>) => Promise<void>;
  remove: (id: string) => Promise<void>;
  setConsent: (id: string, consent: TrustedContact['consent']) => Promise<void>;
}

export const useContacts = create<ContactsState>((set) => ({
  contacts: [],
  loaded: false,
  load: async () => {
    set({ contacts: await listContacts(), loaded: true });
  },
  add: async (input) => {
    const contact = await addContact(input);
    set({ contacts: await listContacts() });
    return contact;
  },
  update: async (id, patch) => {
    await updateContactRepo(id, patch);
    set({ contacts: await listContacts() });
  },
  remove: async (id) => {
    await deleteContactRepo(id);
    set({ contacts: await listContacts() });
  },
  setConsent: async (id, consent) => {
    await setConsentRepo(id, consent);
    set({ contacts: await listContacts() });
  },
}));
