import { milestoneSurahBadgeKey } from './gamification'

export type CosmeticType = 'avatar' | 'theme'

export interface CosmeticUnlock {
  type: CosmeticType
  key: string
}

// No retroactive locking: every avatar/theme that existed before this
// feature stays always-unlocked — gating only applies to the reward-only
// entries added alongside this map (see avatarIcons.ts/themes.ts comments).
export const STARTER_AVATAR_KEYS = [
  'cat', 'dog', 'rabbit', 'bird', 'fish', 'turtle', 'squirrel', 'star', 'heart', 'rocket', 'sun', 'moon',
]
export const STARTER_THEME_IDS = ['default-light', 'default-dark', 'ocean', 'jungle', 'space', 'sunset']

export const COSMETIC_UNLOCKS: Record<string, CosmeticUnlock> = {
  streak_7: { type: 'avatar', key: 'feather' },
  [milestoneSurahBadgeKey(3)]: { type: 'avatar', key: 'paw' },
  streak_30: { type: 'theme', key: 'royal' },
  [milestoneSurahBadgeKey(10)]: { type: 'avatar', key: 'gem' },
  streak_100: { type: 'avatar', key: 'crown' },
  [milestoneSurahBadgeKey(25)]: { type: 'theme', key: 'aurora' },
}

function getUnlockedKeys(claimedBadgeKeys: string[], type: CosmeticType, starter: string[]): Set<string> {
  const unlocked = new Set(starter)
  for (const badgeKey of claimedBadgeKeys) {
    const reward = COSMETIC_UNLOCKS[badgeKey]
    if (reward?.type === type) unlocked.add(reward.key)
  }
  return unlocked
}

// Returns the FULL unlocked set (starter ∪ earned rewards) — ready to pass
// straight into AvatarPicker/ThemePicker's unlockedKeys/unlockedIds prop.
export function getUnlockedAvatarKeys(claimedBadgeKeys: string[]): Set<string> {
  return getUnlockedKeys(claimedBadgeKeys, 'avatar', STARTER_AVATAR_KEYS)
}

export function getUnlockedThemeIds(claimedBadgeKeys: string[]): Set<string> {
  return getUnlockedKeys(claimedBadgeKeys, 'theme', STARTER_THEME_IDS)
}

export interface ClaimedBadge {
  badgeKey: string
  claimedAt: string
}

// Newest-claimed reward first, then the always-free starter set in its
// normal order (starter items have no "unlock moment" to sort by, and
// putting a kid's most recently earned reward first is the whole point —
// it's the thing they'll want to show off).
function getOrderedUnlockedKeys(type: CosmeticType, claimedBadges: ClaimedBadge[], starter: string[]): string[] {
  const rewardKeys = claimedBadges
    .slice()
    .sort((a, b) => b.claimedAt.localeCompare(a.claimedAt))
    .map((b) => COSMETIC_UNLOCKS[b.badgeKey])
    .filter((reward): reward is CosmeticUnlock => reward?.type === type)
    .map((reward) => reward.key)
  const rewardKeySet = new Set(rewardKeys)
  return [...rewardKeys, ...starter.filter((key) => !rewardKeySet.has(key))]
}

export function getOrderedAvatarKeys(claimedBadges: ClaimedBadge[]): string[] {
  return getOrderedUnlockedKeys('avatar', claimedBadges, STARTER_AVATAR_KEYS)
}

export function getOrderedThemeIds(claimedBadges: ClaimedBadge[]): string[] {
  return getOrderedUnlockedKeys('theme', claimedBadges, STARTER_THEME_IDS)
}
