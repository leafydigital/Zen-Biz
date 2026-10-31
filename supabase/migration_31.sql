-- migration_31.sql — safety net: fill business_roles.owner_id automatically
create or replace function public.set_role_owner()
returns trigger language plpgsql as $$
begin
  if new.owner_id is null then
    select owner_id into new.owner_id from public.businesses where id = new.business_id;
  end if;
  return new;
end;
$$;

drop trigger if exists business_roles_set_owner on public.business_roles;
create trigger business_roles_set_owner
  before insert on public.business_roles
  for each row execute function public.set_role_owner();
