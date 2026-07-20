import type { CartState } from "./types";

const STORAGE_KEY = "rdh-cart";

export interface PersistenceAdapter {
  load: () => CartState;
  save: (state: CartState) => void;
}

export const localStorageAdapter: PersistenceAdapter = {
  load: () => {
    if (typeof window === "undefined") return { items: [] };
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && Array.isArray(parsed.items)) {
          return parsed as CartState;
        }
      }
    } catch {
      // ignore parse errors
    }
    return { items: [] };
  },
  save: (state) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // ignore storage errors
    }
  },
};
