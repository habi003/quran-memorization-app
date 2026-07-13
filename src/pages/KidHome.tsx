import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Settings2, RotateCcw, BookOpen } from 'lucide-react'
import { supabase } from '../lib/supabase'
import type { Assignment, ApiSurahMeta, Ayah, Badge, Kid, SurahContent, TargetPeriod } from '../types/database'
import { AVATAR_ICONS } from '../lib/avatarIcons'
import { getTheme, THEMES } from '../lib/themes'
import { fetchSurah, fetchSurahList } from '../lib/quran'
import {
  getActiveAssignment,
  computeTodaysSet,
  markAyahMemorized,
  logPracticeSessionComplete,
  markAssignmentMastered,
  getSurahsForReview,
  getMasteredSurahNumbers,
} from '../lib/memorization'
import { claimBadge, computeStreak, getBadges, processAyahComplete, processSurahComplete } from '../lib/gamification'
import { BADGE_CATALOG, TITLE_CATALOG, getCurrentTitle } from '../lib/badgeCatalog'
import {
  COSMETIC_UNLOCKS,
  getOrderedAvatarKeys,
  getOrderedThemeIds,
  getUnlockedAvatarKeys,
  getUnlockedThemeIds,
} from '../lib/cosmeticUnlocks'
import { CustomizePanel, type EarnedTitle } from '../components/CustomizePanel'
import { getTextSizeScale } from '../lib/textSize'
import { LoadingScreen } from '../components/LoadingScreen'
import { BackButton } from '../components/BackButton'
import { MemorizationFlow } from '../components/quran/MemorizationFlow'
import { ProgressDots } from '../components/quran/ProgressDots'
import { SurahReview } from '../components/quran/SurahReview'
import { StreakFlame } from '../components/gamification/StreakFlame'
import { StarsChip } from '../components/gamification/StarsChip'
import { BadgeUnlockCelebration } from '../components/gamification/BadgeUnlockCelebration'
import { TitleCertificateModal } from '../components/gamification/TitleCertificateModal'
import { playTap, playSuccess } from '../lib/sounds'

type PracticeView =
  | { kind: 'loading' }
  | { kind: 'no-assignment' }
  | { kind: 'surah-complete'; surahNumber: number; surahName: string; surahNameTranslation: string }
  | {
      kind: 'done-for-period'
      period: TargetPeriod
      surahNumber: number
      surahName: string
      surahNameTranslation: string
      doneInPeriod: number
      target: number
    }
  | {
      kind: 'session'
      surahName: string
      surahNameTranslation: string
      ayahs: Ayah[]
      index: number
      period: TargetPeriod
      doneInPeriod: number
      target: number
    }
  | { kind: 'error'; message: string }

