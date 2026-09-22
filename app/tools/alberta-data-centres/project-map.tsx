"use client"

import dynamic from "next/dynamic"
import type { DataCentre } from "@/lib/data/alberta-data-centres"

// Leaflet touches `window` at import time, so it can only load on the client.
const MapView = dynamic(() => import("./map-view"), {
  ssr: false,
  loading: () => <div className="h-[520px] rounded-2xl border border-gray-200 bg-gray-50 animate-pulse" />,
})

export default function ProjectMap({ dc }: { dc: DataCentre }) {
  return <MapView items={[dc]} selectedId={dc.id} onSelect={() => {}} center={[dc.lat, dc.lng]} zoom={8} />
}
