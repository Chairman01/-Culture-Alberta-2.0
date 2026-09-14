/**
 * CSV parsing for the lead importer.
 *
 * Hand-rolled rather than pulling in a dependency: the whole job is one
 * well-specified function, and a spreadsheet export is the one input where
 * quoting actually matters — a business name with a comma in it, an address
 * spanning two lines, a quote inside a quoted field. RFC 4180 rules:
 *
 *   - fields separated by commas, records by newlines
 *   - a field may be wrapped in double quotes
 *   - inside a quoted field, "" is a literal double quote
 *   - a quoted field may contain commas and newlines
 *
 * Column names are matched loosely, because nobody's spreadsheet has the
 * headers we would have chosen.
 */

/** Splits CSV text into rows of raw string cells. */
export function parseCsv(input: string): string[][] {
  // Strip a UTF-8 BOM — Excel writes one and it otherwise becomes part of the
  // first header name, which silently breaks column matching.
  const text = input.replace(/^﻿/, '')

  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let inQuotes = false
  let index = 0

  while (index < text.length) {
    const char = text[index]

    if (inQuotes) {
      if (char === '"') {
        if (text[index + 1] === '"') {
          field += '"'
          index += 2
          continue
        }
        inQuotes = false
        index += 1
        continue
      }
      field += char
      index += 1
      continue
    }

    if (char === '"') {
      inQuotes = true
      index += 1
      continue
    }

    if (char === ',') {
      row.push(field)
      field = ''
      index += 1
      continue
    }

    if (char === '\r') {
      // Swallow CRLF as one break; a lone CR is treated as a break too.
      if (text[index + 1] === '\n') index += 1
      row.push(field)
      rows.push(row)
      row = []
      field = ''
      index += 1
      continue
    }

    if (char === '\n') {
      row.push(field)
      rows.push(row)
      row = []
      field = ''
      index += 1
      continue
    }

    field += char
    index += 1
  }

  // Whatever is buffered when the text runs out is the last field.
  if (field.length > 0 || row.length > 0) {
    row.push(field)
    rows.push(row)
  }

  // Drop rows that are entirely empty — trailing newlines produce one, and a
  // spreadsheet export often carries a run of blank rows at the bottom.
  return rows.filter(cells => cells.some(cell => cell.trim() !== ''))
}

export type ImportRow = {
  company: string
  contact_name: string | null
  email: string | null
  phone: string | null
  website: string | null
  city: string | null
  category: string | null
  notes: string | null
}

/**
 * Header aliases, lowercased and stripped of non-letters before matching, so
 * "Company Name", "company_name" and "COMPANY  NAME" all land together.
 * Order matters within each list: the first match wins.
 */
const COLUMN_ALIASES: Record<keyof ImportRow, string[]> = {
  company: ['company', 'companyname', 'business', 'businessname', 'organisation', 'organization', 'client', 'account', 'name'],
  contact_name: ['contactname', 'contact', 'firstname', 'fullname', 'person', 'contactperson', 'owner'],
  email: ['email', 'emailaddress', 'mail', 'contactemail'],
  phone: ['phone', 'phonenumber', 'telephone', 'tel', 'mobile', 'cell'],
  website: ['website', 'url', 'site', 'webpage', 'domain', 'link'],
  city: ['city', 'town', 'location', 'municipality'],
  category: ['category', 'industry', 'type', 'sector', 'vertical', 'niche'],
  notes: ['notes', 'note', 'comment', 'comments', 'description', 'details'],
}

function normaliseHeader(value: string): string {
  return value.toLowerCase().replace(/[^a-z]/g, '')
}

/**
 * Maps each ImportRow field to a column index, or -1 when the sheet has no
 * such column. `company` is the only one that must resolve.
 */
export function mapColumns(header: string[]): Record<keyof ImportRow, number> {
  const normalised = header.map(normaliseHeader)
  const mapping = {} as Record<keyof ImportRow, number>
  const taken = new Set<number>()

  for (const [field, aliases] of Object.entries(COLUMN_ALIASES) as [keyof ImportRow, string[]][]) {
    let found = -1
    for (const alias of aliases) {
      // Exact header match first; only then a contains-match, so a column
      // literally called "email" always beats one called "email verified".
      const exact = normalised.findIndex((value, index) => value === alias && !taken.has(index))
      if (exact !== -1) {
        found = exact
        break
      }
    }
    if (found === -1) {
      for (const alias of aliases) {
        const partial = normalised.findIndex(
          (value, index) => value.includes(alias) && !taken.has(index),
        )
        if (partial !== -1) {
          found = partial
          break
        }
      }
    }
    if (found !== -1) taken.add(found)
    mapping[field] = found
  }

  return mapping
}

function clean(value: string | undefined): string | null {
  const trimmed = (value ?? '').trim()
  return trimmed === '' ? null : trimmed
}

export type ParsedImport = {
  rows: ImportRow[]
  /** Header names we could not place, echoed back so the user can see them. */
  unmappedHeaders: string[]
  /** Rows dropped for having no company name, with their line number. */
  rejected: Array<{ line: number; reason: string }>
}

export function parseLeadCsv(input: string): ParsedImport {
  const table = parseCsv(input)
  if (table.length === 0) return { rows: [], unmappedHeaders: [], rejected: [] }

  const header = table[0]
  const mapping = mapColumns(header)
  const used = new Set(Object.values(mapping).filter(index => index !== -1))
  const unmappedHeaders = header.filter((_, index) => !used.has(index)).map(name => name.trim()).filter(Boolean)

  const rows: ImportRow[] = []
  const rejected: Array<{ line: number; reason: string }> = []

  for (let index = 1; index < table.length; index += 1) {
    const cells = table[index]
    const pick = (field: keyof ImportRow) => {
      const column = mapping[field]
      return column === -1 ? null : clean(cells[column])
    }

    const company = pick('company')
    if (!company) {
      // Line number is 1-based including the header, so it matches what the
      // user sees in their spreadsheet.
      rejected.push({ line: index + 1, reason: 'No company name' })
      continue
    }

    rows.push({
      company,
      contact_name: pick('contact_name'),
      email: pick('email'),
      phone: pick('phone'),
      website: pick('website'),
      city: pick('city'),
      category: pick('category'),
      notes: pick('notes'),
    })
  }

  return { rows, unmappedHeaders, rejected }
}
