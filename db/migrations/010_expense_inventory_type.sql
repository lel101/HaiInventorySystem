alter table if exists expenses
  add column if not exists inventory_type text not null default 'owned';

alter table if exists expenses
  drop constraint if exists expenses_inventory_type_check;

alter table if exists expenses
  add constraint expenses_inventory_type_check
  check (inventory_type in ('owned', 'consignment'));
