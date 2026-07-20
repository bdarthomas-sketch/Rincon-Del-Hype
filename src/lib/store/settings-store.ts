import { create } from "zustand";

interface SettingsStore {
  settings: Record<string, any>;
  loaded: boolean;
  load: () => void;
}

export const useSettingsStore = create<SettingsStore>((set) => ({
  settings: {},
  loaded: false,
  load: () => {
    if (typeof window === "undefined") return;
    const s = (window as any).__RDH_SETTINGS__;
    if (s) set({ settings: s, loaded: true });
  },
}));
