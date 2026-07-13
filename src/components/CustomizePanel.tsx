import { useState } from 'react'
import { Trophy } from 'lucide-react'
import type { Badge, TextSize } from '../types/database'
import type { Theme } from '../lib/themes'
import { BadgeShelf } from './gamification/BadgeShelf'
import { AvatarPicker } from './AvatarPicker'
import { ThemePicker } from './ThemePicker'
import { FontSizePicker } from './FontSizePicker'
import { AnimationToggle } from './AnimationToggle'
import { playTap } from '../lib/sounds'

export interface EarnedTitle {
  badgeKey: string
  title: string
  description: string
  earnedAt: string
}

interface CustomizePanelProps {
  theme: Theme
  saved: boolean

  badges: Badge[]
  streak: number
  masteredCount: number
  earnedTitles: EarnedTitle[]
  onClaimBadge: (badgeKey: string) => void
  onOpenCertificate: (cert: EarnedTitle) => void

  avatar: string | null
  onChangeAvatar: (key: string) => void
  unlockedAvatarKeys: Set<string>
  newAvatarKeys: Set<string>
  orderedAvatarKeys: string[]

  themeId: string
  onChangeTheme: (id: string) => void
  unlockedThemeIds: Set<string>
  newThemeIds: Set<string>
  orderedThemeIds: string[]

  textSize: TextSize
  onChangeTextSize: (size: TextSize) => void
  animationsEnabled: boolean
  onChangeAnimationsEnabled: (enabled: boolean) => void
}

const ALL_TABS = ['Badges', 'Certificates', 'Look', 'Settings'] as const
type Tab = (typeof ALL_TABS)[number]

// Tabbed panel instead of one long stacked column, so there's no scrolling
// to reach any section. Avatar + Theme share one "Look" tab (kept the tab
// bar down to 4 so it stays on one line), and a tab that would have nothing
// in it (Certificates, before any title is earned) isn't shown at all.
export function CustomizePanel({
  theme,
  saved,
  badges,
  streak,
  masteredCount,
  earnedTitles,
  onClaimBadge,
  onOpenCertificate,
  avatar,
  onChangeAvatar,
  unlockedAvatarKeys,
  newAvatarKeys,
  orderedAvatarKeys,
  themeId,
  onChangeTheme,
  unlockedThemeIds,
  newThemeIds,
  orderedThemeIds,
  textSize,
  onChangeTextSize,
  animationsEnabled,
  onChangeAnimationsEnabled,
}: CustomizePanelProps) {
  const [tab, setTab] = useState<Tab>('Badges')

  const visibleTabs = ALL_TABS.filter((t) => t !== 'Certificates' || earnedTitles.length > 0)
  const activeTab = visibleTabs.includes(tab) ? tab : 'Badges'

  const dotByTab: Partial<Record<Tab, boolean>> = {
    Badges: badges.some((b) => !b.claimed_at),
    Look: newAvatarKeys.size > 0 || newThemeIds.size > 0,
  }

  return (
    <div className={`flex w-full max-w-xs flex-col gap-3 rounded-2xl p-5 shadow-sm ${theme.cardBg}`}>
      <div className="flex gap-1 rounded-full bg-black/5 p-1">
        {visibleTabs.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => {
              playTap()
              setTab(t)
            }}
            aria-pressed={activeTab === t}
            className={`relative flex-1 rounded-full px-1 py-1.5 text-[11px] font-semibold whitespace-nowrap transition ${
              activeTab === t ? `text-white ${theme.accentBg}` : theme.bodyText
            }`}
          >
            {t}
            {dotByTab[t] && (
              <span className="absolute -right-0.5 -top-0.5 h-2 w-2 animate-pop rounded-full bg-red-500 ring-1 ring-white" />
            )}
          </button>
        ))}
      </div>

      {activeTab === 'Badges' && (
        <BadgeShelf badges={badges} theme={theme} streak={streak} masteredCount={masteredCount} onClaim={onClaimBadge} />
      )}

      {activeTab === 'Certificates' && (
        <div className="flex flex-col gap-1.5">
          {earnedTitles.map((t) => (
            <button
              key={t.badgeKey}
              type="button"
              onClick={() => {
                playTap()
                onOpenCertificate(t)
              }}
              className="flex items-center gap-2 rounded-xl bg-slate-50 p-2.5 text-left transition active:scale-[0.98]"
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-amber-500 text-white">
                <Trophy className="h-4 w-4" />
              </span>
              <span className={`text-sm font-medium ${theme.heading}`}>{t.title}</span>
            </button>
          ))}
        </div>
      )}

      {activeTab === 'Look' && (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col items-center gap-2">
            <h3 className={`text-xs font-semibold ${theme.bodyText}`}>Avatar</h3>
            <AvatarPicker
              value={avatar}
              unlockedKeys={unlockedAvatarKeys}
              newKeys={newAvatarKeys}
              visibleKeys={orderedAvatarKeys}
              onChange={(key) => {
                playTap()
                onChangeAvatar(key)
              }}
            />
          </div>
          <div className="flex flex-col items-center gap-2">
            <h3 className={`text-xs font-semibold ${theme.bodyText}`}>Theme</h3>
            <ThemePicker
              value={themeId}
              unlockedIds={unlockedThemeIds}
              newIds={newThemeIds}
              visibleIds={orderedThemeIds}
              onChange={(id) => {
                playTap()
                onChangeTheme(id)
              }}
            />
          </div>
        </div>
      )}

      {activeTab === 'Settings' && (
        <div className="flex flex-col items-center gap-5">
          <div className="flex flex-col items-center gap-2">
            <h3 className={`text-sm font-semibold ${theme.bodyText}`}>Text size</h3>
            <FontSizePicker
              value={textSize}
              onChange={(size) => {
                playTap()
                onChangeTextSize(size)
              }}
            />
          </div>
          <div className="flex flex-col items-center gap-2">
            <h3 className={`text-sm font-semibold ${theme.bodyText}`}>Animations</h3>
            <AnimationToggle
              value={animationsEnabled}
              onChange={(enabled) => {
                playTap()
                onChangeAnimationsEnabled(enabled)
              }}
            />
          </div>
        </div>
      )}

      {saved && <p className={`animate-pop text-center text-sm font-semibold ${theme.accentText}`}>Saved!</p>}
    </div>
  )
}
