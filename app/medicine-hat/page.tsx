import { CityHub } from '@/components/city-hub'
import { CITY_PAGES, buildCityMetadata } from '@/lib/city-pages'

export const metadata = buildCityMetadata('medicine-hat')
export const revalidate = 900

export default function Page() {
  return <CityHub config={CITY_PAGES['medicine-hat']} />
}
