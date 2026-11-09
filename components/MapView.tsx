"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Circle,
  useMap,
  useMapEvents,
} from "react-leaflet";
import L from "leaflet";
import type { Business } from "@/lib/types";
import type { Origin } from "@/lib/geo";
import { formatDistance } from "@/lib/geo";
import {
  CHENNAI_BOUNDS,
  CHENNAI_CENTER,
  MAP_DEFAULT_ZOOM,
  MAP_MIN_ZOOM,
  categoryIcon,
  categoryLabel,
} from "@/lib/constants";

export type MapBusiness = Business & { distanceKm?: number };

function emojiPin(emoji: string) {
  return L.divIcon({
    className: "cl-marker",
    html: `<div class="pin">${emoji}</div>`,
    iconSize: [36, 36],
    iconAnchor: [18, 34],
    popupAnchor: [0, -30],
  });
}

const originIcon = (source: Origin["source"]) =>
  L.divIcon({
    className: "cl-marker",
    html:
      source === "gps"
        ? `<div class="you-dot"></div>`
        : `<div class="pin pin-origin">📌</div>`,
    iconSize: source === "gps" ? [22, 22] : [36, 36],
    iconAnchor: source === "gps" ? [11, 11] : [18, 34],
  });

/** Zoom that roughly fits the chosen radius on screen. */
function zoomForRadius(km: number | null): number {
  if (!km) return 12;
  if (km <= 1) return 15;
  if (km <= 2) return 14;
  if (km <= 5) return 13;
  return 12;
}

function Recenter({
  origin,
  radiusKm,
}: {
  origin: Origin | null;
  radiusKm: number | null;
}) {
  const map = useMap();
  useEffect(() => {
    if (origin) map.flyTo([origin.lat, origin.lng], zoomForRadius(radiusKm));
  }, [map, origin, radiusKm]);
  return null;
}

function PickHandler({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onPick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

/** Leaflet slows to a crawl past a few hundred markers, so only draw what's on screen. */
const MAX_MARKERS = 300;

function VisibleMarkers({
  businesses,
  onCountChange,
}: {
  businesses: MapBusiness[];
  onCountChange: (shown: number, total: number) => void;
}) {
  const map = useMap();
  const [bounds, setBounds] = useState<L.LatLngBounds | null>(() =>
    map.getBounds()
  );

  const sync = useCallback(() => setBounds(map.getBounds()), [map]);
  useMapEvents({ moveend: sync, zoomend: sync, resize: sync });

  const visible = useMemo(() => {
    if (!bounds) return businesses.slice(0, MAX_MARKERS);
    const inView = businesses.filter((b) => bounds.contains([b.lat, b.lng]));
    return inView.slice(0, MAX_MARKERS);
  }, [businesses, bounds]);

  const inViewTotal = useMemo(
    () =>
      bounds
        ? businesses.filter((b) => bounds.contains([b.lat, b.lng])).length
        : businesses.length,
    [businesses, bounds]
  );

  useEffect(() => {
    onCountChange(visible.length, inViewTotal);
  }, [visible.length, inViewTotal, onCountChange]);

  return (
    <>
      {visible.map((b) => (
        <Marker
          key={b.id}
          position={[b.lat, b.lng]}
          icon={emojiPin(categoryIcon(b.category))}
        >
          <Popup>
            <div className="min-w-40">
              <p className="font-semibold">{b.name}</p>
              <p className="text-stone-500">
                {categoryLabel(b.category)}
                {b.area ? ` · ${b.area}` : ""}
                {b.distanceKm !== undefined
                  ? ` · ${formatDistance(b.distanceKm)}`
                  : ""}
              </p>
              <div className="mt-1 flex gap-3">
                <Link href={`/business/${b.id}`} className="text-amber-700 font-medium">
                  View
                </Link>
                {b.phone && (
                  <a href={`tel:${b.phone}`} className="text-amber-700 font-medium">
                    Call
                  </a>
                )}
              </div>
            </div>
          </Popup>
        </Marker>
      ))}
    </>
  );
}

export default function MapView({
  businesses,
  origin,
  radiusKm,
  pickMode,
  onPick,
}: {
  businesses: MapBusiness[];
  origin: Origin | null;
  radiusKm: number | null;
  pickMode: boolean;
  onPick: (lat: number, lng: number) => void;
}) {
  const [counts, setCounts] = useState({ shown: 0, inView: 0 });
  const handleCounts = useCallback(
    (shown: number, inView: number) => setCounts({ shown, inView }),
    []
  );

  return (
    <div className="relative h-full w-full">
      {counts.inView > counts.shown && (
        <div className="absolute top-2 right-2 z-[400] rounded-full bg-white/95 border border-stone-300 px-3 py-1.5 text-xs text-stone-600 shadow-sm">
          Showing {counts.shown} of {counts.inView} here — zoom in for more
        </div>
      )}
      <MapContainer
      center={origin ? [origin.lat, origin.lng] : CHENNAI_CENTER}
      zoom={origin ? zoomForRadius(radiusKm) : MAP_DEFAULT_ZOOM}
      minZoom={MAP_MIN_ZOOM}
      maxBounds={CHENNAI_BOUNDS}
      maxBoundsViscosity={1.0}
      scrollWheelZoom
      className={`h-full w-full ${pickMode ? "cl-picking" : ""}`}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      <Recenter origin={origin} radiusKm={radiusKm} />
      {pickMode && <PickHandler onPick={onPick} />}

      {origin && (
        <>
          <Marker
            position={[origin.lat, origin.lng]}
            icon={originIcon(origin.source)}
            zIndexOffset={1000}
          />
          {radiusKm && (
            <Circle
              center={[origin.lat, origin.lng]}
              radius={radiusKm * 1000}
              pathOptions={{
                color: "#d97706",
                weight: 1.5,
                fillColor: "#f59e0b",
                fillOpacity: 0.08,
              }}
            />
          )}
        </>
      )}

        <VisibleMarkers businesses={businesses} onCountChange={handleCounts} />
      </MapContainer>
    </div>
  );
}
