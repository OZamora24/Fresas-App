-- Extra pancake toppings (+$1 each) switch (off by default).
alter table shop_settings add column if not exists pancake_extras_enabled boolean not null default false;
