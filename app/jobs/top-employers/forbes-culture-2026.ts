/**
 * Forbes "Canada’s Best Employers for Company Culture 2026", produced with
 * Statista and published July 2026. 200 employers.
 *
 * Read from Forbes’ own list data on 2026-09-24. Only a slice is kept: the
 * national top ten, the three highest-ranked employers in each industry, and
 * every Alberta employer. The full ranking is Forbes’ to publish; this page
 * links to it.
 *
 * Industry names and head-office cities are Forbes’ own. A company is listed
 * where Forbes lists it, which is not always where people think of it — Rogers
 * appears under Calgary.
 */

export const FORBES_CULTURE_SOURCE = {
  name: "Forbes, Canada’s Best Employers for Company Culture 2026",
  url: "https://www.forbes.com/lists/canada-employers-culture/",
  published: "July 2026",
  size: 200,
}

export interface RankedEmployer {
  rank: number
  name: string
  city: string | null
  province: string | null
  industry?: string
}

export const FORBES_CULTURE_TOP_10: RankedEmployer[] = [
  {
    "rank": 1,
    "name": "Université Laval",
    "city": "Québec",
    "province": "Quebec",
    "industry": "Education"
  },
  {
    "rank": 2,
    "name": "Université de Sherbrooke",
    "city": "Sherbrooke",
    "province": "Quebec",
    "industry": "Education"
  },
  {
    "rank": 3,
    "name": "Oak Valley Health",
    "city": "Markham",
    "province": "Ontario",
    "industry": "Healthcare & Social Services"
  },
  {
    "rank": 4,
    "name": "Manitoba Public Insurance",
    "city": "Winnipeg",
    "province": "Manitoba",
    "industry": "Insurance"
  },
  {
    "rank": 5,
    "name": "Bethany Care Society",
    "city": "Calgary",
    "province": "Alberta",
    "industry": "Healthcare & Social Services"
  },
  {
    "rank": 6,
    "name": "George Brown College",
    "city": "Toronto",
    "province": "Ontario",
    "industry": "Education"
  },
  {
    "rank": 7,
    "name": "Stantec",
    "city": "Edmonton",
    "province": "Alberta",
    "industry": "Professional Services"
  },
  {
    "rank": 8,
    "name": "Canadian Blood Services",
    "city": "Ottawa",
    "province": "Ontario",
    "industry": "Healthcare & Social Services"
  },
  {
    "rank": 9,
    "name": "Niagara Health System",
    "city": "St. Catharines",
    "province": "Ontario",
    "industry": "Healthcare & Social Services"
  },
  {
    "rank": 10,
    "name": "Home Hardware",
    "city": "St Jacobs",
    "province": "Ontario",
    "industry": "Retail and Wholesale"
  }
]

export const FORBES_CULTURE_ALBERTA: RankedEmployer[] = [
  {
    "rank": 5,
    "name": "Bethany Care Society",
    "city": "Calgary",
    "province": "Alberta",
    "industry": "Healthcare & Social Services"
  },
  {
    "rank": 7,
    "name": "Stantec",
    "city": "Edmonton",
    "province": "Alberta",
    "industry": "Professional Services"
  },
  {
    "rank": 37,
    "name": "Shell Canada",
    "city": "Calgary",
    "province": "Alberta",
    "industry": "Construction, Chemicals, Raw Materials"
  },
  {
    "rank": 56,
    "name": "ATB Financial",
    "city": "Edmonton",
    "province": "Alberta",
    "industry": "Banking and Financial Services"
  },
  {
    "rank": 77,
    "name": "Suncor Energy",
    "city": "Calgary",
    "province": "Alberta",
    "industry": "Construction, Chemicals, Raw Materials"
  },
  {
    "rank": 82,
    "name": "ENMAX",
    "city": "Calgary",
    "province": "Alberta",
    "industry": "Utilities"
  },
  {
    "rank": 92,
    "name": "Bennett Jones",
    "city": "Calgary",
    "province": "Alberta",
    "industry": "Professional Services"
  },
  {
    "rank": 95,
    "name": "Freson Bros.",
    "city": "Stony Plain",
    "province": "Alberta",
    "industry": "Retail and Wholesale"
  },
  {
    "rank": 141,
    "name": "Mount Royal University",
    "city": "Calgary",
    "province": "Alberta",
    "industry": "Education"
  },
  {
    "rank": 149,
    "name": "University of Alberta",
    "city": "Edmonton",
    "province": "Alberta",
    "industry": "Education"
  },
  {
    "rank": 162,
    "name": "Enbridge",
    "city": "Calgary",
    "province": "Alberta",
    "industry": "Utilities"
  },
  {
    "rank": 164,
    "name": "Rogers Communications",
    "city": "Calgary",
    "province": "Alberta",
    "industry": "Telecommunications Services, Cable Supplier"
  },
  {
    "rank": 195,
    "name": "Mark's",
    "city": "Calgary",
    "province": "Alberta",
    "industry": "Clothing, Shoes, Sports Equipment"
  }
]

