-- This dataset is intentionally public. Do not put private data in it.
create table public.superhuman_public_records (
  record_key text primary key check (length(record_key) between 1 and 512),
  value jsonb,
  deleted boolean not null,
  client_time bigint not null check (client_time >= 0),
  writer uuid not null,
  revision bigint not null check (revision > 0),
  updated_at timestamptz not null default now(),
  check ((deleted and value is null) or (not deleted and value is not null)),
  check (value is null or octet_length(value::text) <= 131072)
);

alter table public.superhuman_public_records enable row level security;
revoke all on public.superhuman_public_records from public, anon, authenticated;

create function public.superhuman_public_read(p_after text default '', p_limit integer default 200)
returns setof public.superhuman_public_records
language sql
stable
security definer
set search_path = ''
as $$
  select *
  from public.superhuman_public_records
  where record_key > coalesce(p_after, '')
  order by record_key
  limit least(greatest(coalesce(p_limit, 200), 1), 200);
$$;

create function public.superhuman_public_write(
  p_key text,
  p_value jsonb,
  p_deleted boolean,
  p_client_time bigint,
  p_writer uuid,
  p_expected_revision bigint
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  result public.superhuman_public_records;
  applied boolean := false;
begin
  if p_key is null or length(p_key) not between 1 and 512
    or p_deleted is null or p_client_time is null or p_client_time < 0
    or p_writer is null or p_expected_revision is null or p_expected_revision < 0
    or (p_deleted and p_value is not null) or (not p_deleted and p_value is null)
    or (p_value is not null and octet_length(p_value::text) > 131072) then
    raise exception using errcode = '22023', message = 'Invalid sync record';
  end if;

  if p_expected_revision = 0 then
    insert into public.superhuman_public_records
      (record_key, value, deleted, client_time, writer, revision)
    values
      (p_key, p_value, p_deleted, p_client_time, p_writer, 1)
    on conflict (record_key) do nothing
    returning * into result;
  else
    update public.superhuman_public_records
    set value = p_value, deleted = p_deleted, client_time = p_client_time,
        writer = p_writer, revision = revision + 1, updated_at = now()
    where record_key = p_key and revision = p_expected_revision
    returning * into result;
  end if;
  applied := found;
  if not applied then
    select * into result from public.superhuman_public_records where record_key = p_key;
  end if;
  return jsonb_build_object('applied', applied, 'record', to_jsonb(result));
end;
$$;

revoke all on function public.superhuman_public_read(text, integer) from public;
revoke all on function public.superhuman_public_write(text, jsonb, boolean, bigint, uuid, bigint) from public;
grant execute on function public.superhuman_public_read(text, integer) to anon, authenticated;
grant execute on function public.superhuman_public_write(text, jsonb, boolean, bigint, uuid, bigint) to anon, authenticated;
