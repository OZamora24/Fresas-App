-- Run this once in Supabase: your project -> SQL Editor -> New query -> paste -> Run
-- Lets a customer tell you they are running late (5 to 30 minutes), so you can
-- hold their order a little longer. late_minutes = 0 means "not late".

alter table orders add column if not exists late_minutes int not null default 0;
alter table orders add column if not exists late_reported_at timestamptz default null;
