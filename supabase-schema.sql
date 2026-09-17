-- Run this once in Supabase: your project -> SQL Editor -> New query -> paste -> Run

create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  base text not null,
  toppings text[] not null default '{}',
  syrups text[] not null default '{}',
  qty int not null default 1,
  pickup_time text not null,
  customer_name text not null,
  notes text default '',
  total numeric not null,
  status text not null default 'new'
);

-- Row Level Security stays ON with no public policies. The app never talks
-- to Supabase directly from the browser — only from the server (API routes)
-- using the service role key, which bypasses RLS. This keeps your orders
-- table unreachable to anyone poking at Supabase directly.
alter table orders enable row level security;
