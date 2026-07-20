export interface CartItem {
  productId: string;
  slug: string;
  name: string;
  brand: string;
  price: number;
  image: string;
  size: string;
  quantity: number;
}

export interface CartState {
  items: CartItem[];
}

export type CartAction =
  | { type: "ADD_ITEM"; payload: CartItem }
  | { type: "REMOVE_ITEM"; payload: { slug: string; size: string } }
  | { type: "CLEAR_CART" }
  | { type: "HYDRATE"; payload: CartState };
