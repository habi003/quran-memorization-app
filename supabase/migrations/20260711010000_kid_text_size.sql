-- Per-kid Arabic/transliteration text size, selectable by either the parent
-- (Manage Kids) or the kid themselves (their Kid Home page), same access
-- pattern as avatar and theme.
alter table kids add column text_size text not null default 'medium';