export function KidHome() {
  const { kidId } = useParams()
  const navigate = useNavigate()
  const [kid, setKid] = useState<Kid | null>(null)
  const [assignment, setAssignment] = useState<Assignment | null>(null)
  const [view, setView] = useState<PracticeView>({ kind: 'loading' })
  const [saved, setSaved] = useState(false)
  const [customizing, setCustomizing] = useState(false)
  const [reviewSurahs, setReviewSurahs] = useState<ApiSurahMeta[]>([])
  const [reviewingSurah, setReviewingSurah] = useState<{ number: number; name: string } | null>(null)
  const [streak, setStreak] = useState(0)
  const [badges, setBadges] = useState<Badge[]>([])
  const [masteredCount, setMasteredCount] = useState(0)
  const [celebratingBadges, setCelebratingBadges] = useState<string[]>([])
  const [showCertificate, setShowCertificate] = useState<EarnedTitle | null>(null)
  // Just-unlocked, never-picked cosmetics — cleared the moment the kid taps
  // one in the picker. Session-only (not persisted): a fresh page load has
  // no way to know "already discovered" vs "unlocked a while ago" without a
  // new DB column, and re-showing the glow once per session is harmless.
  const [newAvatarKeys, setNewAvatarKeys] = useState<Set<string>>(new Set())
  const [newThemeIds, setNewThemeIds] = useState<Set<string>>(new Set())

  const claimedBadgeKeys = useMemo(() => badges.filter((b) => b.claimed_at).map((b) => b.badge_key), [badges])
  const claimedBadgesWithTimestamps = useMemo(
    () => badges.filter((b): b is Badge & { claimed_at: string } => Boolean(b.claimed_at)).map((b) => ({ badgeKey: b.badge_key, claimedAt: b.claimed_at })),
    [badges],
  )
  const unlockedAvatarKeys = useMemo(() => getUnlockedAvatarKeys(claimedBadgeKeys), [claimedBadgeKeys])
  const unlockedThemeIds = useMemo(() => getUnlockedThemeIds(claimedBadgeKeys), [claimedBadgeKeys])
  // Newest-unlocked reward first, then the rest of the catalog (still-locked
  // ones) in their normal order — passed as the pickers' display order.
  const orderedAvatarKeys = useMemo(() => {
    const unlocked = getOrderedAvatarKeys(claimedBadgesWithTimestamps)
    const unlockedSet = new Set(unlocked)
    return [...unlocked, ...Object.keys(AVATAR_ICONS).filter((k) => !unlockedSet.has(k))]
  }, [claimedBadgesWithTimestamps])
  const orderedThemeIds = useMemo(() => {
    const unlocked = getOrderedThemeIds(claimedBadgesWithTimestamps)
    const unlockedSet = new Set(unlocked)
    return [...unlocked, ...THEMES.map((t) => t.id).filter((id) => !unlockedSet.has(id))]
  }, [claimedBadgesWithTimestamps])
  const hasPendingClaims = useMemo(() => badges.some((b) => !b.claimed_at), [badges])
  // Every claimed title, most recent first — powers the certificates list.
  const earnedTitles: EarnedTitle[] = useMemo(() => {
    return badges
      .filter((b): b is Badge & { claimed_at: string } => Boolean(b.claimed_at) && Boolean(TITLE_CATALOG[b.badge_key]))
      .map((b) => ({
        badgeKey: b.badge_key,
        title: TITLE_CATALOG[b.badge_key],
        description: BADGE_CATALOG[b.badge_key]?.description ?? '',
        earnedAt: b.claimed_at,
      }))
      .sort((a, b) => b.earnedAt.localeCompare(a.earnedAt))
  }, [badges])
  // Highest-tier claimed title, if any (shared getCurrentTitle so this means
  // the same thing here as it does on the Parent Dashboard's KidCard).
  const currentTitle: EarnedTitle | null = useMemo(() => {
    const info = getCurrentTitle(claimedBadgeKeys)
    if (!info) return null
    const badge = badges.find((b) => b.badge_key === info.badgeKey)
    return { ...info, earnedAt: badge?.claimed_at ?? new Date().toISOString() }
  }, [claimedBadgeKeys, badges])
  // Cosmetic reward tied to the badge currently being celebrated, if any —
  // shown as an extra line in BadgeUnlockCelebration.
  const celebratingCosmetic = useMemo(() => {
    const badgeKey = celebratingBadges[0]
    const reward = badgeKey ? COSMETIC_UNLOCKS[badgeKey] : undefined
    if (!reward) return undefined
    const label =
      reward.type === 'theme'
        ? (THEMES.find((t) => t.id === reward.key)?.label ?? reward.key)
        : reward.key.charAt(0).toUpperCase() + reward.key.slice(1)
    return { type: reward.type, label }
  }, [celebratingBadges])

  const loadPractice = useCallback(async (currentKid: Kid) => {
    setView({ kind: 'loading' })
    try {
      const active = await getActiveAssignment(currentKid.id)
      setAssignment(active)
      if (!active) {
        setView({ kind: 'no-assignment' })
        return
      }

      const surah: SurahContent = await fetchSurah(active.surah_number, currentKid.preferred_reciter)
      const today = await computeTodaysSet(
        currentKid.id,
        active.surah_number,
        surah,
        active.daily_ayah_target,
        active.target_period,
      )

      if (today.kind === 'surah-complete') {
        setView({
          kind: 'surah-complete',
          surahNumber: active.surah_number,
          surahName: surah.englishName,
          surahNameTranslation: surah.englishNameTranslation,
        })
      } else if (today.kind === 'done-for-period') {
        setView({
          kind: 'done-for-period',
          period: today.period,
          surahNumber: active.surah_number,
          surahName: surah.englishName,
          surahNameTranslation: surah.englishNameTranslation,
          doneInPeriod: today.doneInPeriod,
          target: today.target,
        })
      } else {
        setView({
          kind: 'session',
          surahName: surah.englishName,
          surahNameTranslation: surah.englishNameTranslation,
          ayahs: today.ayahs,
          index: 0,
          period: today.period,
          doneInPeriod: today.doneInPeriod,
          target: today.target,
        })
      }
    } catch (err) {
      setView({ kind: 'error', message: (err as Error).message })
    }
  }, [])

  const loadReviewSurahs = useCallback(async (currentKidId: string) => {
    try {
      const [numbers, allSurahs] = await Promise.all([getSurahsForReview(currentKidId, 3), fetchSurahList()])
      const byNumber = new Map(allSurahs.map((s) => [s.number, s]))
      setReviewSurahs(numbers.map((n) => byNumber.get(n)).filter((s): s is ApiSurahMeta => Boolean(s)))
    } catch {
      // Review surahs are bonus content — a failure here shouldn't block the
      // main practice screen, just silently show none.
      setReviewSurahs([])
    }
  }, [])

  const loadGamification = useCallback(async (currentKidId: string) => {
    try {
      const [currentStreak, currentBadges, masteredNumbers] = await Promise.all([
        computeStreak(currentKidId),
        getBadges(currentKidId),
        getMasteredSurahNumbers(currentKidId),
      ])
      setStreak(currentStreak)
      setBadges(currentBadges)
      setMasteredCount(masteredNumbers.length)
    } catch {
      // Stars/streak/badges are bonus content, same as review surahs — a
      // failure here shouldn't block the main practice screen.
    }
  }, [])

  useEffect(() => {
    if (!kidId) return
    let cancelled = false

    supabase
      .from('kids')
      .select('*')
      .eq('id', kidId)
      .single()
      .then(({ data, error: fetchError }) => {
        if (cancelled) return
        if (fetchError) {
          setView({ kind: 'error', message: fetchError.message })
          return
        }
        const k = data as Kid
        setKid(k)
        loadPractice(k)
        loadReviewSurahs(k.id)
        loadGamification(k.id)
      })

    return () => {
      cancelled = true
    }
  }, [kidId, loadPractice, loadReviewSurahs, loadGamification])

  async function handleGotIt() {
    if (view.kind !== 'session' || !kid || !assignment) return
    const ayah = view.ayahs[view.index]

    try {
      await markAyahMemorized(kid.id, assignment.surah_number, ayah.numberInSurah)
    } catch (err) {
      setView({ kind: 'error', message: (err as Error).message })
      return
    }

    // practice_log is written on every completed ayah (not just the last of
    // the chunk) so a partial weekly session still counts as "practiced
    // today" for streaks.
    try {
      await logPracticeSessionComplete(kid.id)
    } catch (err) {
      setView({ kind: 'error', message: (err as Error).message })
      return
    }

    // Gamification is bonus feedback on top of an already-successful write —
    // a failure here (network hiccup, etc.) must never block the kid's
    // practice flow, so errors are swallowed rather than surfaced as `view:
    // 'error'` (same treatment as loadReviewSurahs). processAyahComplete only
    // *records* any newly-crossed milestone as pending — it never
    // auto-claims — so badges are refetched to pick up the glow/notification
    // dot, not to trigger a celebration.
    try {
      const result = await processAyahComplete(kid.id)
      setKid((k) => (k ? { ...k, stars_balance: k.stars_balance + result.starsAwarded } : k))
      setStreak(result.streak)
      setBadges(await getBadges(kid.id))
    } catch (err) {
      console.error('Gamification update failed:', err)
    }

    if (view.index + 1 < view.ayahs.length) {
      setView({ ...view, index: view.index + 1, doneInPeriod: view.doneInPeriod + 1 })
      return
    }

    // Last ayah of this period's chunk — re-derive the next state
    // (surah-complete vs done-for-period) fresh rather than tracking totals
    // incrementally client-side.
    try {
      const surah = await fetchSurah(assignment.surah_number, kid.preferred_reciter)
      const next = await computeTodaysSet(
        kid.id,
        assignment.surah_number,
        surah,
        assignment.daily_ayah_target,
        assignment.target_period,
      )
      if (next.kind === 'surah-complete') {
        await markAssignmentMastered(assignment.id)
        try {
          const result = await processSurahComplete(kid.id, assignment.surah_number)
          setKid((k) => (k ? { ...k, stars_balance: k.stars_balance + result.starsAwarded } : k))
          setMasteredCount(result.masteredCount)
          setBadges(await getBadges(kid.id))
        } catch (err) {
          console.error('Gamification update failed:', err)
        }
        setView({
          kind: 'surah-complete',
          surahNumber: assignment.surah_number,
          surahName: surah.englishName,
          surahNameTranslation: surah.englishNameTranslation,
        })
      } else {
        setView({
          kind: 'done-for-period',
          period: assignment.target_period,
          surahNumber: assignment.surah_number,
          surahName: surah.englishName,
          surahNameTranslation: surah.englishNameTranslation,
          doneInPeriod: view.doneInPeriod + 1,
          target: view.target,
        })
      }
    } catch (err) {
      setView({ kind: 'error', message: (err as Error).message })
    }
  }

  // Tapping a pending badge in the Badge Shelf is the "unlock" moment itself
  // — claimBadge does a conditional UPDATE guarded by claimed_at IS NULL, so
  // a lost race (double-tap, second device) just no-ops here.
  async function handleClaimBadge(badgeKey: string) {
    if (!kid) return
    try {
      const result = await claimBadge(kid.id, badgeKey)
      if (!result.claimed) return
      const claimedAt = new Date().toISOString()
      setBadges((prev) => prev.map((b) => (b.badge_key === badgeKey ? { ...b, claimed_at: claimedAt } : b)))
      if (result.starsAwarded > 0) {
        setKid((k) => (k ? { ...k, stars_balance: k.stars_balance + result.starsAwarded } : k))
      }
      const reward = COSMETIC_UNLOCKS[badgeKey]
      if (reward?.type === 'avatar') setNewAvatarKeys((prev) => new Set(prev).add(reward.key))
      else if (reward?.type === 'theme') setNewThemeIds((prev) => new Set(prev).add(reward.key))
      setCelebratingBadges((prev) => [...prev, badgeKey])
    } catch (err) {
      console.error('Claim failed:', err)
    }
  }

  // Dismissing a badge celebration chains into the title certificate when
  // the badge just claimed is a title-tier one.
  function handleDismissCelebration() {
    const badgeKey = celebratingBadges[0]
    setCelebratingBadges((prev) => prev.slice(1))
    const title = badgeKey ? TITLE_CATALOG[badgeKey] : undefined
    if (badgeKey && title) {
      const badge = badges.find((b) => b.badge_key === badgeKey)
      setShowCertificate({
        badgeKey,
        title,
        description: BADGE_CATALOG[badgeKey]?.description ?? '',
        earnedAt: badge?.claimed_at ?? new Date().toISOString(),
      })
    }
  }

  function flashSaved() {
    playSuccess()
    setSaved(true)
    setTimeout(() => setSaved(false), 1500)
  }

  async function changeAvatar(key: string) {
    if (!kidId) return
    const { error: updateError } = await supabase.from('kids').update({ avatar: key }).eq('id', kidId)
    if (updateError) return
    setKid((k) => (k ? { ...k, avatar: key } : k))
    setNewAvatarKeys((prev) => {
      if (!prev.has(key)) return prev
      const next = new Set(prev)
      next.delete(key)
      return next
    })
    flashSaved()
  }

  async function changeTheme(id: string) {
    if (!kidId) return
    const { error: updateError } = await supabase.from('kids').update({ theme: id }).eq('id', kidId)
    if (updateError) return
    setKid((k) => (k ? { ...k, theme: id } : k))
    setNewThemeIds((prev) => {
      if (!prev.has(id)) return prev
      const next = new Set(prev)
      next.delete(id)
      return next
    })
    flashSaved()
  }

  async function changeTextSize(size: Kid['text_size']) {
    if (!kidId) return
    const { error: updateError } = await supabase.from('kids').update({ text_size: size }).eq('id', kidId)
    if (updateError) return
    setKid((k) => (k ? { ...k, text_size: size } : k))
    flashSaved()
  }

  async function changeAnimationsEnabled(enabled: boolean) {
    if (!kidId) return
    const { error: updateError } = await supabase.from('kids').update({ animations_enabled: enabled }).eq('id', kidId)
    if (updateError) return
    setKid((k) => (k ? { ...k, animations_enabled: enabled } : k))
    flashSaved()
  }

  if (!kid) return <LoadingScreen />

  const Icon = kid.avatar ? AVATAR_ICONS[kid.avatar] : undefined
  const theme = getTheme(kid.theme)
  const textSize = getTextSizeScale(kid.text_size)

  return (
    <div
      className={`animate-fade-in-up relative flex min-h-screen flex-col items-center gap-6 px-4 py-10 text-center transition-colors duration-500 ${theme.pageBg}`}
    >
      <div className="absolute left-4 top-4">
        <BackButton onClick={() => navigate(-1)} className={theme.bodyText} />
      </div>
      <button
        type="button"
        onClick={() => {
          playTap()
          setCustomizing((c) => !c)
        }}
        aria-label="Customize"
        className={`absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full transition hover:bg-black/5 active:scale-90 ${theme.bodyText}`}
      >
        <Settings2 className="h-5 w-5" />
        {hasPendingClaims && (
          <span className="absolute right-1 top-1 h-2.5 w-2.5 animate-pop rounded-full bg-red-500 ring-2 ring-white" />
        )}
      </button>

      <div className="mt-10 flex flex-col items-center gap-2">
        <div
          className={`flex h-20 w-20 animate-pop items-center justify-center rounded-full text-white ${theme.accentBg}`}
        >
          {Icon ? <Icon className="h-10 w-10" /> : kid.name[0]?.toUpperCase()}
        </div>
        <h1 className={`text-xl font-bold ${theme.heading}`}>{kid.name}</h1>
        <div className="flex flex-wrap items-center justify-center gap-2">
          <StreakFlame streak={streak} theme={theme} />
          <StarsChip stars={kid.stars_balance} theme={theme} />
          {currentTitle && (
            <button
              type="button"
              onClick={() => {
                playTap()
                setShowCertificate(currentTitle)
              }}
              className={`rounded-full px-3 py-1.5 text-sm font-semibold shadow-sm transition active:scale-95 ${theme.cardBg} ${theme.accentText}`}
            >
              {currentTitle.title}
            </button>
          )}
        </div>
      </div>

      {view.kind === 'loading' && <LoadingScreen />}

      {view.kind === 'error' && <p className="text-sm text-red-600">{view.message}</p>}

      {view.kind === 'no-assignment' && (
        <p className={theme.bodyText}>No surah assigned yet — ask a parent to pick one in Parent Mode!</p>
      )}

      {view.kind === 'surah-complete' && (
        <div className="flex flex-col items-center gap-2">
          <p className="text-3xl">🎉</p>
          <p className={`text-lg font-semibold ${theme.heading}`}>Surah {view.surahName} complete!</p>
          <p className={`text-sm ${theme.bodyText}`}>({view.surahNameTranslation})</p>
          <p className={theme.bodyText}>Ask a parent for a new surah.</p>
          <button
            type="button"
            onClick={() => {
              playTap()
              setReviewingSurah({ number: view.surahNumber, name: view.surahName })
            }}
            className="mt-2 flex items-center gap-1.5 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 px-5 py-2.5 font-semibold text-white transition hover:from-emerald-600 hover:to-emerald-700 active:scale-95"
          >
            <RotateCcw className="h-4 w-4" /> Revise {view.surahName} while you wait
          </button>
        </div>
      )}

      {view.kind === 'done-for-period' && (
        <div className="flex flex-col items-center gap-3">
          <ProgressDots total={view.target} filled={view.doneInPeriod} />
          <p className={`text-lg font-semibold ${theme.heading}`}>
            {view.period === 'weekly' ? "This week's ayahs are done! 🌟" : 'Done for today! 🌟'}
          </p>
          <p className={`-mt-2 text-xs ${theme.bodyText}`}>
            {view.surahName} ({view.surahNameTranslation})
          </p>
          <p className={theme.bodyText}>
            {view.period === 'weekly' ? 'New ayahs next week — or revise what you know now:' : 'New ayahs tomorrow — or revise what you know now:'}
          </p>
          <button
            type="button"
            onClick={() => {
              playTap()
              setReviewingSurah({ number: view.surahNumber, name: view.surahName })
            }}
            className="flex items-center gap-1.5 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 px-5 py-2.5 font-semibold text-white transition hover:from-emerald-600 hover:to-emerald-700 active:scale-95"
          >
            <RotateCcw className="h-4 w-4" /> Revise {view.surahName} from the start
          </button>
        </div>
      )}

      {view.kind === 'session' && (
        <div className="flex flex-col items-center gap-6">
          <div className="flex flex-col items-center gap-1">
            <p className={`text-sm font-medium ${theme.bodyText}`}>
              {view.surahName} ({view.surahNameTranslation}) {view.period === 'weekly' && '· this week'}
            </p>
            <ProgressDots total={view.target} filled={view.doneInPeriod} />
          </div>
          <MemorizationFlow
            key={view.ayahs[view.index].number}
            ayah={view.ayahs[view.index]}
            onGotIt={handleGotIt}
            textSize={textSize}
          />
        </div>
      )}

      {reviewSurahs.length > 0 && view.kind !== 'session' && view.kind !== 'loading' && (
        <div className="flex w-full max-w-xs flex-col gap-2">
          <h2 className={`text-sm font-semibold ${theme.bodyText}`}>Time to revise!</h2>
          {reviewSurahs.map((s) => (
            <button
              key={s.number}
              type="button"
              onClick={() => {
                playTap()
                setReviewingSurah({ number: s.number, name: s.englishName })
              }}
              className={`flex items-center gap-2 rounded-xl p-3 text-left shadow-sm transition active:scale-95 ${theme.cardBg}`}
            >
              <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white ${theme.accentBg}`}>
                <BookOpen className="h-4 w-4" />
              </span>
              <span className={`text-sm font-medium ${theme.heading}`}>{s.englishName}</span>
            </button>
          ))}
        </div>
      )}

      {reviewingSurah && kid && (
        <SurahReview
          kidId={kid.id}
          reciterEdition={kid.preferred_reciter}
          surahNumber={reviewingSurah.number}
          surahName={reviewingSurah.name}
          textSize={textSize}
          animationsEnabled={kid.animations_enabled}
          onClose={() => setReviewingSurah(null)}
        />
      )}

      {celebratingBadges.length > 0 && (
        <BadgeUnlockCelebration
          badgeKey={celebratingBadges[0]}
          onDismiss={handleDismissCelebration}
          unlockedCosmetic={celebratingCosmetic}
        />
      )}

      {showCertificate && (
        <TitleCertificateModal
          kidName={kid.name}
          title={showCertificate.title}
          description={showCertificate.description}
          earnedAt={showCertificate.earnedAt}
          onDismiss={() => setShowCertificate(null)}
        />
      )}

      {customizing && (
        <CustomizePanel
          theme={theme}
          saved={saved}
          badges={badges}
          streak={streak}
          masteredCount={masteredCount}
          earnedTitles={earnedTitles}
          onClaimBadge={handleClaimBadge}
          onOpenCertificate={setShowCertificate}
          avatar={kid.avatar}
          onChangeAvatar={changeAvatar}
          unlockedAvatarKeys={unlockedAvatarKeys}
          newAvatarKeys={newAvatarKeys}
          orderedAvatarKeys={orderedAvatarKeys}
          themeId={kid.theme}
          onChangeTheme={changeTheme}
          unlockedThemeIds={unlockedThemeIds}
          newThemeIds={newThemeIds}
          orderedThemeIds={orderedThemeIds}
          textSize={kid.text_size}
          onChangeTextSize={changeTextSize}
          animationsEnabled={kid.animations_enabled}
          onChangeAnimationsEnabled={changeAnimationsEnabled}
        />
      )}
    </div>
  )
}
