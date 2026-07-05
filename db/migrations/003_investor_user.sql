alter table admin_users
add column if not exists role text not null default 'admin';

alter table admin_users
add column if not exists partner_id text;

alter table admin_users
add column if not exists credential_password text;

alter table admin_users
drop constraint if exists admin_users_role_check;

alter table admin_users
add constraint admin_users_role_check check (role in ('admin', 'investor'));

update admin_users
set role = 'admin'
where role is null;

delete from admin_users
where id = 'investor-default';

create unique index if not exists idx_admin_users_investor_partner_id
on admin_users (partner_id)
where role = 'investor' and partner_id is not null;
