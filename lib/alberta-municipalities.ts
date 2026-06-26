/**
 * Alberta municipalities used for the account "city" field.
 * Scope: all 19 cities + every town in Alberta (~122), plus a handful of
 * well-known destinations and an "Other Alberta" catch-all so the required
 * field always has a valid choice.
 *
 * Stored as display strings on the user (user_metadata.city).
 */

const ALBERTA_CITIES = [
    'Airdrie', 'Beaumont', 'Brooks', 'Calgary', 'Camrose', 'Chestermere',
    'Cold Lake', 'Edmonton', 'Fort Saskatchewan', 'Grande Prairie', 'Lacombe',
    'Leduc', 'Lethbridge', 'Lloydminster', 'Medicine Hat', 'Red Deer',
    'Spruce Grove', 'St. Albert', 'Wetaskiwin',
]

const ALBERTA_TOWNS = [
    'Athabasca', 'Banff', 'Barrhead', 'Bashaw', 'Bassano', 'Beaverlodge',
    'Bentley', 'Blackfalds', 'Bon Accord', 'Bonnyville', 'Bow Island', 'Bowden',
    'Bruderheim', 'Calmar', 'Canmore', 'Cardston', 'Carstairs', 'Castor',
    'Claresholm', 'Coaldale', 'Coalhurst', 'Cochrane', 'Coronation', 'Crossfield',
    'Daysland', 'Devon', 'Diamond Valley', 'Didsbury', 'Drayton Valley',
    'Drumheller', 'Eckville', 'Edson', 'Elk Point', 'Fairview', 'Falher',
    'Fort Macleod', 'Fox Creek', 'Gibbons', 'Grimshaw', 'Hanna', 'Hardisty',
    'High Level', 'High Prairie', 'High River', 'Hinton', 'Innisfail', 'Irricana',
    'Killam', 'Lamont', 'Legal', 'Magrath', 'Manning', 'Mayerthorpe', 'McLennan',
    'Milk River', 'Millet', 'Morinville', 'Mundare', 'Nanton', 'Nobleford',
    'Okotoks', 'Olds', 'Onoway', 'Oyen', 'Peace River', 'Penhold', 'Picture Butte',
    'Pincher Creek', 'Ponoka', 'Provost', 'Rainbow Lake', 'Raymond', 'Redcliff',
    'Redwater', 'Rimbey', 'Rocky Mountain House', 'Sedgewick', 'Sexsmith',
    'Slave Lake', 'Smoky Lake', 'Spirit River', 'St. Paul', 'Stavely', 'Stettler',
    'Stony Plain', 'Strathmore', 'Sundre', 'Swan Hills', 'Sylvan Lake', 'Taber',
    'Thorsby', 'Three Hills', 'Tofield', 'Trochu', 'Two Hills', 'Valleyview',
    'Vauxhall', 'Vegreville', 'Vermilion', 'Viking', 'Vulcan', 'Wainwright',
    'Wembley', 'Westlock', 'Whitecourt',
]

// Notable destinations that aren't "towns" but readers strongly identify with.
const ALBERTA_OTHER_PLACES = ['Jasper']

/** Catch-all so the required field is never a dead end. */
export const CITY_FALLBACK = 'Other Alberta'

/** Alphabetically sorted, de-duplicated list of selectable municipalities. */
export const ALBERTA_MUNICIPALITIES: string[] = Array.from(
    new Set([...ALBERTA_CITIES, ...ALBERTA_TOWNS, ...ALBERTA_OTHER_PLACES])
).sort((a, b) => a.localeCompare(b))

/** Full option list shown in the picker (municipalities + fallback at the end). */
export const CITY_OPTIONS: string[] = [...ALBERTA_MUNICIPALITIES, CITY_FALLBACK]

/** True if a value is a recognised selection (used for required-field validation). */
export function isValidCity(value: string): boolean {
    return CITY_OPTIONS.includes(value.trim())
}
