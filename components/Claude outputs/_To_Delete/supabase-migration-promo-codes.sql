-- Run this once in Supabase: your project -> SQL Editor -> New query -> paste -> Run

create table if not exists promo_codes (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  discount_type text not null check (discount_type in ('percent', 'fixed')),
  discount_amount numeric not null check (discount_amount > 0),
  active boolean not null default true,
  expires_at timestamptz,
  max_uses integer,
  times_used integer not null default 0,
  created_at timestamptz not null default now()
);

alter table promo_codes enable row level security;
-- Same policy as every other table here: no public policies, the app only
-- ever talks to Supabase from the server using the service role key.

-- Records which promo (if any) was used on an order, and how much it
-- knocked off — so the sales dashboard and Excel export can show it.
alter table orders add column if not exists promo_code text;
alter table orders add column if not exists discount_amount numeric not null default 0;
