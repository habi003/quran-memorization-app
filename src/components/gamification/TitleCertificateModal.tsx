import { Award } from 'lucide-react'

interface TitleCertificateModalProps {
  kidName: string
  title: string
  description: string
  earnedAt: string
  onDismiss: () => void
}

// In-app-only certificate (no email/export — no such infra exists in this
// app). Reused both right after a title-tier badge is claimed and later,
// whenever the kid taps their title chip to look at it again.
export function TitleCertificateModal({ kidName, title, description, earnedAt, onDismiss }: TitleCertificateModalProps) {
  const dateLabel = new Date(earnedAt).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4" onClick={onDismiss}>
      <div
        className="animate-badge-pop flex w-full max-w-sm flex-col items-center gap-3 rounded-2xl border-4 border-amber-300 bg-gradient-to-b from-amber-50 to-white p-8 text-center shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-amber-500 text-white">
          <Award className="h-8 w-8" />
        </div>
        <p className="text-xs font-semibold uppercase tracking-widest text-amber-600">Certificate of Achievement</p>
        <h2 className="text-2xl font-bold text-slate-800">{kidName}</h2>
        <p className="text-lg font-semibold text-amber-700">{title}</p>
        {description && <p className="text-sm text-slate-600">{description}</p>}
        <p className="text-sm text-slate-500">Awarded on {dateLabel}</p>
        <button
          type="button"
          onClick={onDismiss}
          className="mt-2 rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-600 px-5 py-2 text-sm font-semibold text-white transition hover:from-emerald-600 hover:to-emerald-700"
        >
          Close
        </button>
      </div>
    </div>
  )
}
