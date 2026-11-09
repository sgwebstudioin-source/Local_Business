export type BusinessStatus = "pending" | "approved" | "rejected";

export type MenuItem = {
  name: string;
  price: string; // stored as text so "₹40 / plate" etc. works
};

export type Business = {
  id: string;
  name: string;
  category: string; // category slug, e.g. "restaurant"
  description: string;
  /** Null for imported listings where no number is on record yet. */
  phone: string | null;
  address: string;
  area: string | null; // neighbourhood, e.g. "T. Nagar"
  lat: number;
  lng: number;
  photos: string[]; // storage public URLs
  menu_photos: string[]; // storage public URLs (restaurants/tiffin only)
  menu_items: MenuItem[] | null;
  status: BusinessStatus;
  created_at: string;
  /** "osm" for OpenStreetMap imports, "user" for public submissions. */
  source?: string | null;
  osm_id?: string | null;
};

export type Category = {
  id: string; // slug
  name: string;
  icon: string; // emoji
};
