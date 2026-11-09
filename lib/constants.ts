import type { Category } from "./types";

// Chennai map scope
export const CHENNAI_CENTER: [number, number] = [13.0627, 80.2357];
// [south-west, north-east] — covers greater Chennai incl. Tambaram & Avadi fringes
export const CHENNAI_BOUNDS: [[number, number], [number, number]] = [
  [12.8, 80.05],
  [13.26, 80.4],
];
export const MAP_MIN_ZOOM = 11;
export const MAP_DEFAULT_ZOOM = 12;

export const CATEGORIES: Category[] = [
  { id: "restaurant", name: "Restaurant", icon: "🍛" },
  { id: "tiffin-center", name: "Tiffin Center", icon: "🥞" },
  { id: "bakery", name: "Bakery", icon: "🥖" },
  { id: "grocery", name: "Grocery", icon: "🛒" },
  { id: "tailor", name: "Tailor", icon: "🧵" },
  { id: "salon", name: "Salon", icon: "💇" },
  { id: "electrician", name: "Electrician", icon: "🔌" },
  { id: "plumber", name: "Plumber", icon: "🔧" },
  { id: "mechanic", name: "Mechanic", icon: "🛵" },
  { id: "pharmacy", name: "Pharmacy", icon: "💊" },
  { id: "flower-shop", name: "Flower Shop", icon: "🌼" },
  { id: "stationery", name: "Stationery", icon: "✏️" },
  { id: "other", name: "Other", icon: "🏪" },
];

export const CATEGORY_MAP: Record<string, Category> = Object.fromEntries(
  CATEGORIES.map((c) => [c.id, c])
);

export function categoryLabel(id: string): string {
  return CATEGORY_MAP[id]?.name ?? id;
}

export function categoryIcon(id: string): string {
  return CATEGORY_MAP[id]?.icon ?? "🏪";
}

// Categories whose profile page shows a menu section
export const MENU_CATEGORIES = new Set(["restaurant", "tiffin-center", "bakery"]);
