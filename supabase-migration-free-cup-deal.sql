-- "Buy 3, get the 4th free" deal switch (off by default).
alter table shop_settings add column if not exists free_cup_deal boolean not null default false;
