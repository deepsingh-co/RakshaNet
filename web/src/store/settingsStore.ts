import { create } from 'zustand';
import { getProfile, saveProfile } from '../data/db';
import type { Profile } from '../domain/types';

interface SettingsState {
  profile: Profile;
  loaded: boolean;
  load: () => Promise<void>;
  save: (profile: Profile) => Promise<void>;
}

export const useSettings = create<SettingsState>((set) => ({
  profile: {},
  loaded: false,
  load: async () => {
    set({ profile: await getProfile(), loaded: true });
  },
  save: async (profile) => {
    await saveProfile(profile);
    set({ profile });
  },
}));
