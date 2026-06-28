import { CityHub } from '@/components/city-hub'
import { CITY_PAGES, buildCityMetadata } from '@/lib/city-pages'

export const metadata = buildCityMetadata('lethbridge')
export const revalidate = 900

export default function Page() {
  return <CityHub config={CITY_PAGES['lethbridge']} />
}
