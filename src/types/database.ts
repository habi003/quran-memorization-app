export type TextSize = 'small' | 'medium' | 'large'

export interface Kid {
  id: string
  owner_id: string
  name: string
  avatar: string | null
  preferred_reciter: string
  theme: string
  text_size: TextSize
  animations_enabled: boolean
  stars_balance: number
  created_at: string
}

// --- DB rows ---

export type AssignmentStatus = 'learning' | 'mastered' | 'superseded'
export type TargetPeriod = 'daily' | 'weekly'

export interface Assignment {
  id: string
  kid_id: string
  surah_number: number
  daily_ayah_target: number
  target_period: TargetPeriod
  status: AssignmentStatus
  assigned_at: string
}

export type MemorizationStatus = 'new' | 'learning' | 'memorized'
export type ReviewBucket = 'sabaq' | 'sabqi' | 'manzil'

export interface MemorizationProgress {
  kid_id: string
  surah_number: number
  ayah_number: number
  status: MemorizationStatus
  review_bucket: ReviewBucket
  last_reviewed_at: string | null
}

export type PracticeTrack = 'memorization' | 'reading'

export interface PracticeLog {
  id: string
  kid_id: string
  date: string
  track: PracticeTrack
  completed: boolean
  created_at: string
}

// --- alquran.cloud API response shapes (cached client-side, never stored in our DB) ---

export interface ApiSurahMeta {
  number: number
  name: string
  englishName: string
  englishNameTranslation: string
  numberOfAyahs: number
  revelationType: string
}

export interface ApiReciter {
  identifier: string // e.g. 'ar.alafasy' — stored as-is in kids.preferred_reciter
  language: string
  name: string
  englishName: string
  format: string
  type: string
}

export interface Ayah {
  numberInSurah: number
  number: number // global ayah number (1-6236), needed for the CDN audio fallback
  arabic: string
  transliteration: string
  audioUrl: string
}

export interface SurahContent {
  number: number
  name: string
  englishName: string
  numberOfAyahs: number
  ayahs: Ayah[]
}

// --- Gamification (milestone 4) ---

// Full DB domain per PROJECT_SPEC.md §4.4 — gamification.ts only ever writes
// 'ayah_complete' | 'surah_complete' | 'streak_bonus'; the rest are reserved
// for the reading track (milestone 6).
export type StarsReason =
  | 'ayah_complete'
  | 'surah_complete'
  | 'streak_bonus'
  | 'milestone_bonus'
  | 'item_complete'
  | 'perfect_day'
  | 'lesson_complete'

export interface StarsLog {
  id: string
  kid_id: string
  amount: number
  reason: StarsReason
  created_at: string
}

export interface Badge {
  id: string
  kid_id: string
  badge_key: string
  earned_at: string
  // Null until the kid taps to unlock it in Kid Mode — see badge_claims
  // migration. Legacy rows (pre-claim system) are backfilled to earned_at.
  claimed_at: string | null
}
