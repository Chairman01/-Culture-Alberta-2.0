"use client"

/**
 * AdSense slot placeholder - reserves space to reduce CLS when ads load.
 * Use this where you expect AdSense auto-ads or manual units to appear.
 * Reserving space prevents layout shift when the ad injects.
 */
export function AdSenseSlot({ 
  minHeight = 100, 
  className = "" 
}: { 
  minHeight?: number
  className?: string 
}) {
  return (
    <div
      className={`flex items-center justify-center bg-gray-50 rounded-lg border border-gray-100 ${className}`}
      style={{ minHeight: `${minHeight}px` }}
      aria-hidden="true"
    >
      <span className="text-xs text-gray-400">Advertisement</span>
    </div>
  )
}
