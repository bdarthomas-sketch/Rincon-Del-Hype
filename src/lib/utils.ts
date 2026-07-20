import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const priceFormatter = new Intl.NumberFormat("en-US", {
  style: "decimal",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

export function formatPrice(price: number): string {
  return `$${priceFormatter.format(price)}`;
}

export function scrollToHash(hashOrHref: string) {
  const id = hashOrHref.replace(/^\/?#/, "");
  const el = document.getElementById(id);
  if (el) {
    el.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

export function isHomePage() {
  return window.location.pathname === "/";
}

export function getResponsiveSrcSet(baseUrl: string): string {
  if (!baseUrl || baseUrl.startsWith('data:')) return '';
  const sizes = [320, 480, 768, 1024, 1536];
  return sizes
    .map(w => `${baseUrl}?w=${w} ${w}w`)
    .join(', ');
}

export function getResponsiveSizes(breakpoints: string[] = ['(max-width: 640px) 50vw', '(max-width: 1024px) 33vw', '25vw']): string {
  return breakpoints.join(', ');
}
