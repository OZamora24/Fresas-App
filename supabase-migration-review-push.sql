-- Automatic review-request push (off by default) and a once-only marker per order.
alter table shop_settings add column if not exists review_push_enabled boolean not null default false;
alter table orders add column if not exists review_push_sent boolean not null default false;
