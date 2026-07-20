const PLACEHOLDER =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400'%3E%3Crect fill='%23111' width='400' height='400'/%3E%3Ctext fill='%23666' font-family='sans-serif' font-size='14' text-anchor='middle' x='200' y='205'%3ESin imagen%3C/text%3E%3C/svg%3E";

export function getProductImageUrl(url?: string | null): string {
  return url || PLACEHOLDER;
}
