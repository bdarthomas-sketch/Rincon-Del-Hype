import type { Product, Category } from "./types";
import { fetchAllProducts, fetchProductBySlug, fetchCategories } from "../lib/api";

async function loadProducts(): Promise<Product[]> {
  return fetchAllProducts();
}

async function loadCategories(): Promise<Category[]> {
  return fetchCategories();
}

export const PRICE_RANGES = [
  { label: "Menos de $100", min: 0, max: 100 },
  { label: "$100 - $150", min: 100, max: 150 },
  { label: "$150 - $200", min: 150, max: 200 },
  { label: "Más de $200", min: 200, max: Infinity },
] as const;

export const PRODUCT_IMAGE_PADDING: Record<string, string> = {
  "sweatpant-pearl": "p-4",
  "corteiz-boxers-pack-x3": "p-0 sm:p-8",
  "off-white-tee-bacchus-slim": "p-5 sm:p-12",
};

export async function getAllProducts(): Promise<Product[]> {
  return loadProducts();
}

export async function getProductBySlug(slug: string): Promise<Product | undefined> {
  return (await fetchProductBySlug(slug)) ?? undefined;
}

export async function getCategories(): Promise<Category[]> {
  return loadCategories();
}

export async function getBrands(): Promise<string[]> {
  const products = await loadProducts();
  const brands = products.flatMap((p) => [p.brand, ...(p.brands ?? [])]);
  return [...new Set(brands)].sort();
}

export async function getSizes(): Promise<string[]> {
  const products = await loadProducts();
  const all = products.flatMap((p) => p.sizes?.map((s) => s.label) ?? []);
  return [...new Set(all)].sort((a, b) => {
    if (a === "ONE SIZE") return -1;
    if (b === "ONE SIZE") return 1;
    const aNum = Number(a);
    const bNum = Number(b);
    if (!isNaN(aNum) && !isNaN(bNum)) return aNum - bNum;
    if (!isNaN(aNum)) return -1;
    if (!isNaN(bNum)) return 1;
    return a.localeCompare(b);
  });
}
