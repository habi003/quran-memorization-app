import {
  Bird,
  Cat,
  Crown,
  Dog,
  Feather,
  Fish,
  Gem,
  Heart,
  Moon,
  PawPrint,
  Rabbit,
  Rocket,
  Squirrel,
  Star,
  Sun,
  Turtle,
  type LucideIcon,
} from 'lucide-react'

// Kid avatars are a small curated icon set, not free-form uploads — kids.avatar
// stores one of these keys. Mirrors the icon_key pattern used for Qaida
// letter_word_pair content (PROJECT_SPEC.md §4.3/§6).
export const AVATAR_ICONS: Record<string, LucideIcon> = {
  cat: Cat,
  dog: Dog,
  rabbit: Rabbit,
  bird: Bird,
  fish: Fish,
  turtle: Turtle,
  squirrel: Squirrel,
  star: Star,
  heart: Heart,
  rocket: Rocket,
  sun: Sun,
  moon: Moon,
  // Reward-only avatars, unlocked via milestone badges — see
  // cosmeticUnlocks.ts. Never shown as options until earned.
  crown: Crown,
  gem: Gem,
  feather: Feather,
  paw: PawPrint,
}

export type AvatarKey = keyof typeof AVATAR_ICONS
