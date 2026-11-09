"use client";

import { MapContainer, TileLayer, Marker } from "react-leaflet";
import L from "leaflet";
import { MAP_MIN_ZOOM, CHENNAI_BOUNDS } from "@/lib/constants";

export default function MiniMap({
  lat,
  lng,
  icon,
}: {
  lat: number;
  lng: number;
  icon: string;
}) {
  const pin = L.divIcon({
    className: "cl-marker",
    html: `<div class="pin">${icon}</div>`,
    iconSize: [36, 36],
    iconAnchor: [18, 34],
  });
  return (
    <MapContainer
      center={[lat, lng]}
      zoom={15}
      minZoom={MAP_MIN_ZOOM}
      maxBounds={CHENNAI_BOUNDS}
      maxBoundsViscosity={1.0}
      scrollWheelZoom={false}
      className="h-full w-full"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <Marker position={[lat, lng]} icon={pin} />
    </MapContainer>
  );
}
