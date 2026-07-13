-- Badges now go through a tap-to-claim moment in Kid Mode instead of being
-- auto-awarded silently. claimed_at is null until the kid taps to unlock it.
alter table badges add column claimed_at timestamptz;

-- Every pre-existing row (any kid) was auto-granted under the old
-- always-instant system — backfilling claimed_at = earned_at makes every
-- legacy badge "already claimed" with no per-kid/per-key special-casing.
update badges set claimed_at = earned_at where claimed_at is null;
