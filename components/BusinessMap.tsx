"use client";

import dynamic from "next/dynamic";

// Client wrapper so server pages can embed the Leaflet mini-map (no SSR)
const MiniMap = dynamic(() => import("./MiniMap"), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full grid place-items-center text-stone-400">
      Loading map…
    </div>
  ),
});

export default MiniMap;
