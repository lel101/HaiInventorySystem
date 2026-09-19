alter table products
add column if not exists image_url text not null default '',
add column if not exists apparel_sizes text[] not null default '{}',
add column if not exists shoe_gender text,
add column if not exists shoe_sizes integer[] not null default '{}';

alter table products
drop constraint if exists products_shoe_gender_check;

alter table products
add constraint products_shoe_gender_check
check (shoe_gender is null or shoe_gender in ('Men', 'Women'));
