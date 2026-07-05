alter table products
add column if not exists deleted_at timestamptz;

alter table expenses
add column if not exists deleted_at timestamptz;

alter table partners
add column if not exists deleted_at timestamptz;

alter table admin_users
add column if not exists deleted_at timestamptz;

create index if not exists idx_products_deleted_at on products(deleted_at);
create index if not exists idx_expenses_deleted_at on expenses(deleted_at);
create index if not exists idx_partners_deleted_at on partners(deleted_at);
create index if not exists idx_admin_users_deleted_at on admin_users(deleted_at);
