alter table products
add column if not exists inventory_type text not null default 'owned';

alter table products
drop constraint if exists products_inventory_type_check;

alter table products
add constraint products_inventory_type_check
check (inventory_type in ('owned', 'consignment'));

alter table transaction_items
add column if not exists inventory_type text not null default 'owned';
