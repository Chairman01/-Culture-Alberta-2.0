"use client"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { MAX_TITLE_LENGTH, previewSeoTitle } from "@/lib/seo/title"

interface SeoTitleFieldProps {
  headline: string
  value: string
  onChange: (value: string) => void
}

/**
 * The <title> override. Google truncates around 60 characters; on 2026-08-31,
 * 714 of 741 published headlines were longer than that, so every one of them
 * was cut in the results page. Left blank, the page shortens the headline at a
 * word boundary — the preview line shows exactly what will be sent either way.
 */
export function SeoTitleField({ headline, value, onChange }: SeoTitleFieldProps) {
  const trimmedHeadline = headline.trim()
  const preview = previewSeoTitle(headline, value)
  const headlineTooLong = trimmedHeadline.length > MAX_TITLE_LENGTH
  const nearLimit = value.length >= MAX_TITLE_LENGTH - 5

  return (
    <div>
      <Label htmlFor="seoTitle">
        Search title{" "}
        <span className="font-normal text-muted-foreground">(optional · {MAX_TITLE_LENGTH} max)</span>
      </Label>
      <Input
        id="seoTitle"
        value={value}
        onChange={(e) => onChange(e.target.value.slice(0, MAX_TITLE_LENGTH))}
        maxLength={MAX_TITLE_LENGTH}
        placeholder="Leave blank to shorten the headline automatically"
      />
      <p className={`mt-1 text-xs ${nearLimit ? "text-amber-600" : "text-muted-foreground"}`}>
        {value.length}/{MAX_TITLE_LENGTH}
        {trimmedHeadline && (
          <>
            {" · "}Google will see: <span className="font-medium text-foreground">{preview}</span>
          </>
        )}
      </p>
      {headlineTooLong && !value.trim() && (
        <p className="mt-1 text-xs text-amber-600">
          Headline is {trimmedHeadline.length} characters — search results cut it at {MAX_TITLE_LENGTH}.
          Write a shorter search title, or accept the automatic cut shown above.
        </p>
      )}
    </div>
  )
}
