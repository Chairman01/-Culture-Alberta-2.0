/**
 * Reference tables for the top-employers page: published figures from named
 * sources, each with the period it covers.
 *
 * Every row was read from the source linked beside it on 2026-10-01. Nothing is
 * estimated. Headcounts are quoted with the scope the employer itself gives —
 * most company figures are company-wide, not Alberta-only, and the table says
 * which. Where a figure could not be traced to the organization's own report
 * it was left out rather than filled from a ranking's data.
 */

export type Cell = string | { text: string; href: string }

export interface ReferenceSection {
  id: string
  navLabel: string
  title: string
  intro: string
  columns: string[]
  rows: Cell[][]
  note?: string
  sources: Array<{ label: string; url: string }>
}

const src = (text: string, href: string): Cell => ({ text, href })

const FORBES_MAIN = 'https://www.forbes.com/lists/canada-best-employers/'
const BUDGET_2026 =
  'https://open.alberta.ca/dataset/3393a7b5-07bf-4b9f-8aaf-a6d89273297b/resource/58a8d024-398f-482e-b1c2-81a754a97253/download/budget-2026-fiscal-plan-2026-29.pdf'

export const REFERENCE_SECTIONS: ReferenceSection[] = [
  {
    id: 'forbes-best-employers',
    navLabel: 'Best Employers list',
    title: "Alberta employers on Forbes' Canada's Best Employers 2026",
    intro:
      'The broader of the two Forbes lists: 300 employers, published in January 2026. Thirty-four are listed in Alberta. This one asks about pay, flexibility, training and leadership as well as culture.',
    columns: ['Rank', 'Employer', 'City', 'Industry'],
    rows: [
      ['33', "Workers' Compensation Board of Alberta", 'Edmonton', 'Government Services'],
      ['36', 'Bethany Care Society', 'Calgary', 'Healthcare & Social Services'],
      ['54', 'University of Alberta', 'Edmonton', 'Education'],
      ['55', 'Calgary Exhibition and Stampede', 'Calgary', 'Travel & Leisure'],
      ['72', 'Bennett Jones', 'Calgary', 'Professional Services'],
      ['84', 'ENMAX', 'Calgary', 'Utilities'],
      ['88', 'Alberta Energy Regulator', 'Calgary', 'Utilities'],
      ['104', 'Mount Royal University', 'Calgary', 'Education'],
      ['108', 'Stantec', 'Edmonton', 'Professional Services'],
      ['115', 'SMART Technologies', 'Calgary', 'IT Software & Services'],
      ['119', 'City of Calgary', 'Calgary', 'Government Services'],
      ['130', 'Enbridge', 'Calgary', 'Utilities'],
      ['137', 'EPCOR Utilities', 'Edmonton', 'Utilities'],
      ['139', 'Bantrel', 'Calgary', 'Construction, Chemicals, Raw Materials'],
      ['152', 'Freson Bros.', 'Stony Plain', 'Retail and Wholesale'],
      ['186', 'Strathcona County', 'Sherwood Park', 'Government Services'],
      ['188', 'Western Financial Group', 'High River', 'Insurance'],
      ['194', 'Canadian Natural Resources', 'Calgary', 'Construction, Chemicals, Raw Materials'],
      ['200', 'PCL Construction', 'Edmonton', 'Construction, Chemicals, Raw Materials'],
      ['201', 'Fountain Tire', 'Edmonton', 'Automotive'],
      ['206', 'Suncor Energy', 'Calgary', 'Construction, Chemicals, Raw Materials'],
      ['220', 'Boardwalk Rental Communities', 'Calgary', 'Professional Services'],
      ['228', 'AutoCanada', 'Edmonton', 'Automotive'],
      ['234', 'MNP', 'Calgary', 'Professional Services'],
      ['238', 'Cenovus Energy', 'Calgary', 'Construction, Chemicals, Raw Materials'],
      ['239', 'Black Gold Regional Schools', 'Nisku', 'Education'],
      ['241', 'Landmark Cinemas', 'Calgary', 'Travel & Leisure'],
      ['265', 'Armtec', 'Edmonton', 'Construction, Chemicals, Raw Materials'],
      ['268', 'Alberta Blue Cross', 'Edmonton', 'Insurance'],
      ['270', 'Shell Canada', 'Calgary', 'Construction, Chemicals, Raw Materials'],
      ['279', 'Covenant Health', 'Edmonton', 'Healthcare & Social Services'],
      ['280', 'DCM Group', 'Sherwood Park', 'Engineering, Manufacturing'],
      ['286', 'Rogers Communications', 'Calgary', 'Telecommunications'],
      ['287', 'ATB Financial', 'Edmonton', 'Banking and Financial Services'],
    ],
    note: 'Cities and industries are as Forbes lists them; it files oil and gas producers under "Construction, Chemicals, Raw Materials".',
    sources: [{ label: "Forbes, Canada's Best Employers 2026", url: FORBES_MAIN }],
  },
  {
    id: 'largest-employers',
    navLabel: 'Largest employers',
    title: 'Some of the largest employers in Alberta',
    intro:
      "Workforce size as each organization reports it. This is not a ranking: the figures count different things (people or full-time equivalents) over different areas, and most company figures are company-wide, not Alberta alone. Read the scope beside each one.",
    columns: ['Employer', 'Sector', 'Workforce', 'What it counts', 'Source'],
    rows: [
      ['Alberta Health Services', 'Health', '115,464 staff', 'Alberta, 2024-25, before the 2025 split into new agencies',
        src('AHS Quick Facts', 'https://www.albertahealthservices.ca/assets/about/publications/ahs-pub-quick-facts-annual.pdf')],
      ['Government of Alberta departments', 'Provincial government', '29,047 FTE', 'Alberta, 2026-27 estimate',
        src('Budget 2026', BUDGET_2026)],
      ['City of Calgary', 'Municipal', '18,620 FTE', 'Calgary, 2025',
        src('2025 annual report', 'https://www.calgary.ca/content/dam/www/cfod/finance/documents/2025-Annual-Financial-Report.pdf')],
      ['Calgary Board of Education', 'K-12', 'More than 16,000 employees', 'Calgary, 2025-26',
        src('Budget report', 'https://www.cbe.ab.ca/about-us/budget-and-finance/Documents/Budget-Report-2025-2026.pdf')],
      ['City of Edmonton', 'Municipal', '15,809.5 FTE', 'Edmonton, 2026 budget',
        src('2026 budget', 'https://www.edmonton.ca/sites/default/files/public-files/documents/2026-approved-budget.pdf')],
      ['University of Alberta', 'Post-secondary', '11,884 employees', 'Alberta, year not stated',
        src('U of A facts', 'https://www.ualberta.ca/en/about/facts.html')],
      ['Covenant Health', 'Health', '11,729 active employees', 'Alberta, 2024-25',
        src('Report to the community', 'https://covenanthealth.ca/sites/default/files/2025-09/report-to-the-community-2025.pdf')],
      ['Edmonton Public Schools', 'K-12', '10,873 FTE', 'Edmonton, September 30, 2025',
        src('EPSB facts', 'https://www.epsb.ca/ourdistrict/facts/')],
      ['Stantec', 'Engineering', 'About 34,000; about 9,400 in Canada', 'Worldwide, end of 2025',
        src('Annual information form', 'https://www.sec.gov/Archives/edgar/data/1131383/000113138326000007/ex-991xaif2025.htm')],
      ['CPKC', 'Rail', '19,479', 'Canada, U.S. and Mexico, end of 2025',
        src('Annual report', 'https://www.sec.gov/Archives/edgar/data/16875/000001687526000008/cp-20251231.htm')],
      ['Suncor Energy', 'Oil and gas', '15,424', 'Company-wide, end of 2025',
        src('Annual information form', 'https://www.sec.gov/Archives/edgar/data/311337/000110465926020411/su-20251231xex99d1.htm')],
      ['Enbridge', 'Pipelines', 'About 14,800 regular employees', 'North America, end of 2025',
        src('Annual report', 'https://www.sec.gov/Archives/edgar/data/895728/000119312526049810/enb-20251231.htm')],
      ['Canadian Natural Resources', 'Oil and gas', '10,750 FTE', 'Worldwide, end of 2025',
        src('Annual report', 'https://www.sec.gov/Archives/edgar/data/1017413/000101741326000018/cnq-20251231.htm')],
      ['Cenovus Energy', 'Oil and gas', '7,211 FTE', 'Company-wide including U.S. refining, end of 2025',
        src('Annual information form', 'https://www.sec.gov/Archives/edgar/data/1475260/000147526026000008/a2025annualinformationform.htm')],
      ['TC Energy', 'Pipelines', '6,574; 2,185 in Calgary', 'Canada, U.S. and Mexico, end of 2025',
        src('Annual information form', 'https://www.sec.gov/Archives/edgar/data/1232384/000123238426000015/a12312025tceaifenglish.htm')],
      ['ATB Financial', 'Banking', '5,251 FTE', 'Alberta, March 31, 2025',
        src('Annual report', 'https://www.atb.com/siteassets/pdf/ar/atb-annual-report-2025.pdf')],
      ['Imperial Oil', 'Oil and gas', 'About 5,000 regular employees', 'Canada, end of 2025',
        src('Annual report', 'https://www.sec.gov/Archives/edgar/data/49938/000004993826000009/imo-20251231.htm')],
      ['Calgary Co-op', 'Retail', '3,500', 'Calgary area, 2026',
        src('AGM release', 'https://www.calgarycoop.com/wp-content/uploads/2026/04/AGM-2026-Press-Release-Final.pdf')],
      ['Pembina Pipeline', 'Pipelines', '2,974; 1,089 in the Calgary office', 'Company-wide, end of 2025',
        src('Annual information form', 'https://www.sec.gov/Archives/edgar/data/1546066/000154606626000014/aifppcq42025.htm')],
      ['AltaGas', 'Utilities', '2,853', 'Company-wide, end of 2025',
        src('Annual information form', 'https://www.altagas.ca/sites/default/files/2026-03/2025%20AltaGas%20AIF-FINAL.pdf')],
    ],
    note: 'FTE means full-time equivalents, which is lower than a count of people. Alberta Health Services was reorganized into several agencies in 2025; the figure shown is the last one published for the whole organization.',
    sources: [{ label: "Government of Alberta Budget 2026, and each organization's own report linked in its row", url: BUDGET_2026 }],
  },
  {
    id: 'employment-by-industry',
    navLabel: 'Jobs by industry',
    title: 'Where Albertans work: employment by industry',
    intro:
      'How many people worked in each industry in Alberta in 2025, from Statistics Canada. For context, 2,661,100 Albertans were employed in August 2026 and the unemployment rate was 6.8 per cent.',
    columns: ['Industry', 'People employed, 2025 average'],
    rows: [
      ['Wholesale and retail trade', '360,900'],
      ['Health care and social assistance', '339,100'],
      ['Construction', '259,300'],
      ['Professional, scientific and technical services', '245,900'],
      ['Educational services', '175,000'],
      ['Accommodation and food services', '154,600'],
      ['Transportation and warehousing', '151,800'],
      ['Manufacturing', '149,500'],
      ['Finance, insurance, real estate, rental and leasing', '144,900'],
      ['Forestry, fishing, mining, quarrying, oil and gas', '144,400'],
      ['Public administration', '132,500'],
      ['Other services', '97,600'],
      ['Information, culture and recreation', '91,800'],
      ['Business, building and other support services', '82,300'],
      ['Agriculture', '37,900'],
      ['Utilities', '22,800'],
      ['All industries', '2,590,100'],
    ],
    note: 'Oil and gas employs fewer people directly than retail, health care or construction, though it pays the most (next table).',
    sources: [
      { label: 'Statistics Canada, Labour Force Survey, Table 14-10-0023-01', url: 'https://www150.statcan.gc.ca/t1/tbl1/en/tv.action?pid=1410002301' },
      { label: 'Table 14-10-0287-01 (August 2026)', url: 'https://www150.statcan.gc.ca/t1/tbl1/en/tv.action?pid=1410028701' },
    ],
  },
  {
    id: 'pay-by-industry',
    navLabel: 'Pay by industry',
    title: 'What each industry pays: average weekly earnings in Alberta',
    intro:
      'Average weekly earnings for all employees in each industry in Alberta in 2025, including overtime. The average across all industries was $1,357.70 a week.',
    columns: ['Industry', 'Average weekly earnings, 2025'],
    rows: [
      ['Mining, quarrying, and oil and gas extraction', '$2,647.02'],
      ['Utilities', '$2,274.13'],
      ['Management of companies and enterprises', '$2,079.59'],
      ['Professional, scientific and technical services', '$1,863.06'],
      ['Finance and insurance', '$1,836.69'],
      ['Construction', '$1,723.04'],
      ['Forestry, logging and support', '$1,698.27'],
      ['Public administration', '$1,690.19'],
      ['Information and cultural industries', '$1,682.23'],
      ['Wholesale trade', '$1,524.32'],
      ['Transportation and warehousing', '$1,518.36'],
      ['Real estate and rental and leasing', '$1,449.96'],
      ['Manufacturing', '$1,420.04'],
      ['Educational services', '$1,246.89'],
      ['Administrative and support', '$1,151.71'],
      ['Other services', '$1,121.25'],
      ['Health care and social assistance', '$1,088.17'],
      ['Retail trade', '$765.93'],
      ['Arts, entertainment and recreation', '$732.86'],
      ['Accommodation and food services', '$521.96'],
    ],
    note: 'Weekly averages are pulled down in industries with many part-time jobs, such as retail and food service, so they understate full-time pay there.',
    sources: [
      { label: 'Statistics Canada, Survey of Employment, Payrolls and Hours, Table 14-10-0204-01', url: 'https://www150.statcan.gc.ca/t1/tbl1/en/tv.action?pid=1410020401' },
    ],
  },
]
