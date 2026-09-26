-- Run this once in Supabase: your project -> SQL Editor -> New query -> paste -> Run
-- Adds a timestamp for when a customer taps "I'm here" on the link we text
-- them, so you know they've physically arrived and can bring their order out.

alter table orders add column if not exists arrived_at timestamptz default null;
