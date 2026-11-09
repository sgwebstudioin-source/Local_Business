import { getSupabase, isSupabaseConfigured } from "./supabase/client";
import { SAMPLE_BUSINESSES } from "./sample-data";
import importedBusinesses from "./chennai-businesses.json";
import type { Business } from "./types";

export { isSupabaseConfigured };

/**
 * Demo-mode dataset: the OpenStreetMap import when it has been run
 * (`node scripts/import-osm.mjs`), otherwise the handful of hand-written
 * samples so a fresh clone still shows something.
 */
const DEMO_BUSINESSES: Business[] =
  (importedBusinesses as Business[]).length > 0
    ? (importedBusinesses as Business[])
    : SAMPLE_BUSINESSES;

export const demoBusinessCount = DEMO_BUSINESSES.length;
export const isUsingImportedData = (importedBusinesses as Business[]).length > 0;

function normalize(row: Record<string, unknown>): Business {
  return {
    ...(row as unknown as Business),
    photos: (row.photos as string[] | null) ?? [],
    menu_photos: (row.menu_photos as string[] | null) ?? [],
    menu_items: (row.menu_items as Business["menu_items"]) ?? null,
  };
}

/** Approved listings for the public directory. */
export async function getApprovedBusinesses(): Promise<Business[]> {
  const supabase = getSupabase();
  if (!supabase) return DEMO_BUSINESSES;

  const { data, error } = await supabase
    .from("businesses")
    .select("*")
    .eq("status", "approved")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Failed to load businesses:", error.message);
    return [];
  }
  return (data ?? []).map(normalize);
}

/** Single listing by id (approved only via RLS when using anon key). */
export async function getBusiness(id: string): Promise<Business | null> {
  const supabase = getSupabase();
  if (!supabase) return DEMO_BUSINESSES.find((b) => b.id === id) ?? null;

  const { data, error } = await supabase
    .from("businesses")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error("Failed to load business:", error.message);
    return null;
  }
  return data ? normalize(data) : null;
}
