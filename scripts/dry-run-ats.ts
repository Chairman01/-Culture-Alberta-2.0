/**
 * Dry run: fetch selected ATS boards and report what they'd insert, without
 * writing anything. Pass board tokens as arguments, or none for every board.
 *
 *   npx tsx scripts/dry-run-ats.ts pfg city-of-red-deer
 */
import { fetchAtsJobs } from '../lib/automation/ats'
import { ATS_BOARDS } from '../lib/automation/ats/boards'
import { filterJobs } from '../lib/automation/jobs-filter'

async function main() {
const wanted = process.argv.slice(2)
const boards = wanted.length ? ATS_BOARDS.filter(b => wanted.includes(b.token)) : ATS_BOARDS

if (boards.length === 0) {
  console.error('No matching boards. Known tokens:', ATS_BOARDS.map(b => b.token).join(', '))
  process.exit(1)
}

const started = Date.now()
const { rows, boards: report } = await fetchAtsJobs(boards)
const { kept, blocked } = filterJobs(rows)

console.log(`\nfetched ${rows.length} rows in ${((Date.now() - started) / 1000).toFixed(1)}s`)
console.log(`values filter: kept ${kept.length}, blocked ${blocked.length}\n`)

for (const b of report) {
  console.log(`${b.board.padEnd(30)} ${b.provider.padEnd(15)} fetched=${String(b.fetched).padStart(4)} alberta=${String(b.alberta).padStart(4)}${b.error ? `  ERROR: ${b.error}` : ''}`)
}

const byCity: Record<string, number> = {}
for (const r of kept) byCity[r.city] = (byCity[r.city] ?? 0) + 1
console.log('\nby city:', byCity)

console.log('\nsample rows:')
for (const r of kept.slice(0, 8)) {
  console.log(` - [${r.city}] ${r.title} @ ${r.company}`)
  console.log(`   loc=${JSON.stringify(r.location_raw)} posted=${r.posted_at} valid_through=${r.valid_through} pay=${r.salary_label}`)
  console.log(`   desc=${r.description_html?.length ?? 0} chars | ${r.description_snippet?.slice(0, 110)}`)
  console.log(`   apply=${r.apply_url}`)
}

if (blocked.length) {
  console.log('\nblocked by values filter:')
  for (const b of blocked.slice(0, 15)) console.log(` - ${b.title} @ ${b.company} (${b.matched})`)
}
}

main()
