"use client";

import {
  RADIUS_OPTIONS_KM,
  type Origin,
} from "@/lib/geo";

export type LocateState =
  | "idle"
  | "locating"
  | "denied"
  | "unavailable"
  | "outside";

const MESSAGES: Record<Exclude<LocateState, "idle" | "locating">, string> = {
  denied:
    "Location access was blocked. Drop a pin on the map instead — nothing is sent anywhere.",
  unavailable:
    "Couldn't get your location. Drop a pin on the map instead.",
  outside:
    "You seem to be outside Chennai. Drop a pin on the map to browse a Chennai neighbourhood.",
};

export default function LocationBar({
  origin,
  radiusKm,
  locateState,
  pickMode,
  onUseMyLocation,
  onStartPicking,
  onCancelPicking,
  onRadiusChange,
  onClear,
}: {
  origin: Origin | null;
  radiusKm: number | null;
  locateState: LocateState;
  pickMode: boolean;
  onUseMyLocation: () => void;
  onStartPicking: () => void;
  onCancelPicking: () => void;
  onRadiusChange: (km: number | null) => void;
  onClear: () => void;
}) {
  if (pickMode) {
    return (
      <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-amber-900">
          📍 Tap anywhere on the map to set your location.
        </p>
        <button
          onClick={onCancelPicking}
          className="rounded-full border border-amber-400 bg-white px-3 py-1.5 text-sm font-medium text-amber-900 hover:bg-amber-100"
        >
          Cancel
        </button>
      </div>
    );
  }

  if (origin) {
    return (
      <div className="rounded-xl border border-stone-200 bg-white px-4 py-3 flex flex-wrap items-center gap-x-3 gap-y-2">
        <p className="text-sm font-medium">
          {origin.source === "gps" ? "📍 Near you" : "📌 Near your pin"}
        </p>
        <label className="text-sm text-stone-600 flex items-center gap-1.5">
          within
          <select
            value={radiusKm ?? "any"}
            onChange={(e) =>
              onRadiusChange(
                e.target.value === "any" ? null : Number(e.target.value)
              )
            }
            className="rounded-lg border border-stone-300 bg-white px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
          >
            {RADIUS_OPTIONS_KM.map((km) => (
              <option key={km} value={km}>
                {km} km
              </option>
            ))}
            <option value="any">any distance</option>
          </select>
        </label>
        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={onStartPicking}
            className="rounded-full border border-stone-300 px-3 py-1.5 text-sm font-medium hover:bg-stone-50"
          >
            Change
          </button>
          <button
            onClick={onClear}
            className="rounded-full px-3 py-1.5 text-sm font-medium text-stone-500 hover:text-stone-800"
          >
            Clear
          </button>
        </div>
      </div>
    );
  }

  const message =
    locateState === "idle" || locateState === "locating"
      ? null
      : MESSAGES[locateState];

  return (
    <div className="rounded-xl border border-stone-200 bg-white px-4 py-3 flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={onUseMyLocation}
          disabled={locateState === "locating"}
          className="rounded-full bg-stone-900 text-white text-sm font-medium px-4 py-2 hover:bg-stone-700 disabled:opacity-60"
        >
          {locateState === "locating" ? "Locating…" : "📍 Use my location"}
        </button>
        <button
          onClick={onStartPicking}
          className="rounded-full border border-stone-300 text-sm font-medium px-4 py-2 hover:bg-stone-50"
        >
          Pin a spot on the map
        </button>
        <p className="text-xs text-stone-500 basis-full sm:basis-auto">
          Find shops closest to you first.
        </p>
      </div>
      {message && (
        <p className="rounded-lg bg-stone-50 border border-stone-200 text-stone-600 text-sm px-3 py-2">
          {message}
        </p>
      )}
    </div>
  );
}
