import {
  Bird,
  Cat,
  Dog,
  Fish,
  Heart,
  Moon,
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
}

export type AvatarKey = keyof typeof AVATAR_ICONS
