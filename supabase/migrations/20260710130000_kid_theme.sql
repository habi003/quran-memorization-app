-- Per-kid theme choice (light/dark + color skin), selectable by either the
-- parent (Manage Kids) or the kid themselves (their Kid Home screen).
alter table kids add column theme text not null default 'default-light';
