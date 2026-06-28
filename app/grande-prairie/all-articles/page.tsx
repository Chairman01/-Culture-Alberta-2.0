import { CityAllArticles } from '@/components/city-all-articles'
import { CITY_PAGES, buildCityAllArticlesMetadata } from '@/lib/city-pages'

export const metadata = buildCityAllArticlesMetadata('grande-prairie')
export const revalidate = 900

export default function Page() {
  return <CityAllArticles config={CITY_PAGES['grande-prairie']} />
}
