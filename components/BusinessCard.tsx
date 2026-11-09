import Link from "next/link";
import type { Business } from "@/lib/types";
import { categoryIcon, categoryLabel } from "@/lib/constants";
import { formatDistance } from "@/lib/geo";

export default function BusinessCard({
  business,
  distanceKm,
}: {
  business: Business;
  distanceKm?: number;
}) {
  const photo = business.photos[0];
  return (
    <div className="rounded-xl border border-stone-200 bg-white overflow-hidden hover:shadow-md transition-shadow">
      <Link href={`/business/${business.id}`} className="flex gap-3 p-3">
        <div className="h-20 w-20 shrink-0 rounded-lg bg-amber-50 grid place-items-center overflow-hidden">
          {photo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photo} alt={business.name} className="h-full w-full object-cover" />
          ) : (
            <span className="text-3xl" aria-hidden>
              {categoryIcon(business.category)}
            </span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-2">
            <h3 className="font-semibold truncate flex-1">{business.name}</h3>
            {distanceKm !== undefined && (
              <span className="shrink-0 rounded-full bg-amber-100 text-amber-800 text-xs font-medium px-2 py-0.5">
                {formatDistance(distanceKm)}
              </span>
            )}
          </div>
          <p className="text-sm text-stone-500">
            {categoryLabel(business.category)}
            {business.area ? ` · ${business.area}` : ""}
          </p>
          <p className="mt-1 text-sm text-stone-600 line-clamp-2">
            {business.description}
          </p>
        </div>
      </Link>
      <div className="border-t border-stone-100 px-3 py-2 flex items-center justify-between gap-2">
        <span className="text-xs text-stone-400 truncate">
          {business.address || business.area || "Chennai"}
        </span>
        {business.phone ? (
          <a
            href={`tel:${business.phone}`}
            className="shrink-0 rounded-full bg-green-600 text-white text-xs font-medium px-3 py-1.5 hover:bg-green-700"
          >
            📞 Call
          </a>
        ) : (
          <span className="shrink-0 text-xs text-stone-400">No phone listed</span>
        )}
      </div>
    </div>
  );
}
