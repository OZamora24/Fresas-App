-- Mini pancakes switch (off by default). Run this before deploying.
alter table shop_settings add column if not exists pancakes_enabled boolean not null default false;
