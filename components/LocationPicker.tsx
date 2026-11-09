"use client";

import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import L from "leaflet";
import {
  CHENNAI_BOUNDS,
  CHENNAI_CENTER,
  MAP_DEFAULT_ZOOM,
  MAP_MIN_ZOOM,
} from "@/lib/constants";

const pin = L.divIcon({
  className: "cl-marker",
  html: `<div class="pin">📍</div>`,
  iconSize: [36, 36],
  iconAnchor: [18, 34],
});

function ClickHandler({
  onPick,
}: {
  onPick: (lat: number, lng: number) => void;
}) {
  useMapEvents({
    click(e) {
      onPick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

export default function LocationPicker({
  value,
  onChange,
}: {
  value: { lat: number; lng: number } | null;
  onChange: (v: { lat: number; lng: number }) => void;
}) {
  return (
    <MapContainer
      center={value ? [value.lat, value.lng] : CHENNAI_CENTER}
      zoom={value ? 15 : MAP_DEFAULT_ZOOM}
      minZoom={MAP_MIN_ZOOM}
      maxBounds={CHENNAI_BOUNDS}
      maxBoundsViscosity={1.0}
      className="h-full w-full"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <ClickHandler onPick={(lat, lng) => onChange({ lat, lng })} />
      {value && <Marker position={[value.lat, value.lng]} icon={pin} />}
    </MapContainer>
  );
}
