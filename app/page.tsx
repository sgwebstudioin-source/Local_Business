import DirectoryView from "@/components/DirectoryView";
import {
  getApprovedBusinesses,
  isSupabaseConfigured,
  isUsingImportedData,
} from "@/lib/data";

export const revalidate = 60;

export default async function HomePage() {
  const businesses = await getApprovedBusinesses();

  return (
    <div>
      <section className="bg-gradient-to-b from-amber-50 to-stone-50 border-b border-amber-100">
        <div className="mx-auto max-w-5xl px-4 py-8 sm:py-12">
          <h1 className="text-2xl sm:text-4xl font-bold tracking-tight">
            Find the local shops Chennai runs on
          </h1>
          <p className="mt-2 text-stone-600 max-w-xl">
            Tiffin centers, tailors, groceries, electricians and more — small
            businesses without websites, all in one place.
          </p>
        </div>
      </section>

      {!isSupabaseConfigured && (
        <div className="mx-auto max-w-5xl px-4 pt-4">
          <p className="rounded-lg bg-blue-50 border border-blue-200 text-blue-800 text-sm px-4 py-2">
            {isUsingImportedData ? (
              <>
                Reading {businesses.length.toLocaleString("en-IN")} listings
                imported from OpenStreetMap. Connect Supabase (see README) to
                accept public submissions and edit listings.
              </>
            ) : (
              <>
                Demo mode: showing a few sample listings. Run{" "}
                <code>node scripts/import-osm.mjs</code> to load real Chennai
                businesses, and set up <code>.env.local</code> to go live.
              </>
            )}
          </p>
        </div>
      )}

      <DirectoryView businesses={businesses} />
    </div>
  );
}
