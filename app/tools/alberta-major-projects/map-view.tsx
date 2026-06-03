"use client"

import { useEffect } from "react"
import { MapContainer, TileLayer, CircleMarker, Tooltip } from "react-leaflet"
import type { Project, Article } from "./alberta-major-projects-client"
import "leaflet/dist/leaflet.css"

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function fmtCost(cost?: number): string {
  if (!cost) return ""
  return cost >= 1000 ? `$${(cost / 1000).toFixed(1)}B` : `$${Math.round(cost)}M`
}

function stageColor(stage: string): string {
  if (stage === "Under Construction") return "#3b82f6" // blue-500
  if (stage === "Completed") return "#10b981"          // emerald-500
  return "#f59e0b"                                     // amber-500 (Proposed)
}

function stageFillOpacity(stage: string): number {
  if (stage === "Completed") return 0.7
  if (stage === "Under Construction") return 0.85
  return 0.65
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface MapViewProps {
  projects: Project[]
  articlesByProject: Record<string, Article[]>
  onSelectProject: (project: Project) => void
  selectedProjectId?: string | null
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function MapView({
  projects,
  articlesByProject,
  onSelectProject,
  selectedProjectId,
}: MapViewProps) {
  // Fix Leaflet's broken default icon paths when bundled with webpack/Next.js
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const L = require("leaflet")
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (L.Icon.Default.prototype as any)._getIconUrl
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
      iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
      shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
    })
  }, [])

  // Only projects that have real coordinates
  const mappable = projects.filter(
    (p) => typeof p.lat === "number" && typeof p.lng === "number"
  )

  return (
    <div className="w-full rounded-xl overflow-hidden border border-gray-200 shadow-sm">
      {/* Legend */}
      <div className="flex items-center gap-4 px-4 py-2 bg-white border-b border-gray-100 text-xs text-gray-500 flex-wrap">
        <span className="font-semibold text-gray-700">Legend</span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded-full bg-amber-400 border border-amber-500"></span>
          Proposed
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded-full bg-blue-500 border border-blue-600"></span>
          Under Construction
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded-full bg-emerald-500 border border-emerald-600"></span>
          Completed
        </span>
        <span className="ml-auto text-gray-400">
          {mappable.length} of {projects.length} projects shown
        </span>
      </div>

      {mappable.length === 0 ? (
        <div className="flex items-center justify-center h-96 bg-gray-50 text-gray-400 text-sm">
          No project coordinates available — try refreshing the page.
        </div>
      ) : (
        <MapContainer
          center={[54.5, -115.0]}
          zoom={6}
          style={{ height: "600px", width: "100%" }}
          scrollWheelZoom={true}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {mappable.map((project) => {
            const hasArticle = (articlesByProject[project.id]?.length ?? 0) > 0
            const isSelected = selectedProjectId === project.id
            const color = stageColor(project.stage)
            const city = project.municipalities[0] ?? ""
            const cost = fmtCost(project.cost)

            return (
              <CircleMarker
                key={project.id}
                center={[project.lat!, project.lng!]}
                radius={isSelected ? 14 : 10}
                pathOptions={{
                  color: isSelected ? "#1d4ed8" : color,
                  weight: isSelected ? 3 : hasArticle ? 2 : 1.5,
                  fillColor: color,
                  fillOpacity: stageFillOpacity(project.stage),
                  dashArray: hasArticle ? undefined : "4 2",
                }}
                eventHandlers={{
                  click: () => onSelectProject(project),
                }}
              >
                <Tooltip direction="top" offset={[0, -8]} opacity={0.95}>
                  <div className="text-sm leading-tight">
                    <div className="font-semibold">
                      {project.friendlyName || project.name}
                    </div>
                    <div className="text-gray-500 text-xs mt-0.5">
                      {[city, cost].filter(Boolean).join(" · ")}
                    </div>
                    {hasArticle && (
                      <div className="text-emerald-600 text-xs mt-0.5 font-medium">
                        ✓ Article linked
                      </div>
                    )}
                  </div>
                </Tooltip>
              </CircleMarker>
            )
          })}
        </MapContainer>
      )}
    </div>
  )
}
