"use client"

import { MapContainer, TileLayer, CircleMarker, Tooltip } from "react-leaflet"
import type { DataCentre, DcStatus } from "@/lib/data/alberta-data-centres"
import { STATUS_LABEL } from "@/lib/data/alberta-data-centres"
import "leaflet/dist/leaflet.css"

export const STATUS_COLOR: Record<DcStatus, string> = {
  proposed: "#f59e0b",            // amber-500
  approved: "#8b5cf6",            // violet-500
  "under-construction": "#3b82f6", // blue-500
  operating: "#10b981",           // emerald-500
  inactive: "#9ca3af",            // gray-400
}

// Marker area tracks MW so a 1 GW campus reads as bigger than a 10 MW site,
// clamped so small sites stay clickable and Wonder Valley doesn't eat the map.
function radiusFor(mw: number | null): number {
  if (!mw) return 6
  return Math.max(6, Math.min(22, 4 + Math.sqrt(mw) / 3))
}

function fmtMW(mw: number | null): string {
  if (mw == null) return "MW not disclosed"
  return mw >= 1000 ? `${(mw / 1000).toFixed(1)} GW` : `${mw} MW`
}

interface MapViewProps {
  items: DataCentre[]
  selectedId: string | null
  onSelect: (dc: DataCentre) => void
  center?: [number, number]
  zoom?: number
}

export default function MapView({ items, selectedId, onSelect, center = [53.2, -114.5], zoom = 5 }: MapViewProps) {
  return (
    <div className="w-full rounded-2xl overflow-hidden border border-gray-200 shadow-sm">
      <div className="flex items-center gap-4 px-4 py-2 bg-white border-b border-gray-100 text-xs text-gray-500 flex-wrap">
        <span className="font-semibold text-gray-700">Legend</span>
        {(Object.keys(STATUS_COLOR) as DcStatus[]).map(s => (
          <span key={s} className="flex items-center gap-1.5">
            <span className="inline-block w-3 h-3 rounded-full" style={{ background: STATUS_COLOR[s] }} />
            {STATUS_LABEL[s]}
          </span>
        ))}
        <span className="ml-auto text-gray-400">Marker size = megawatts · locations approximate</span>
      </div>
      <MapContainer
        center={center}
        zoom={zoom}
        style={{ height: "520px", width: "100%" }}
        scrollWheelZoom={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {items.map(dc => {
          const selected = dc.id === selectedId
          const color = STATUS_COLOR[dc.status]
          return (
            <CircleMarker
              key={dc.id}
              center={[dc.lat, dc.lng]}
              radius={radiusFor(dc.demandMW) + (selected ? 3 : 0)}
              pathOptions={{
                color: selected ? "#111827" : color,
                weight: selected ? 3 : 1.5,
                fillColor: color,
                fillOpacity: dc.status === "inactive" ? 0.35 : 0.7,
              }}
              eventHandlers={{ click: () => onSelect(dc) }}
            >
              <Tooltip direction="top" offset={[0, -6]} opacity={0.95}>
                <div className="text-sm leading-tight">
                  <div className="font-semibold">{dc.name}</div>
                  <div className="text-gray-500 text-xs mt-0.5">
                    {dc.municipality} · {fmtMW(dc.demandMW)} · {STATUS_LABEL[dc.status]}
                  </div>
                </div>
              </Tooltip>
            </CircleMarker>
          )
        })}
      </MapContainer>
    </div>
  )
}
