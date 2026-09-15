/**
 * Mountain Time wall-clock conversion.
 *
 * Scheduling is typed as a wall-clock time — "Saturday, 7:00 AM" — and an
 * editor means Alberta's clock when they type it. `<input type="datetime-local">`
 * has no timezone, so if the value were read as browser-local a save from a
 * laptop still set to Eastern would publish two hours early, and the admin panel
 * would quietly behave differently depending on where it was opened from.
 *
 * Everything here therefore pins the wall clock to America/Edmonton, which also
 * gets DST right: the same 7:00 AM is UTC-6 in July and UTC-7 in January.
 */

export const MOUNTAIN_TZ = 'America/Edmonton'

/** The zone's offset from UTC, in ms, at a given instant. */
function zoneOffsetMs(instant: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(instant)

  const field = (type: string) => Number(parts.find(p => p.type === type)?.value ?? '0')

  const asIfUtc = Date.UTC(
    field('year'),
    field('month') - 1,
    field('day'),
    field('hour'),
    field('minute'),
    field('second')
  )

  return asIfUtc - instant.getTime()
}

/**
 * `YYYY-MM-DDTHH:mm` read as Mountain Time → a UTC ISO string.
 *
 * Returns null for anything unparseable, so a caller can treat a half-typed
 * datetime input as "no schedule yet" rather than as an error.
 */
export function mountainWallToUtcIso(wall: string): string | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(wall)
  if (!match) return null

  const [, y, mo, d, h, mi] = match
  const asIfUtc = Date.UTC(Number(y), Number(mo) - 1, Number(d), Number(h), Number(mi))

  // The offset depends on the instant, and the instant is what we are solving
  // for. One refinement pass settles it everywhere except inside a DST gap,
  // where any answer is arguable anyway.
  let instant = asIfUtc - zoneOffsetMs(new Date(asIfUtc), MOUNTAIN_TZ)
  instant = asIfUtc - zoneOffsetMs(new Date(instant), MOUNTAIN_TZ)

  const result = new Date(instant)
  return Number.isNaN(result.getTime()) ? null : result.toISOString()
}

/** A UTC ISO string → the `YYYY-MM-DDTHH:mm` a datetime-local input expects. */
export function utcIsoToMountainWall(iso: string): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: MOUNTAIN_TZ,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).formatToParts(new Date(iso))

  const field = (type: string) => parts.find(p => p.type === type)?.value ?? '00'

  return `${field('year')}-${field('month')}-${field('day')}T${field('hour')}:${field('minute')}`
}

/** "Sat, Sep 20 at 7:00 AM MT" — for admin labels and confirmations. */
export function formatMountain(iso: string): string {
  const formatted = new Intl.DateTimeFormat('en-CA', {
    timeZone: MOUNTAIN_TZ,
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(new Date(iso))

  return `${formatted} MT`
}

/** The current Mountain wall clock, rounded up to the next five minutes. */
export function nextMountainSlot(minutesAhead = 60): string {
  const target = new Date(Date.now() + minutesAhead * 60_000)
  target.setSeconds(0, 0)
  target.setMinutes(Math.ceil(target.getMinutes() / 5) * 5)
  return utcIsoToMountainWall(target.toISOString())
}
