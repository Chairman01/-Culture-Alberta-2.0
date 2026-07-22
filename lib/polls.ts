// Shared poll result aggregation, used by the public poll API routes.
// Pure function so it can be unit-tested without Supabase.

export interface PollOptionRow {
    id: string
    label: string
    sort: number
}

export interface PollVoteRow {
    option_id: string
    city: string | null
    client_id: string
}

export interface PollOptionResult {
    id: string
    label: string
    votes: number
    pct: number
}

export interface CityTeaser {
    city: string
    label: string
    topOptionLabel: string
    pct: number
}

export interface MyCityRow {
    optionId: string
    votes: number
    pct: number
}

const CITY_LABELS: Record<string, string> = {
    edmonton: 'Edmonton',
    calgary: 'Calgary',
    lethbridge: 'Lethbridge',
    'red-deer': 'Red Deer',
    'grande-prairie': 'Grande Prairie',
    'fort-mcmurray': 'Fort McMurray',
    'medicine-hat': 'Medicine Hat',
}

// A city needs this many votes before its split is shown — below that the
// numbers are noise and "100% of Edmonton" means one person.
const CITY_MIN_VOTES = 5

export function aggregatePollResults(
    options: PollOptionRow[],
    votes: PollVoteRow[],
    clientId: string,
    myCity: string | null
): {
    options: PollOptionResult[]
    totalVotes: number
    myOptionId: string | null
    cityTeasers: CityTeaser[]
    myCity: { city: string; label: string; total: number; rows: MyCityRow[] } | null
} {
    const counts = new Map<string, number>()
    const cityCounts = new Map<string, Map<string, number>>()
    let myOptionId: string | null = null

    for (const vote of votes) {
        counts.set(vote.option_id, (counts.get(vote.option_id) || 0) + 1)
        if (clientId && vote.client_id === clientId) myOptionId = vote.option_id
        if (vote.city) {
            let byOption = cityCounts.get(vote.city)
            if (!byOption) {
                byOption = new Map()
                cityCounts.set(vote.city, byOption)
            }
            byOption.set(vote.option_id, (byOption.get(vote.option_id) || 0) + 1)
        }
    }

    const totalVotes = votes.length
    const optionResults: PollOptionResult[] = options.map(option => {
        const optionVotes = counts.get(option.id) || 0
        return {
            id: option.id,
            label: option.label,
            votes: optionVotes,
            pct: totalVotes > 0 ? Math.round((optionVotes / totalVotes) * 100) : 0,
        }
    })

    // Teaser: each big city's current top pick ("Edmonton picks X (54%)").
    // Edmonton and Calgary first, then any other city that clears the bar.
    const cityTeasers: CityTeaser[] = []
    const orderedCities = ['edmonton', 'calgary', ...Object.keys(CITY_LABELS).filter(c => c !== 'edmonton' && c !== 'calgary')]
    for (const city of orderedCities) {
        const byOption = cityCounts.get(city)
        if (!byOption) continue
        let cityTotal = 0
        let topOption: string | null = null
        let topVotes = 0
        for (const [optionId, n] of byOption) {
            cityTotal += n
            if (n > topVotes) {
                topVotes = n
                topOption = optionId
            }
        }
        if (cityTotal < CITY_MIN_VOTES || !topOption) continue
        const label = options.find(o => o.id === topOption)?.label
        if (!label) continue
        cityTeasers.push({
            city,
            label: CITY_LABELS[city] || city,
            topOptionLabel: label,
            pct: Math.round((topVotes / cityTotal) * 100),
        })
        if (cityTeasers.length >= 2) break
    }

    // Signed-in voters see the full breakdown for their own city
    let myCityResult: { city: string; label: string; total: number; rows: MyCityRow[] } | null = null
    if (myCity) {
        const byOption = cityCounts.get(myCity)
        if (byOption) {
            let cityTotal = 0
            for (const n of byOption.values()) cityTotal += n
            if (cityTotal >= CITY_MIN_VOTES) {
                myCityResult = {
                    city: myCity,
                    label: CITY_LABELS[myCity] || myCity,
                    total: cityTotal,
                    rows: options
                        .map(option => {
                            const n = byOption.get(option.id) || 0
                            return { optionId: option.id, votes: n, pct: Math.round((n / cityTotal) * 100) }
                        })
                        .filter(row => row.votes > 0),
                }
            }
        }
    }

    return { options: optionResults, totalVotes, myOptionId, cityTeasers, myCity: myCityResult }
}
