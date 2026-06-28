import { CityAllArticles } from '@/components/city-all-articles'
import { CITY_PAGES, buildCityAllArticlesMetadata } from '@/lib/city-pages'

export const metadata = buildCityAllArticlesMetadata('red-deer')
export const revalidate = 900

export default function Page() {
  return <CityAllArticles config={CITY_PAGES['red-deer']} />
}
