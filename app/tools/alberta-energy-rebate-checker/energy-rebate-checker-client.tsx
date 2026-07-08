"use client"

import Link from "next/link"
import Image from "next/image"
import { useState, useMemo } from "react"
import {
  ArrowLeft,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Info,
  Landmark,
  ClipboardList,
  Mail,
  Newspaper,
  ExternalLink,
} from "lucide-react"

// ---------------------------------------------------------------------------
// Alberta Energy Rebate — official program rules (verified July 2026 against
// the energyrebate.alberta.ca application flow — update if the program changes)
// ---------------------------------------------------------------------------
const INCOME_LIMIT = 225000
const PORTAL_URL = "https://energyrebate.alberta.ca"

// Banks supported by the Interac verification service used to verify an
// Alberta.ca Account (from the official Interac screen, July 2026)
const SUPPORTED_BANKS = [
  "BMO",
  "CIBC",
  "Desjardins",
  "First West — Envision Financial",
  "First West — Valley First",
  "First West — Island Savings",
  "Libro",
  "National Bank",
  "Prospera",
  "RBC",
  "Scotiabank",
  "TD Canada Trust",
]

type Answer = "yes" | "no" | null

interface Question {
  id: string
  label: string
  help?: string
}

const QUESTIONS: Question[] = [
  {
    id: "resident",
    label: "Do you currently reside in Alberta?",
  },
  {
    id: "adult",
    label: "Were you 18 years of age or older on July 1, 2026?",
  },
  {
    id: "noa",
    label: "Have you received your 2025 Notice of Assessment (NOA)?",
    help: "The NOA is the summary the CRA sends after processing your 2025 tax return. If it hasn't been issued yet, the government cannot verify your income and your application will be rejected.",
  },
  {
    id: "income",
    label: `Was your income on your 2025 tax return $${INCOME_LIMIT.toLocaleString("en-CA")} or less?`,
    help: "This is your income as reported on your 2025 income tax return — the same figure the program checks against the CRA.",
  },
  {
    id: "married",
    label: "On your 2025 tax return, did you report your marital status as married or common-law?",
    help: "Either answer is fine — this doesn't affect eligibility. If yes, you'll need your spouse or partner's details to apply.",
  },
  {
    id: "account",
    label: "Do you have a verified Alberta.ca Account?",
    help: "You sign in to the rebate portal with a verified Alberta.ca Account. If you don't have one yet, you can create and verify it before applying — see the steps below.",
  },
]

