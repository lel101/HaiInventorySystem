alter table products
add column if not exists store_price numeric(12, 2) not null default 0,
add column if not exists size_stocks jsonb not null default '{}'::jsonb;

alter table transaction_items
add column if not exists selected_size text;
