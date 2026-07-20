import { useSyncExternalStore } from "react";
import type { CartItem } from "./types";
import { cartReducer } from "./reducer";
import { localStorageAdapter } from "./persistence";

type Listener = () => void;

const listeners = new Set<Listener>();

let items: CartItem[] = [];
let isDrawerOpen = false;
let hydrated = false;

if (typeof window !== "undefined") {
  items = localStorageAdapter.load().items;
  hydrated = true;
}

function notify() {
  listeners.forEach((l) => l());
}

function persist() {
  if (hydrated) localStorageAdapter.save({ items });
}

export function getItemsSnapshot() {
  return items;
}

export function getDrawerSnapshot() {
  return isDrawerOpen;
}

export function subscribe(listener: Listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function addItem(item: CartItem) {
  const next = cartReducer({ items }, { type: "ADD_ITEM", payload: item });
  items = next.items;
  persist();
  notify();
}

export function removeItem(slug: string, size: string) {
  const next = cartReducer({ items }, { type: "REMOVE_ITEM", payload: { slug, size } });
  items = next.items;
  persist();
  notify();
}

export function clearCart() {
  const next = cartReducer({ items }, { type: "CLEAR_CART" });
  items = next.items;
  persist();
  notify();
}

export function openDrawer() {
  isDrawerOpen = true;
  notify();
}

export function closeDrawer() {
  isDrawerOpen = false;
  notify();
}

export function toggleDrawer() {
  isDrawerOpen = !isDrawerOpen;
  notify();
}

export function useCartStore() {
  const snapshot = useSyncExternalStore(subscribe, getItemsSnapshot, getItemsSnapshot);
  const drawerOpen = useSyncExternalStore(subscribe, getDrawerSnapshot, getDrawerSnapshot);

  return {
    items: snapshot,
    totalItems: snapshot.reduce((sum, item) => sum + item.quantity, 0),
    totalPrice: snapshot.reduce((sum, item) => sum + item.price * item.quantity, 0),
    isDrawerOpen: drawerOpen,
    addItem,
    removeItem,
    clearCart,
    openDrawer,
    closeDrawer,
    toggleDrawer,
  };
}
