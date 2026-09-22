"use client"

import { useEffect, useId, useRef, useState } from "react"
import { Info, X } from "lucide-react"

/**
 * A small ⓘ button that opens a plain-language explanation. Click to open (hover
 * alone is useless on phones), Escape or clicking elsewhere closes it. Pass
 * `glossaryId` to add a "More in the glossary" link that jumps to that entry.
 */
export function InfoTip({
  title,
  children,
  glossaryId,
  align = "right",
  dark = false,
}: {
  title: string
  children: React.ReactNode
  glossaryId?: string
  align?: "left" | "right"
  dark?: boolean
}) {
  const [open, setOpen] = useState(false)
  const id = useId()
  const ref = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false) }
    document.addEventListener("mousedown", onDoc)
    document.addEventListener("keydown", onKey)
    return () => { document.removeEventListener("mousedown", onDoc); document.removeEventListener("keydown", onKey) }
  }, [open])

  return (
    <span ref={ref} className="relative inline-flex align-middle">
      <button
        type="button"
        aria-label={`What does "${title}" mean?`}
        aria-expanded={open}
        aria-controls={id}
        onClick={e => { e.stopPropagation(); setOpen(o => !o) }}
        className={`inline-flex items-center justify-center w-5 h-5 rounded-full transition-colors ${dark ? "text-slate-300 hover:text-white hover:bg-white/15" : "text-gray-400 hover:text-blue-700 hover:bg-blue-50"}`}
      >
        <Info className="w-3.5 h-3.5" />
      </button>
      {open && (
        <span
          id={id}
          role="dialog"
          aria-label={title}
          onClick={e => e.stopPropagation()}
          className={`absolute z-[1000] top-7 ${align === "right" ? "right-0" : "left-0"} w-72 max-w-[90vw] bg-white text-gray-800 text-left text-sm font-normal normal-case tracking-normal rounded-xl border border-gray-200 shadow-xl p-4 leading-relaxed`}
        >
          <span className="flex items-start justify-between gap-2">
            <strong className="text-gray-900">{title}</strong>
            <button type="button" onClick={() => setOpen(false)} aria-label="Close" className="text-gray-400 hover:text-gray-700 -mt-0.5"><X className="w-4 h-4" /></button>
          </span>
          <span className="block mt-1.5 text-gray-600">{children}</span>
          {glossaryId && (
            <a href={`#${glossaryId}`} onClick={() => setOpen(false)} className="block mt-2 text-xs font-semibold text-blue-700 hover:underline">More in the glossary ↓</a>
          )}
        </span>
      )}
    </span>
  )
}
