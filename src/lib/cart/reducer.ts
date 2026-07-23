import type { CartState, CartAction } from "./types";

export function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case "ADD_ITEM": {
      const existing = state.items.findIndex(
        (item) => item.slug === action.payload.slug && item.size === action.payload.size,
      );
      if (existing !== -1) {
        const next = [...state.items];
        next[existing] = { ...next[existing], quantity: next[existing].quantity + action.payload.quantity };
        return { items: next };
      }
      return { items: [...state.items, action.payload] };
    }
    case "REMOVE_ITEM":
      return {
        items: state.items.filter(
          (item) => !(item.slug === action.payload.slug && item.size === action.payload.size),
        ),
      };
    case "CLEAR_CART":
      return { items: [] };
    case "HYDRATE":
      return action.payload;
    default:
      return state;
  }
}
