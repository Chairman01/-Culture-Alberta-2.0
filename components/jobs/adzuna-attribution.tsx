/**
 * "Jobs by Adzuna" attribution badge — required by the Adzuna API terms of
 * service on any page displaying their listings (min 116x23px, both words
 * linked to the Adzuna site).
 */
export function AdzunaAttribution({ className = '' }: { className?: string }) {
  return (
    <span
      className={`inline-flex min-h-[23px] min-w-[116px] items-center gap-1 text-sm text-gray-500 ${className}`}
    >
      <a
        href="https://www.adzuna.ca"
        target="_blank"
        rel="noopener noreferrer"
        className="hover:underline"
      >
        Jobs
      </a>
      <span>by</span>
      <a
        href="https://www.adzuna.ca"
        target="_blank"
        rel="noopener noreferrer"
        className="font-semibold text-emerald-700 hover:underline"
      >
        Adzuna
      </a>
    </span>
  )
}
