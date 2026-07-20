export type Category =
  | "Sneakers"
  | "Remeras"
  | "Hoodies"
  | "Pantalones"
  | "Conjuntos"
  | "Accesorios";

export interface ProductSize {
  label: string;
  stock: number;
}

export interface Product {
  id: string;
  slug: string;
  name: string;
  brand: string;
  brands?: string[];
  price: number;
  image: string;
  images?: string[];
  category?: Category;
  description?: string;
  sizes?: ProductSize[];
  isNew?: boolean;
  auto_trim?: boolean;
  image_margin?: number;
  image_scale?: number;
  image_offset_x?: number;
  image_offset_y?: number;
  image_mode?: string;
  image_padding?: number;
  out_of_stock_message?: string;
}
