create schema superhuman;

revoke all on schema superhuman from public, anon, authenticated;
grant usage on schema superhuman to service_role;

create table superhuman.sync_vault (
  sync_id text primary key check (sync_id ~ '^[0-9a-f]{64}$'),
  encrypted_blob jsonb not null check (
    jsonb_typeof(encrypted_blob) = 'object'
    and octet_length(encrypted_blob::text) <= 4194304
  ),
  updated_at timestamptz not null default now()
);

alter table superhuman.sync_vault enable row level security;
revoke all on table superhuman.sync_vault from public, anon, authenticated;
grant select, insert, update, delete on table superhuman.sync_vault to service_role;

create function public.superhuman_sync_get(p_sync_id text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  result jsonb;
begin
  if p_sync_id is null or p_sync_id !~ '^[0-9a-f]{64}$' then
    raise exception using errcode = '22023', message = 'Invalid sync identifier';
  end if;

  select jsonb_build_object(
    'encrypted_blob', vault.encrypted_blob,
    'updated_at', vault.updated_at
  )
  into result
  from superhuman.sync_vault as vault
  where vault.sync_id = p_sync_id;

  return result;
end;
$$;

create function public.superhuman_sync_put(p_sync_id text, p_encrypted_blob jsonb)
returns timestamptz
language plpgsql
security definer
set search_path = ''
as $$
declare
  saved_at timestamptz;
begin
  if p_sync_id is null or p_sync_id !~ '^[0-9a-f]{64}$' then
    raise exception using errcode = '22023', message = 'Invalid sync identifier';
  end if;
  if p_encrypted_blob is null
    or jsonb_typeof(p_encrypted_blob) <> 'object'
    or octet_length(p_encrypted_blob::text) > 4194304 then
    raise exception using errcode = '22023', message = 'Invalid or oversized encrypted payload';
  end if;

  insert into superhuman.sync_vault (sync_id, encrypted_blob, updated_at)
  values (p_sync_id, p_encrypted_blob, now())
  on conflict (sync_id) do update
    set encrypted_blob = excluded.encrypted_blob,
        updated_at = excluded.updated_at
  returning updated_at into saved_at;

  return saved_at;
end;
$$;

create function public.superhuman_sync_delete(p_sync_id text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  deleted_count integer;
begin
  if p_sync_id is null or p_sync_id !~ '^[0-9a-f]{64}$' then
    raise exception using errcode = '22023', message = 'Invalid sync identifier';
  end if;

  delete from superhuman.sync_vault as vault
  where vault.sync_id = p_sync_id;
  get diagnostics deleted_count = row_count;

  return deleted_count > 0;
end;
$$;

revoke all on function public.superhuman_sync_get(text) from public, anon, authenticated;
revoke all on function public.superhuman_sync_put(text, jsonb) from public, anon, authenticated;
revoke all on function public.superhuman_sync_delete(text) from public, anon, authenticated;
grant execute on function public.superhuman_sync_get(text) to service_role;
grant execute on function public.superhuman_sync_put(text, jsonb) to service_role;
grant execute on function public.superhuman_sync_delete(text) to service_role;
