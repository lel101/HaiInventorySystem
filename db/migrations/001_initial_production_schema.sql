create table if not exists products (
  id text primary key,
  sku text not null unique,
  barcode text not null default '',
  name text not null,
  description text not null default '',
  category text not null,
  brand text not null default '',
  supplier text not null default '',
  cost_price numeric(12, 2) not null default 0,
  selling_price numeric(12, 2) not null default 0,
  current_stock integer not null default 0,
  minimum_stock integer not null default 0,
  image text not null default '',
  status text not null default 'In Stock',
  created_at timestamptz not null default now(),
  constraint products_status_check check (status in ('In Stock', 'Low Stock', 'Out of Stock'))
);

create table if not exists stock_movements (
  id text primary key,
  product_id text not null references products(id) on delete cascade,
  product_name text not null,
  type text not null,
  quantity integer not null,
  previous_stock integer not null,
  new_stock integer not null,
  reason text not null default '',
  created_at timestamptz not null default now(),
  constraint stock_movements_type_check check (type in ('In', 'Out', 'Adjustment'))
);

create table if not exists transactions (
  id text primary key,
  invoice_no text not null unique,
  subtotal numeric(12, 2) not null default 0,
  discount_amount numeric(12, 2) not null default 0,
  total numeric(12, 2) not null default 0,
  cost_of_goods_sold numeric(12, 2) not null default 0,
  profit numeric(12, 2) not null default 0,
  payment_method text not null default 'Cash',
  customer_name text,
  created_at timestamptz not null default now(),
  constraint transactions_payment_method_check check (payment_method in ('Cash', 'GCash', 'Maya', 'Bank Transfer'))
);

create table if not exists transaction_items (
  id bigserial primary key,
  transaction_id text not null references transactions(id) on delete cascade,
  product_id text not null,
  name text not null,
  sku text not null,
  cost_price numeric(12, 2) not null default 0,
  selling_price numeric(12, 2) not null default 0,
  quantity integer not null default 1,
  discount numeric(12, 2) not null default 0,
  total_price numeric(12, 2) not null default 0
);

create table if not exists expenses (
  id text primary key,
  category text not null,
  amount numeric(12, 2) not null default 0,
  description text not null default '',
  date date not null,
  receipt_image text,
  created_at timestamptz not null default now(),
  constraint expenses_category_check check (category in ('Rent', 'Salary', 'Electricity', 'Internet', 'Marketing', 'Transportation', 'Miscellaneous'))
);

create table if not exists partners (
  id text primary key,
  name text not null,
  share_percentage numeric(5, 2) not null default 0
);

create table if not exists profit_distributions (
  id text primary key,
  month char(7) not null,
  revenue numeric(12, 2) not null default 0,
  cogs numeric(12, 2) not null default 0,
  expenses numeric(12, 2) not null default 0,
  net_profit numeric(12, 2) not null default 0,
  distributed_amount numeric(12, 2) not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists profit_distribution_items (
  id bigserial primary key,
  distribution_id text not null references profit_distributions(id) on delete cascade,
  partner_id text not null,
  partner_name text not null,
  percentage numeric(5, 2) not null default 0,
  amount numeric(12, 2) not null default 0
);

create table if not exists app_settings (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);

create index if not exists idx_stock_movements_product_id on stock_movements(product_id);
create index if not exists idx_stock_movements_created_at on stock_movements(created_at desc);
create index if not exists idx_transactions_created_at on transactions(created_at desc);
create index if not exists idx_transaction_items_transaction_id on transaction_items(transaction_id);
create index if not exists idx_expenses_date on expenses(date desc);
create index if not exists idx_profit_distributions_month on profit_distributions(month desc);
create index if not exists idx_profit_distribution_items_distribution_id on profit_distribution_items(distribution_id);
