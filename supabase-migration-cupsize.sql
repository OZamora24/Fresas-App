-- Run this once in Supabase: your project -> SQL Editor -> New query -> paste -> Run
-- Adds the cup-size column needed for the 12oz/24oz selection.

alter table orders add column if not exists cup_size text default '12 oz';
