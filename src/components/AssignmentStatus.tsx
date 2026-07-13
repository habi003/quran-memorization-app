import { BookPlus, RefreshCw, Check, ListChecks } from 'lucide-react'
import type { ApiSurahMeta, Assignment, Kid } from '../types/database'
import { AVATAR_ICONS } from '../lib/avatarIcons'
import { getTheme } from '../lib/themes'

interface AssignmentStatusProps {
  kid: Kid
  assignment: Assignment | null
  surahMeta: ApiSurahMeta | null
  suggestedSurahMeta?: ApiSurahMeta | null
  memorizedCount: number
  onAssign: () => void
  onMarkCompleted: () => void
}

export function AssignmentStatus({
  kid,
  assignment,
  surahMeta,
  suggestedSurahMeta,
  memorizedCount,
  onAssign,
  onMarkCompleted,
}: AssignmentStatusProps) {
  const Icon = kid.avatar ? AVATAR_ICONS[kid.avatar] : undefined
  const theme = getTheme(kid.theme)
  const isMastered = assignment?.status === 'mastered'

  return (
    <li className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 rounded-xl bg-slate-50 px-3 py-2">
      <div className="flex items-center gap-3">
        <div className={`flex h-10 w-10 items-center justify-center rounded-full text-white ${theme.accentBg}`}>
          {Icon ? <Icon className="h-5 w-5" /> : kid.name[0]?.toUpperCase()}
        </div>
        <div>
          <p className="font-medium text-slate-800">{kid.name}</p>
          {!assignment && <p className="text-xs text-slate-400">No surah assigned yet</p>}
          {assignment?.status === 'learning' && surahMeta && (
            <p className="text-xs text-slate-500">
              {surahMeta.englishName} — {memorizedCount}/{surahMeta.numberOfAyahs} memorized
            </p>
          )}
          {isMastered && surahMeta && (
            <p className="text-xs text-emerald-600">
              🎉 {surahMeta.englishName} complete!
              {suggestedSurahMeta && ` Suggested next: ${suggestedSurahMeta.englishName}`}
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={onMarkCompleted}
          aria-label="Mark surahs already completed"
          title="Mark surahs already completed"
          className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-200"
        >
          <ListChecks className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={onAssign}
          className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium text-emerald-700 transition hover:bg-emerald-50"
        >
          {!assignment ? (
            <>
              <BookPlus className="h-4 w-4" /> Assign
            </>
          ) : isMastered ? (
            <>
              <Check className="h-4 w-4" /> {suggestedSurahMeta ? 'Approve next' : 'Assign new surah'}
            </>
          ) : (
            <>
              <RefreshCw className="h-4 w-4" /> Change
            </>
          )}
        </button>
      </div>
    </li>
  )
}
