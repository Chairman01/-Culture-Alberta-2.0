// Server-rendered FAQ accordion for tool pages.
// Renders the SAME questions as the page's FAQPage JSON-LD so the visible
// content matches the structured data (required for FAQ rich results).
interface ToolFaqItem {
  q: string
  a: string
}

export function ToolFaq({ title, items }: { title: string; items: ToolFaqItem[] }) {
  return (
    <section className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden mb-8">
      <div className="px-6 py-4 border-b border-gray-100">
        <h2 className="text-xl font-bold text-gray-900">{title}</h2>
      </div>
      <div className="divide-y divide-gray-100">
        {items.map((item) => (
          <details key={item.q} className="group px-6 py-4">
            <summary className="flex items-center justify-between cursor-pointer list-none">
              <span className="font-semibold text-gray-900 text-sm pr-4">{item.q}</span>
              <span className="text-gray-400 text-lg leading-none group-open:rotate-45 transition-transform inline-block shrink-0">
                +
              </span>
            </summary>
            <p className="text-sm text-gray-600 leading-relaxed mt-3">{item.a}</p>
          </details>
        ))}
      </div>
    </section>
  )
}
