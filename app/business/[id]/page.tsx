import { notFound } from "next/navigation";
import Link from "next/link";
import { getBusiness } from "@/lib/data";
import { categoryIcon, categoryLabel, MENU_CATEGORIES } from "@/lib/constants";
import PhotoGallery from "@/components/PhotoGallery";
import BusinessMap from "@/components/BusinessMap";

export const revalidate = 60;

export default async function BusinessPage({
  params,
}: PageProps<"/business/[id]">) {
  const { id } = await params;
  const business = await getBusiness(id);
  if (!business || business.status !== "approved") notFound();

  const showMenu = MENU_CATEGORIES.has(business.category);
  const hasMenu =
    showMenu &&
    ((business.menu_items?.length ?? 0) > 0 || business.menu_photos.length > 0);
  const osmDirections = `https://www.openstreetmap.org/directions?to=${business.lat}%2C${business.lng}`;

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 flex flex-col gap-6">
      <div>
        <Link href="/" className="text-sm text-stone-500 hover:text-stone-700">
          ← All businesses
        </Link>
        <div className="mt-2 flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">{business.name}</h1>
            <p className="mt-1 text-stone-600">
              {categoryIcon(business.category)} {categoryLabel(business.category)}
              {business.area ? ` · ${business.area}` : ""}
            </p>
          </div>
        </div>
      </div>

      <PhotoGallery photos={business.photos} alt={business.name} />

      {business.description && (
        <p className="text-stone-700 leading-relaxed">{business.description}</p>
      )}

      {/* Contact card */}
      <div className="rounded-xl border border-stone-200 bg-white p-4 flex flex-col gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-stone-400">
            Address
          </p>
          <p className="mt-0.5 text-stone-700">
            {business.address || business.area || "Chennai"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {business.phone ? (
            <a
              href={`tel:${business.phone}`}
              className="flex-1 sm:flex-none text-center rounded-full bg-green-600 text-white font-medium px-6 py-2.5 hover:bg-green-700"
            >
              📞 Call {business.phone}
            </a>
          ) : (
            <p className="flex-1 sm:flex-none rounded-full bg-stone-100 text-stone-500 text-sm px-6 py-2.5 text-center">
              No phone number on record
            </p>
          )}
          <a
            href={osmDirections}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 sm:flex-none text-center rounded-full border border-stone-300 bg-white font-medium px-6 py-2.5 hover:bg-stone-50"
          >
            🧭 Directions
          </a>
        </div>
      </div>

      {/* Menu (restaurants / tiffin / bakery) */}
      {hasMenu && (
        <section>
          <h2 className="text-lg font-semibold mb-3">Menu</h2>
          {business.menu_items && business.menu_items.length > 0 && (
            <ul className="rounded-xl border border-stone-200 bg-white divide-y divide-stone-100">
              {business.menu_items.map((item, i) => (
                <li key={i} className="flex items-center justify-between px-4 py-2.5">
                  <span>{item.name}</span>
                  <span className="font-medium text-stone-700">{item.price}</span>
                </li>
              ))}
            </ul>
          )}
          {business.menu_photos.length > 0 && (
            <div className="mt-3">
              <PhotoGallery
                photos={business.menu_photos}
                alt={`${business.name} menu`}
              />
            </div>
          )}
        </section>
      )}

      {/* Location */}
      <section>
        <h2 className="text-lg font-semibold mb-3">Location</h2>
        <div className="h-64 rounded-xl overflow-hidden border border-stone-200">
          <BusinessMap
            lat={business.lat}
            lng={business.lng}
            icon={categoryIcon(business.category)}
          />
        </div>
      </section>

      {business.source === "osm" && (
        <p className="text-xs text-stone-400">
          Listing imported from{" "}
          <a
            href={
              business.osm_id
                ? `https://www.openstreetmap.org/${business.osm_id}`
                : "https://www.openstreetmap.org/copyright"
            }
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-stone-600"
          >
            OpenStreetMap
          </a>
          . Details may be out of date — spotted something wrong?{" "}
          <Link href="/suggest" className="underline hover:text-stone-600">
            Send us a correction
          </Link>
          .
        </p>
      )}
    </div>
  );
}
