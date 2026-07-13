import type { User } from '@supabase/supabase-js'

// No signup UI exists (single pre-existing account, created directly in
// Supabase Studio), so there's no display-name field to begin with — the
// parent sets one via the first-login prompt / Parent Settings, stored in
// Supabase Auth's user_metadata (no new DB table needed for this).
export function getDisplayName(user: User | null | undefined): string {
  const fullName = (user?.user_metadata as { full_name?: string } | undefined)?.full_name?.trim()
  if (fullName) return fullName

  const email = user?.email
  if (!email) return 'there'
  const local = email.split('@')[0]
  return local.charAt(0).toUpperCase() + local.slice(1)
}

export function hasCustomName(user: User | null | undefined): boolean {
  return Boolean((user?.user_metadata as { full_name?: string } | undefined)?.full_name?.trim())
}
