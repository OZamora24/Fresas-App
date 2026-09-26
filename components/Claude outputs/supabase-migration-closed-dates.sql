-- Adds the "closed_dates" column that stores days the shop is scheduled
-- to be closed in advance (a trip, a holiday, etc.), set from the admin
-- panel's "Closed days" list under Store hours.
--
-- Run this once in the Supabase SQL editor for this project.

alter table shop_settings
  add column if not exists closed_dates jsonb not null default '[]'::jsonb;
