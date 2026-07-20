import type { CartState, CartAction } from "./types";

export function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case "ADD_ITEM": {
      const existing = state.items.find(
        (item) => item.slug === action.payload.slug && item.size === action.payload.size,
      );
      if (existing) return state;
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
