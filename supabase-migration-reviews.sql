-- Customer reviews (1-5 stars + a comment). New reviews wait for approval in
-- /admin/reviews before they show on the public Reviews page.
create table if not exists reviews (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text,
  rating int not null check (rating between 1 and 5),
  comment text not null,
  lang text default 'en',
  approved boolean not null default false
);
alter table reviews enable row level security;
-- Each review is tied to one placed order (one review per order).
alter table reviews add column if not exists order_id uuid unique;