export default function EnergyRebateCheckerClient() {
  const [answers, setAnswers] = useState<Record<string, Answer>>({
    resident: null,
    adult: null,
    noa: null,
    income: null,
    married: null,
    account: null,
  })

  const setAnswer = (id: string, value: Answer) =>
    setAnswers((prev) => ({ ...prev, [id]: value }))

  const result = useMemo(() => {
    const { resident, adult, noa, income, married, account } = answers
    const answeredCore = resident !== null && adult !== null && noa !== null && income !== null
    if (!answeredCore || married === null || account === null) return { state: "incomplete" as const }

    if (resident === "no") return { state: "fail" as const, reason: "The Alberta Energy Rebate is only available to people who currently live in Alberta." }
    if (adult === "no") return { state: "fail" as const, reason: "You must have been 18 years of age or older on July 1, 2026 to qualify." }
    if (income === "no") return { state: "fail" as const, reason: `The rebate is limited to Albertans whose 2025 tax return income was $${INCOME_LIMIT.toLocaleString("en-CA")} or less.` }
    if (noa === "no") return { state: "noa" as const }
    if (account === "no") return { state: "account" as const }
    return { state: "pass" as const }
  }, [answers])

  const needsSpouseInfo = answers.married === "yes"

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Back nav */}
      <div className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-4 max-w-6xl py-3">
          <Link href="/tools" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors">
            <ArrowLeft className="w-3.5 h-3.5" />
            All Tools
          </Link>
        </div>
      </div>

      {/* Header */}
      <header className="bg-white border-b border-gray-200 py-10">
        <div className="container mx-auto px-4 max-w-6xl space-y-6">
          <div>
            <span className="inline-block text-xs font-semibold bg-sky-100 text-sky-700 px-2.5 py-1 rounded-full mb-3">
              Free Checker · Official 2026 Rules · Takes 30 Seconds
            </span>
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
              Alberta Energy Rebate Eligibility Checker
            </h1>
            <p className="text-gray-500 text-base max-w-2xl leading-relaxed">
              Answer six quick questions — the same ones the official application asks — to see if
              you qualify for the $100 Alberta Energy Rebate, exactly what documents you need, and
              how to apply without your application being rejected.
            </p>
          </div>

          {/* Key facts */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-3xl energy-rebate-key-facts">
            <div className="bg-gray-50 rounded-xl border border-gray-100 text-center py-4 px-3">
              <p className="text-[10px] text-gray-400 uppercase tracking-wide font-semibold mb-0.5">Rebate</p>
              <p className="text-lg font-bold text-sky-700">$100</p>
              <p className="text-[10px] text-gray-400">payment</p>
            </div>
            <div className="bg-gray-50 rounded-xl border border-gray-100 text-center py-4 px-3">
              <p className="text-[10px] text-gray-400 uppercase tracking-wide font-semibold mb-0.5">Income limit</p>
              <p className="text-lg font-bold text-gray-900">$225K</p>
              <p className="text-[10px] text-gray-400">2025 tax return</p>
            </div>
            <div className="bg-gray-50 rounded-xl border border-red-100 text-center py-4 px-3">
              <p className="text-[10px] text-red-500 uppercase tracking-wide font-semibold mb-0.5">Deadline</p>
              <p className="text-lg font-bold text-red-600">Sept 30</p>
              <p className="text-[10px] text-gray-400">2026 — then it&apos;s gone</p>
            </div>
            <div className="bg-gray-50 rounded-xl border border-gray-100 text-center py-4 px-3">
              <p className="text-[10px] text-gray-400 uppercase tracking-wide font-semibold mb-0.5">Apply at</p>
              <p className="text-sm font-bold text-gray-900 leading-tight mt-1">energyrebate<br />.alberta.ca</p>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 max-w-4xl py-10 space-y-10">

        {/* ---- Eligibility checker ---- */}
        <section id="checker" className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="bg-sky-600 px-6 py-4">
            <p className="text-white font-bold text-lg">Check your eligibility</p>
            <p className="text-sky-100 text-sm mt-0.5">
              These are the same six questions the official application asks.
            </p>
          </div>

          <div className="p-6 space-y-7">
            {QUESTIONS.map((q, i) => (
              <div key={q.id} className="space-y-3">
                <label className="block text-base font-bold text-gray-800">
                  {i + 1}. {q.label}
                  {q.help && (
                    <span className="block text-sm text-gray-500 font-normal mt-0.5">{q.help}</span>
                  )}
                </label>
                <div className="grid grid-cols-2 gap-3 max-w-md">
                  {(["yes", "no"] as const).map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setAnswer(q.id, v)}
                      className={`text-left px-5 py-3.5 rounded-xl border-2 transition-all ${
                        answers[q.id] === v
                          ? "border-sky-600 bg-sky-50"
                          : "border-gray-200 bg-white hover:border-gray-400"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className={`w-5 h-5 rounded-full border-2 shrink-0 flex items-center justify-center ${
                            answers[q.id] === v ? "border-sky-600 bg-sky-600" : "border-gray-300"
                          }`}
                        >
                          {answers[q.id] === v && <span className="w-2 h-2 rounded-full bg-white block" />}
                        </span>
                        <span className="font-bold text-gray-900">{v === "yes" ? "Yes" : "No"}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ))}

            {/* ---- Result ---- */}
            {result.state === "incomplete" && (
              <div className="text-center py-4 text-gray-400 text-sm border-t border-gray-100">
                Answer all six questions to see your result.
              </div>
            )}

            {result.state === "pass" && (
              <div className="rounded-2xl border-2 border-emerald-300 bg-emerald-50 p-6 space-y-4">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-7 h-7 text-emerald-600 shrink-0" />
                  <div>
                    <p className="text-lg font-bold text-emerald-900">
                      You can apply for the Alberta Energy Rebate
                    </p>
                    <p className="text-sm text-emerald-800 mt-1 leading-relaxed">
                      Based on your answers, you meet every requirement the official application
                      checks. Have your Social Insurance Number ready
                      {needsSpouseInfo && (
                        <> — plus your spouse or partner&apos;s legal name, date of birth, and SIN as
                        reported on your 2025 tax return</>
                      )}
                      , then apply on the official portal.
                    </p>
                  </div>
                </div>
                <a
                  href={PORTAL_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 px-8 py-3.5 text-base font-bold text-white transition-colors shadow-sm"
                >
                  Apply at energyrebate.alberta.ca
                  <ExternalLink className="w-4 h-4" />
                </a>
                <p className="text-xs text-emerald-700">
                  <strong>Don&apos;t wait — applications close September 30, 2026.</strong> Your
                  application auto-saves, so you can stop and resume any time. See the{" "}
                  <a href="#how-to-apply" className="underline font-semibold">step-by-step walkthrough</a> below.
                </p>
              </div>
            )}

            {result.state === "noa" && (
              <div className="rounded-2xl border-2 border-amber-300 bg-amber-50 p-6 space-y-3">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-7 h-7 text-amber-600 shrink-0" />
                  <div>
                    <p className="text-lg font-bold text-amber-900">
                      You likely qualify — but don&apos;t apply yet
                    </p>
                    <p className="text-sm text-amber-800 mt-1 leading-relaxed">
                      The application warns that if your 2025 Notice of Assessment hasn&apos;t been
                      issued, the government cannot verify your income and{" "}
                      <strong>your application will be rejected</strong>. File your 2025 tax return
                      if you haven&apos;t, wait for the CRA to send your NOA (check CRA My Account),
                      and then apply. Don&apos;t leave it too long — applications close{" "}
                      <strong>September 30, 2026</strong>, and there&apos;s no late claim.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {result.state === "account" && (
              <div className="rounded-2xl border-2 border-sky-300 bg-sky-50 p-6 space-y-3">
                <div className="flex items-start gap-3">
                  <Info className="w-7 h-7 text-sky-600 shrink-0" />
                  <div>
                    <p className="text-lg font-bold text-sky-900">
                      You qualify — you just need a verified Alberta.ca Account first
                    </p>
                    <p className="text-sm text-sky-800 mt-1 leading-relaxed">
                      The rebate portal signs you in with a verified Alberta.ca Account. Creating
                      one takes a few minutes, and verification is fastest through your bank — see{" "}
                      <a href="#alberta-ca-account" className="underline font-semibold">
                        the account setup steps and supported banks
                      </a>{" "}
                      below (important if you bank with ATB or Servus).
                    </p>
                  </div>
                </div>
              </div>
            )}

            {result.state === "fail" && (
              <div className="rounded-2xl border-2 border-red-300 bg-red-50 p-6">
                <div className="flex items-start gap-3">
                  <XCircle className="w-7 h-7 text-red-600 shrink-0" />
                  <div>
                    <p className="text-lg font-bold text-red-900">
                      Based on your answers, you don&apos;t qualify
                    </p>
                    <p className="text-sm text-red-800 mt-1 leading-relaxed">{result.reason}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* ---- Before you apply ---- */}
        <section id="before-you-apply" className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-sky-100 flex items-center justify-center">
              <ClipboardList className="w-5 h-5 text-sky-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900">What you need before you apply</h2>
          </div>
          <div className="p-6 space-y-3">
            {[
              { text: "A verified Alberta.ca Account", detail: "Not just a basic account — it must be identity-verified. Setup steps below." },
              { text: "Your Social Insurance Number (SIN)", detail: "The program verifies your income directly with the CRA using your SIN — you consent to this in the application." },
              { text: "Your 2025 Notice of Assessment issued", detail: "You don't upload it, but if the CRA hasn't issued it, your application will be rejected." },
              { text: "If you were married or common-law on your 2025 return: your spouse or partner's details", detail: "Their legal name, date of birth, and SIN — exactly as reported on the 2025 income tax return." },
            ].map((item) => (
              <div key={item.text} className="flex items-start gap-3 rounded-xl border border-gray-100 bg-gray-50 p-4">
                <CheckCircle2 className="w-5 h-5 text-sky-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-gray-900 text-sm">{item.text}</p>
                  <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{item.detail}</p>
                </div>
              </div>
            ))}
            <p className="text-xs text-gray-400 pt-1">
              The application saves automatically — you can leave and resume it later from the portal.
            </p>
          </div>
        </section>

        {/* ---- Alberta.ca account + banks ---- */}
        <section id="alberta-ca-account" className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-sky-100 flex items-center justify-center">
              <Landmark className="w-5 h-5 text-sky-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900">
              Setting up your verified Alberta.ca Account
            </h2>
          </div>
          <div className="p-6 space-y-5">
            <p className="text-sm text-gray-600 leading-relaxed">
              The fastest way to verify your identity is the <strong>Interac verification
              service</strong> — you sign in to your online banking and your bank confirms who you
              are. It works with these financial institutions:
            </p>
            <div className="flex flex-wrap gap-2">
              {SUPPORTED_BANKS.map((bank) => (
                <span key={bank} className="text-xs font-semibold bg-gray-100 text-gray-700 px-3 py-1.5 rounded-full">
                  {bank}
                </span>
              ))}
            </div>
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
              <p className="text-sm leading-relaxed text-amber-900">
                <strong>Bank with ATB or Servus?</strong> Alberta&apos;s two biggest local
                institutions — ATB Financial and Servus Credit Union — are <strong>not on the
                Interac verification list</strong>, and neither are online banks like Tangerine or
                Simplii. If your bank isn&apos;t listed, use one of the other identity verification
                options offered during Alberta.ca Account setup instead of the bank option.
              </p>
            </div>
          </div>
        </section>

        {/* ---- Step-by-step walkthrough ---- */}
        <section id="how-to-apply" className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-xl font-bold text-gray-900">How to apply — step by step</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              The full official flow, from tax return to money in your account.
            </p>
          </div>
          <div className="p-6">
            <ol className="space-y-5">
              {[
                {
                  title: "Make sure your 2025 Notice of Assessment has been issued",
                  body: "File your 2025 tax return if you haven't already. Wait until the CRA issues your NOA — applying before it exists gets your application rejected. You can confirm it in CRA My Account.",
                },
                {
                  title: "Create and verify your Alberta.ca Account",
                  body: "If you don't already have one, create an Alberta.ca Account and complete identity verification — fastest through the Interac bank sign-in if your bank is supported (see the list above).",
                },
                {
                  title: "Go to energyrebate.alberta.ca and press “Apply now”",
                  body: "Sign in with your verified Alberta.ca Account. If you started earlier, use “Resume application” — your progress is saved automatically.",
                },
                {
                  title: "Answer the eligibility questions",
                  body: "Alberta residency, 18+ on July 1 2026, 2025 NOA received, marital status on your 2025 return, and income of $225,000 or less. These are the same questions as the checker above, so you already know your answers.",
                },
                {
                  title: "Enter your SIN — and your spouse's details if married or common-law",
                  body: "You'll provide your Social Insurance Number and consent to the government verifying your income with the CRA. If you reported married or common-law in 2025, enter your spouse or partner's legal name, date of birth, and SIN exactly as on the tax return.",
                },
                {
                  title: "Submit and save your Application Code",
                  body: "You'll get a confirmation email with an Application Code and your payment date. You can return to the portal any time to check your application status.",
                },
              ].map((step, i) => (
                <li key={step.title} className="flex items-start gap-4">
                  <span className="w-8 h-8 rounded-full bg-sky-600 text-white font-bold text-sm flex items-center justify-center shrink-0 mt-0.5">
                    {i + 1}
                  </span>
                  <div>
                    <p className="font-bold text-gray-900">{step.title}</p>
                    <p className="text-sm text-gray-600 leading-relaxed mt-1">{step.body}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* ---- After you apply ---- */}
        <section id="after-you-apply" className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-sky-100 flex items-center justify-center">
              <Mail className="w-5 h-5 text-sky-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900">After you apply: status and payment</h2>
          </div>
          <div className="p-6 space-y-4 text-sm text-gray-600 leading-relaxed">
            <p>
              Right after submitting you&apos;ll receive a confirmation email from the Alberta Energy
              Rebate program with your <strong>Application Code</strong>. Keep it — it&apos;s how you
              reference your application.
            </p>
            <p>
              The same email tells you your payment date: the government reviews your application
              and, <strong>if approved, pays you by the date stated in your email</strong>.
              Applications submitted in early July 2026 were given payment dates about one to two
              weeks out (for example, a July 8 application showed payment by Friday, July 17, 2026).
            </p>
            <p>
              You can sign back in at{" "}
              <a href={PORTAL_URL} target="_blank" rel="noopener noreferrer" className="text-sky-600 underline font-semibold">
                energyrebate.alberta.ca
              </a>{" "}
              at any time to check your application status, view your Application Code, and see the
              CRA income-verification consent you provided.
            </p>
          </div>
        </section>

        {/* ---- FAQ (visible; mirrors FAQPage schema) ---- */}
        <section id="faq" className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-xl font-bold text-gray-900">Alberta Energy Rebate — common questions</h2>
          </div>
          <div className="divide-y divide-gray-100">
            {[
              {
                q: "Who qualifies for the Alberta Energy Rebate?",
                a: `You qualify if you currently live in Alberta, were 18 or older on July 1, 2026, your 2025 Notice of Assessment has been issued, and your income on your 2025 tax return was $${INCOME_LIMIT.toLocaleString("en-CA")} or less. You apply online with a verified Alberta.ca Account.`,
              },
              {
                q: "What do I need to apply for the Alberta Energy Rebate?",
                a: "Three things: a verified Alberta.ca Account, your Social Insurance Number, and — if you reported married or common-law on your 2025 return — your spouse or partner's legal name, date of birth, and SIN as reported on that return.",
              },
              {
                q: "What if I haven't received my 2025 Notice of Assessment?",
                a: "Wait before applying. The official application warns that if your NOA hasn't been issued, your income can't be verified and your application will be rejected. File your 2025 taxes, wait for the CRA to issue the NOA, then apply.",
              },
              {
                q: "Can I verify my Alberta.ca Account with ATB or Servus?",
                a: "The Interac verification service used for bank-based identity verification supports BMO, CIBC, Desjardins, First West (Envision, Valley First, Island Savings), Libro, National Bank, Prospera, RBC, Scotiabank, and TD — but not ATB Financial or Servus. If your bank isn't supported, use one of the other identity verification options offered during Alberta.ca Account setup.",
              },
              {
                q: "What is the deadline to apply for the Alberta Energy Rebate?",
                a: "Applications close September 30, 2026. The portal opened July 1, 2026, and there is no late claim — if you miss the window, you don't get the $100. If you're waiting on your 2025 Notice of Assessment, file your taxes as soon as possible so your NOA arrives before the deadline.",
              },
              {
                q: "When do I get the Alberta Energy Rebate payment?",
                a: "Your confirmation email states your exact payment date. If your application is approved, payment arrives by that date — early-July 2026 applications showed payment dates about one to two weeks after applying.",
              },
              {
                q: "How do I check my Alberta Energy Rebate application status?",
                a: "Sign in at energyrebate.alberta.ca with your Alberta.ca Account. You can view your application status and Application Code there at any time. Your Application Code is also in your confirmation email.",
              },
              {
                q: "Can I save my Alberta Energy Rebate application and finish it later?",
                a: "Yes. The application saves automatically as you go. Return to energyrebate.alberta.ca and choose “Resume application” to pick up where you left off.",
              },
            ].map((item) => (
              <details key={item.q} className="group px-6 py-4">
                <summary className="flex items-center justify-between cursor-pointer list-none">
                  <span className="font-semibold text-gray-900 text-sm pr-4">{item.q}</span>
                  <ArrowRight className="w-4 h-4 text-gray-300 group-open:rotate-90 transition-transform shrink-0" />
                </summary>
                <p className="text-sm text-gray-600 leading-relaxed mt-3">{item.a}</p>
              </details>
            ))}
          </div>
        </section>

        {/* Disclaimer */}
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl p-5 text-sm text-amber-800">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold mb-1">Informational tool only</p>
            <p>
              This checker mirrors the eligibility questions on the official application as of July
              2026, but the Government of Alberta makes the final decision on every application.
              This site is not affiliated with the Government of Alberta. Always confirm details on{" "}
              <a href={PORTAL_URL} target="_blank" rel="noopener noreferrer" className="underline font-semibold">
                energyrebate.alberta.ca
              </a>.
            </p>
          </div>
        </div>

        {/* Related reading */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Newspaper className="w-4 h-4 text-gray-400" />
            <p className="text-sm font-bold text-gray-900">Related Reading</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Link
              href="/articles/alberta-energy-rebate-2026-who-qualifies-how-to-apply-and-when-you-get-paid"
              className="group bg-white rounded-2xl border border-sky-100 hover:border-sky-200 overflow-hidden hover:shadow-lg transition-all duration-200 flex flex-col"
            >
              <div className="relative w-full aspect-video overflow-hidden bg-gray-100 shrink-0">
                <Image
                  src="https://itdmwpbsnviassgqfhxk.supabase.co/storage/v1/object/public/Article-image/article-1782066632836-rufgkw.jpg"
                  alt="Alberta Energy Rebate 2026: Who Qualifies, How to Apply, and When You Get Paid"
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-300"
                  sizes="(max-width: 640px) 100vw, 320px"
                />
              </div>
              <div className="p-4 flex items-start justify-between gap-3 flex-1">
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-bold text-sky-600 uppercase tracking-widest mb-0.5">Guide</p>
                  <p className="font-semibold text-gray-900 group-hover:text-sky-700 transition-colors leading-snug text-sm mb-1.5">
                    Alberta Energy Rebate 2026: Who Qualifies, How to Apply, and When You Get Paid
                  </p>
                  <p className="text-xs text-gray-500 leading-relaxed">The full program guide — background, amounts, and every detail of the 2026 rebate.</p>
                </div>
                <ArrowRight className="w-4 h-4 text-gray-300 shrink-0 mt-0.5 group-hover:text-sky-400 group-hover:translate-x-0.5 transition-all" />
              </div>
            </Link>
            <Link
              href="/articles/albertans-can-apply-for-the-100-energy-rebate-starting-this-week-here-is-everything-that-has-changed"
              className="group bg-white rounded-2xl border border-gray-200 hover:border-sky-200 overflow-hidden hover:shadow-lg transition-all duration-200 flex flex-col"
            >
              <div className="relative w-full aspect-video overflow-hidden bg-gray-100 shrink-0">
                <Image
                  src="https://itdmwpbsnviassgqfhxk.supabase.co/storage/v1/object/public/Article-image/article-1782846279140-wfzj4v.jpg"
                  alt="Albertans Can Apply for the $100 Energy Rebate Starting This Week"
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-300"
                  sizes="(max-width: 640px) 100vw, 320px"
                />
              </div>
              <div className="p-4 flex items-start justify-between gap-3 flex-1">
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-bold text-sky-600 uppercase tracking-widest mb-0.5">News</p>
                  <p className="font-semibold text-gray-900 group-hover:text-sky-700 transition-colors leading-snug text-sm mb-1.5">
                    Albertans Can Apply for the $100 Energy Rebate Starting This Week — Everything That Has Changed
                  </p>
                  <p className="text-xs text-gray-500 leading-relaxed">What changed when applications opened, and what it means for your household.</p>
                </div>
                <ArrowRight className="w-4 h-4 text-gray-300 shrink-0 mt-0.5 group-hover:text-sky-400 group-hover:translate-x-0.5 transition-all" />
              </div>
            </Link>
            <Link
              href="/tools/stat-holiday-calculator"
              className="group bg-white rounded-2xl border border-gray-200 hover:border-sky-200 hover:shadow-lg transition-all p-4 flex items-center justify-between gap-4 sm:col-span-2"
            >
              <div className="min-w-0">
                <p className="text-[10px] font-bold text-sky-600 uppercase tracking-widest mb-0.5">Tool</p>
                <p className="font-semibold text-gray-900 group-hover:text-sky-700 transition-colors text-sm leading-snug">
                  Alberta Stat Holiday Pay Calculator 2026
                </p>
                <p className="text-xs text-gray-500 mt-0.5">Find out what you&apos;re owed for all 9 Alberta general holidays.</p>
              </div>
              <ArrowRight className="w-4 h-4 text-gray-300 shrink-0 group-hover:text-sky-400 group-hover:translate-x-0.5 transition-all" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
