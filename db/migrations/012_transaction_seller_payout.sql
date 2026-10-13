alter table transactions
add column if not exists seller_payout_amount numeric(12, 2) not null default 0;

update transactions
set seller_payout_amount = total
where seller_payout_amount = 0;