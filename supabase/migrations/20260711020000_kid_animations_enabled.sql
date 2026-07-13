-- Per-kid animation preference, selectable by either the parent (Manage
-- Kids) or the kid themselves (Kid Home), same access pattern as avatar,
-- theme, and text size.
alter table kids add column animations_enabled boolean not null default true;