/** Rank on the 2025 list, for the Alberta employers that were on it. */
export const FORBES_CULTURE_2025_RANK: Record<string, number> = {
  "University of Alberta": 28,
  "ATB Financial": 59,
  "Stantec": 64,
  "Rogers Communications": 83,
  "Freson Bros.": 143,
  "Enbridge": 19,
  "Bennett Jones": 81,
  "Shell Canada": 85,
  "Mount Royal University": 114,
  "Bethany Care Society": 162,
  "ENMAX": 163,
}

export const FORBES_CULTURE_BY_INDUSTRY: Array<{ industry: string; count: number; top: RankedEmployer[] }> = [
  {
    "industry": "Healthcare & Social Services",
    "count": 33,
    "top": [
      {
        "rank": 3,
        "name": "Oak Valley Health",
        "city": "Markham",
        "province": "Ontario"
      },
      {
        "rank": 5,
        "name": "Bethany Care Society",
        "city": "Calgary",
        "province": "Alberta"
      },
      {
        "rank": 8,
        "name": "Canadian Blood Services",
        "city": "Ottawa",
        "province": "Ontario"
      }
    ]
  },
  {
    "industry": "Education",
    "count": 30,
    "top": [
      {
        "rank": 1,
        "name": "Université Laval",
        "city": "Québec",
        "province": "Quebec"
      },
      {
        "rank": 2,
        "name": "Université de Sherbrooke",
        "city": "Sherbrooke",
        "province": "Quebec"
      },
      {
        "rank": 6,
        "name": "George Brown College",
        "city": "Toronto",
        "province": "Ontario"
      }
    ]
  },
  {
    "industry": "Banking and Financial Services",
    "count": 21,
    "top": [
      {
        "rank": 16,
        "name": "IG Wealth Management",
        "city": "Winnipeg",
        "province": "Manitoba"
      },
      {
        "rank": 19,
        "name": "Business Development Bank of Canada",
        "city": "Montreal",
        "province": "Quebec"
      },
      {
        "rank": 22,
        "name": "CIBC",
        "city": "Toronto",
        "province": "Ontario"
      }
    ]
  },
  {
    "industry": "IT Software & Services",
    "count": 13,
    "top": [
      {
        "rank": 13,
        "name": "DXC Technology",
        "city": "Ashburn",
        "province": "Virginia"
      },
      {
        "rank": 27,
        "name": "HCLTech",
        "city": "Mississauga",
        "province": "Ontario"
      },
      {
        "rank": 30,
        "name": "Cisco Systems",
        "city": "Toronto",
        "province": "Ontario"
      }
    ]
  },
  {
    "industry": "Professional Services",
    "count": 12,
    "top": [
      {
        "rank": 7,
        "name": "Stantec",
        "city": "Edmonton",
        "province": "Alberta"
      },
      {
        "rank": 34,
        "name": "EY Canada",
        "city": "Toronto",
        "province": "Ontario"
      },
      {
        "rank": 66,
        "name": "PwC",
        "city": "New York",
        "province": "New York"
      }
    ]
  },
  {
    "industry": "Retail and Wholesale",
    "count": 11,
    "top": [
      {
        "rank": 10,
        "name": "Home Hardware",
        "city": "St Jacobs",
        "province": "Ontario"
      },
      {
        "rank": 59,
        "name": "Indigo Books & Music",
        "city": "Toronto",
        "province": "Ontario"
      },
      {
        "rank": 60,
        "name": "American Eagle Outfitters",
        "city": "Pittsburgh",
        "province": "Pennsylvania"
      }
    ]
  },
  {
    "industry": "Utilities",
    "count": 10,
    "top": [
      {
        "rank": 24,
        "name": "BC Hydro",
        "city": "Vancouver",
        "province": "British Columbia"
      },
      {
        "rank": 42,
        "name": "Ontario Power Generation",
        "city": "Toronto",
        "province": "Ontario"
      },
      {
        "rank": 55,
        "name": "Brookfield Renewable Holdings",
        "city": "Toronto",
        "province": "Ontario"
      }
    ]
  },
  {
    "industry": "Insurance",
    "count": 8,
    "top": [
      {
        "rank": 4,
        "name": "Manitoba Public Insurance",
        "city": "Winnipeg",
        "province": "Manitoba"
      },
      {
        "rank": 20,
        "name": "Intact Financial",
        "city": "Toronto",
        "province": "Ontario"
      },
      {
        "rank": 41,
        "name": "The Co-operators",
        "city": "Guelph",
        "province": "Ontario"
      }
    ]
  },
  {
    "industry": "Clothing, Shoes, Sports Equipment",
    "count": 8,
    "top": [
      {
        "rank": 38,
        "name": "Aritzia",
        "city": "Vancouver",
        "province": "British Columbia"
      },
      {
        "rank": 94,
        "name": "Inditex",
        "city": "Montreal",
        "province": "Quebec"
      },
      {
        "rank": 103,
        "name": "H&M - Hennes & Mauritz",
        "city": "Stockholm",
        "province": null
      }
    ]
  },
  {
    "industry": "Business Services & Supplies",
    "count": 7,
    "top": [
      {
        "rank": 33,
        "name": "Teleperformance",
        "city": "Paris",
        "province": null
      },
      {
        "rank": 35,
        "name": "Randstad",
        "city": "Toronto",
        "province": "Ontario"
      },
      {
        "rank": 43,
        "name": "CGI",
        "city": "Montreal",
        "province": "Quebec"
      }
    ]
  },
  {
    "industry": "Construction, Chemicals, Raw Materials",
    "count": 5,
    "top": [
      {
        "rank": 14,
        "name": "Mosaic",
        "city": "Tampa",
        "province": "Florida"
      },
      {
        "rank": 37,
        "name": "Shell Canada",
        "city": "Calgary",
        "province": "Alberta"
      },
      {
        "rank": 77,
        "name": "Suncor Energy",
        "city": "Calgary",
        "province": "Alberta"
      }
    ]
  },
  {
    "industry": "Food, Soft Beverages, Alcohol & Tobacco",
    "count": 5,
    "top": [
      {
        "rank": 17,
        "name": "McCain Foods",
        "city": "Florenceville-Bristol",
        "province": "New Brunswick"
      },
      {
        "rank": 49,
        "name": "Arby's",
        "city": "Sandy Springs",
        "province": "Georgia"
      },
      {
        "rank": 54,
        "name": "The Hershey Company",
        "city": "Mississauga",
        "province": "Ontario"
      }
    ]
  },
  {
    "industry": "Restaurants",
    "count": 5,
    "top": [
      {
        "rank": 71,
        "name": "Cactus Club Café",
        "city": "Vancouver",
        "province": "British Columbia"
      },
      {
        "rank": 123,
        "name": "Starbucks",
        "city": "Seattle",
        "province": "Washington"
      },
      {
        "rank": 154,
        "name": "A&W Food Services",
        "city": "North Vancouver",
        "province": "British Columbia"
      }
    ]
  },
  {
    "industry": "Semiconductors, Electronics, Electrical Engineering",
    "count": 4,
    "top": [
      {
        "rank": 18,
        "name": "Apple",
        "city": "Cupertino",
        "province": "California"
      },
      {
        "rank": 93,
        "name": "IBM",
        "city": "Armonk",
        "province": "New York"
      },
      {
        "rank": 100,
        "name": "NVIDIA",
        "city": "Santa Clara",
        "province": "California"
      }
    ]
  },
  {
    "industry": "Transportation and Logistics",
    "count": 4,
    "top": [
      {
        "rank": 53,
        "name": "Transat A.T.",
        "city": "Montreal",
        "province": "Quebec"
      },
      {
        "rank": 67,
        "name": "TransLink",
        "city": "New Westminster",
        "province": "British Columbia"
      },
      {
        "rank": 69,
        "name": "Jazz Aviation",
        "city": "Dartmouth",
        "province": "Nova Scotia"
      }
    ]
  },
  {
    "industry": "Drugs & Biotechnology",
    "count": 4,
    "top": [
      {
        "rank": 78,
        "name": "BioScript Solutions",
        "city": "Moncton",
        "province": "New Brunswick"
      },
      {
        "rank": 91,
        "name": "Teva Canada",
        "city": "Toronto",
        "province": "Ontario"
      },
      {
        "rank": 99,
        "name": "Johnson & Johnson",
        "city": "Markham",
        "province": "Ontario"
      }
    ]
  },
  {
    "industry": "Engineering, Manufacturing",
    "count": 4,
    "top": [
      {
        "rank": 106,
        "name": "3M",
        "city": "London",
        "province": "Ontario"
      },
      {
        "rank": 118,
        "name": "Cascades",
        "city": "Kingsey Falls",
        "province": "Quebec"
      },
      {
        "rank": 125,
        "name": "West Fraser Timber",
        "city": "Vancouver",
        "province": "British Columbia"
      }
    ]
  },
  {
    "industry": "Automotive (Automotive and Suppliers)",
    "count": 3,
    "top": [
      {
        "rank": 15,
        "name": "Michelin North America (Canada)",
        "city": "Greenville",
        "province": "South Carolina"
      },
      {
        "rank": 44,
        "name": "Goodyear",
        "city": "Akron",
        "province": "Ohio"
      },
      {
        "rank": 194,
        "name": "Lordco Auto Parts",
        "city": "Port Coquitlam",
        "province": "British Columbia"
      }
    ]
  },
  {
    "industry": "Travel & Leisure",
    "count": 3,
    "top": [
      {
        "rank": 65,
        "name": "Marriott Hotels (Canada)",
        "city": "Mississauga",
        "province": "Ontario"
      },
      {
        "rank": 113,
        "name": "Four Seasons Hotels and Resorts",
        "city": "Toronto",
        "province": "Ontario"
      },
      {
        "rank": 128,
        "name": "Accor",
        "city": "Mississauga",
        "province": "Ontario"
      }
    ]
  },
  {
    "industry": "Media & Advertising",
    "count": 3,
    "top": [
      {
        "rank": 89,
        "name": "Ubisoft",
        "city": "Montreal",
        "province": "Quebec"
      },
      {
        "rank": 117,
        "name": "Publicis Worldwide",
        "city": "Paris",
        "province": null
      },
      {
        "rank": 169,
        "name": "CBC/Radio-Canada",
        "city": "Ottawa",
        "province": "Ontario"
      }
    ]
  },
  {
    "industry": "Packaged Goods",
    "count": 3,
    "top": [
      {
        "rank": 96,
        "name": "Hallmark Canada",
        "city": "Markham",
        "province": "Ontario"
      },
      {
        "rank": 107,
        "name": "LUSH Fresh Handmade Cosmetics",
        "city": "Pool",
        "province": null
      },
      {
        "rank": 137,
        "name": "Unilever",
        "city": "Toronto",
        "province": "Ontario"
      }
    ]
  },
  {
    "industry": "Telecommunications Services, Cable Supplier",
    "count": 2,
    "top": [
      {
        "rank": 39,
        "name": "TekSavvy Solutions",
        "city": "Chatham",
        "province": "Ontario"
      },
      {
        "rank": 164,
        "name": "Rogers Communications",
        "city": "Calgary",
        "province": "Alberta"
      }
    ]
  },
  {
    "industry": "Medical Equipment & Services",
    "count": 2,
    "top": [
      {
        "rank": 152,
        "name": "Canadian Institute for Health Information",
        "city": "Ottawa",
        "province": "Ontario"
      },
      {
        "rank": 189,
        "name": "LifeLabs",
        "city": "Toronto",
        "province": "Ontario"
      }
    ]
  }
]
