/**
 * Reference tables for the top-employers page: published figures from named
 * sources, each with the period it covers.
 *
 * Every row here was read from the source linked beside it. Nothing is
 * estimated. A section with no verified data is left out rather than filled.
 */

export interface ReferenceSection {
  id: string
  navLabel: string
  title: string
  intro: string
  columns: string[]
  rows: string[][]
  note?: string
  sources: Array<{ label: string; url: string }>
}

export const REFERENCE_SECTIONS: ReferenceSection[] = []
