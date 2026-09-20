create table if not exists consignment_withdrawals (
  id text primary key,
  month text not null,
  amount numeric(12,2) not null default 0,
  note text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists idx_consignment_withdrawals_month
  on consignment_withdrawals (month, created_at desc);
