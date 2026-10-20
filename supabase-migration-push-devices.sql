-- Phones that allowed customer notifications (one row per phone), so the admin can see how many.
create table if not exists push_devices (
  subscription_id text primary key,
  created_at timestamptz not null default now(),
  last_seen timestamptz not null default now(),
  last_order_id uuid
);
alter table push_devices enable row level security;
