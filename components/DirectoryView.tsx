"use client";

import { useCallback, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import type { Business } from "@/lib/types";
import { CATEGORIES } from "@/lib/constants";
import {
  DEFAULT_RADIUS_KM,
  distanceKm as distanceBetween,
  isInChennai,
  type Origin,
} from "@/lib/geo";
import { useOrigin } from "@/lib/use-origin";
import BusinessCard from "./BusinessCard";
import LocationBar, { type LocateState } from "./LocationBar";

// Leaflet touches `window`, so the map must skip SSR
const MapView = dynamic(() => import("./MapView"), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full grid place-items-center text-stone-400">
      Loading map…
    </div>
  ),
});

type Result = { business: Business; distanceKm?: number };

const PAGE_SIZE = 48;

export default function DirectoryView({ businesses }: { businesses: Business[] }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string | null>(null);
  const [view, setView] = useState<"list" | "map">("list");

  // Restored from the last visit, so a phone user isn't re-prompted each time.
  const [origin, setOrigin] = useOrigin();
  const [radiusKm, setRadiusKm] = useState<number | null>(DEFAULT_RADIUS_KM);
  const [locateState, setLocateState] = useState<LocateState>("idle");
  const [pickMode, setPickMode] = useState(false);

  const applyOrigin = useCallback(
    (next: Origin) => {
      setOrigin(next);
      setPickMode(false);
      setLocateState("idle");
    },
    [setOrigin]
  );

  const handleUseMyLocation = useCallback(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setLocateState("unavailable");
      return;
    }
    setLocateState("locating");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const next: Origin = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          source: "gps",
        };
        // The directory only covers Chennai, so a pin elsewhere is useless.
        if (!isInChennai(next)) {
          setLocateState("outside");
          return;
        }
        applyOrigin(next);
      },
      (err) => {
        setLocateState(
          err.code === err.PERMISSION_DENIED ? "denied" : "unavailable"
        );
      },
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 60_000 }
    );
  }, [applyOrigin]);

  const handleStartPicking = useCallback(() => {
    setPickMode(true);
    setView("map"); // they need to see the map to tap it
  }, []);

  const handleClearLocation = useCallback(() => {
    setOrigin(null);
    setLocateState("idle");
  }, [setOrigin]);

  const showList = useCallback(() => {
    setView("list");
    setPickMode(false);
  }, []);

  const { results, matchedCount } = useMemo<{
    results: Result[];
    matchedCount: number;
  }>(() => {
    const q = query.trim().toLowerCase();
    const matched = businesses.filter((b) => {
      if (category && b.category !== category) return false;
      if (!q) return true;
      return [b.name, b.description, b.address, b.area ?? ""]
        .join(" ")
        .toLowerCase()
        .includes(q);
    });

    if (!origin) {
      return { results: matched.map((business) => ({ business })), matchedCount: matched.length };
    }

    const results = matched
      .map((business) => ({
        business,
        distanceKm: distanceBetween(origin, business),
      }))
      .filter((r) => radiusKm === null || r.distanceKm <= radiusKm)
      .sort((a, b) => a.distanceKm - b.distanceKm);

    return { results, matchedCount: matched.length };
  }, [businesses, query, category, origin, radiusKm]);

  const mapBusinesses = useMemo(
    () => results.map((r) => ({ ...r.business, distanceKm: r.distanceKm })),
    [results]
  );

  // Render the list in pages — Chennai has thousands of listings.
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const filterKey = `${query}|${category}|${origin?.lat ?? ""},${origin?.lng ?? ""}|${radiusKm}`;
  const [lastFilterKey, setLastFilterKey] = useState(filterKey);
  if (lastFilterKey !== filterKey) {
    // Adjusting state during render is the supported way to reset on a change.
    setLastFilterKey(filterKey);
    setVisibleCount(PAGE_SIZE);
  }
  const shown = results.slice(0, visibleCount);

  // "Nothing nearby" only when the radius is what hid the matches — if the
  // search itself matched nothing, say that instead.
  const hiddenByRadius =
    origin !== null &&
    radiusKm !== null &&
    results.length === 0 &&
    matchedCount > 0;

  return (
    <div className="mx-auto max-w-5xl px-4 py-4 flex flex-col gap-4">
      {/* Search + view toggle */}
      <div className="flex gap-2">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name, area or service…"
          className="flex-1 rounded-full border border-stone-300 bg-white px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
        />
        <div className="flex rounded-full border border-stone-300 bg-white p-1 text-sm font-medium">
          <button
            onClick={showList}
            className={`px-4 py-1.5 rounded-full transition-colors ${
              view === "list" ? "bg-stone-900 text-white" : "text-stone-600"
            }`}
          >
            List
          </button>
          <button
            onClick={() => setView("map")}
            className={`px-4 py-1.5 rounded-full transition-colors ${
              view === "map" ? "bg-stone-900 text-white" : "text-stone-600"
            }`}
          >
            Map
          </button>
        </div>
      </div>

      <LocationBar
        origin={origin}
        radiusKm={radiusKm}
        locateState={locateState}
        pickMode={pickMode}
        onUseMyLocation={handleUseMyLocation}
        onStartPicking={handleStartPicking}
        onCancelPicking={() => setPickMode(false)}
        onRadiusChange={setRadiusKm}
        onClear={handleClearLocation}
      />

      {/* Category chips */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4">
        <button
          onClick={() => setCategory(null)}
          className={`shrink-0 rounded-full border px-3 py-1.5 text-sm ${
            category === null
              ? "bg-amber-600 border-amber-600 text-white"
              : "bg-white border-stone-300 text-stone-700"
          }`}
        >
          All
        </button>
        {CATEGORIES.map((c) => (
          <button
            key={c.id}
            onClick={() => setCategory(category === c.id ? null : c.id)}
            className={`shrink-0 rounded-full border px-3 py-1.5 text-sm ${
              category === c.id
                ? "bg-amber-600 border-amber-600 text-white"
                : "bg-white border-stone-300 text-stone-700"
            }`}
          >
            {c.icon} {c.name}
          </button>
        ))}
      </div>

      <p className="text-sm text-stone-500">
        {results.length} {results.length === 1 ? "business" : "businesses"}
        {origin && radiusKm ? ` within ${radiusKm} km` : " found"}
        {origin && results.length > 0 ? " · nearest first" : ""}
      </p>

      {view === "map" ? (
        <div className="h-[65vh] rounded-xl overflow-hidden border border-stone-200">
          <MapView
            businesses={mapBusinesses}
            origin={origin}
            radiusKm={radiusKm}
            pickMode={pickMode}
            onPick={(lat, lng) => applyOrigin({ lat, lng, source: "pin" })}
          />
        </div>
      ) : results.length === 0 ? (
        <div className="rounded-xl border border-dashed border-stone-300 bg-white p-10 text-center text-stone-500">
          <p className="text-3xl mb-2">{hiddenByRadius ? "📍" : "🔍"}</p>
          {hiddenByRadius ? (
            <>
              <p>Nothing within {radiusKm} km of your location.</p>
              <button
                onClick={() => setRadiusKm(null)}
                className="mt-3 rounded-full bg-amber-600 text-white text-sm font-medium px-4 py-2 hover:bg-amber-700"
              >
                Search any distance
              </button>
            </>
          ) : (
            <>
              <p>No businesses match your search.</p>
              <p className="text-sm mt-1">
                Know a local shop that should be here?{" "}
                <a href="/suggest" className="text-amber-700 font-medium">
                  Suggest it
                </a>
                .
              </p>
            </>
          )}
        </div>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2">
            {shown.map((r) => (
              <BusinessCard
                key={r.business.id}
                business={r.business}
                distanceKm={r.distanceKm}
              />
            ))}
          </div>
          {results.length > shown.length && (
            <button
              onClick={() => setVisibleCount((n) => n + PAGE_SIZE)}
              className="self-center rounded-full border border-stone-300 bg-white font-medium px-6 py-2.5 hover:bg-stone-50"
            >
              Show more ({results.length - shown.length} left)
            </button>
          )}
        </>
      )}
    </div>
  );
}
