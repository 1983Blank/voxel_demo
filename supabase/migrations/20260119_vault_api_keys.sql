-- Migration: Switch API key storage to Supabase Vault
-- This replaces the pgcrypto-based user_api_keys table with vault.secrets

-- ============================================
-- API KEY REFERENCES TABLE
-- Stores metadata and references to vault secrets
-- ============================================

-- Drop old table and functions
drop function if exists store_api_key(uuid, text, text, text, text);
drop function if exists get_api_key(uuid, text);
drop function if exists delete_api_key(uuid, text);
drop function if exists get_encryption_key();
drop table if exists user_api_keys cascade;

-- Create new reference table (actual keys stored in vault)
create table if not exists user_api_key_refs (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  provider text not null check (provider in ('anthropic', 'openai', 'google')),
  vault_secret_name text not null, -- Reference to vault.secrets.name
  key_name text not null default 'Default',
  model text,
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  -- Each user can only have one key per provider
  unique(user_id, provider)
);

create index if not exists user_api_key_refs_user_id_idx on user_api_key_refs(user_id);
create index if not exists user_api_key_refs_vault_secret_name_idx on user_api_key_refs(vault_secret_name);

-- Enable RLS
alter table user_api_key_refs enable row level security;

-- RLS Policies
create policy "Users can view own API key refs"
  on user_api_key_refs for select
  using (auth.uid() = user_id);

create policy "Users can insert own API key refs"
  on user_api_key_refs for insert
  with check (auth.uid() = user_id);

create policy "Users can update own API key refs"
  on user_api_key_refs for update
  using (auth.uid() = user_id);

create policy "Users can delete own API key refs"
  on user_api_key_refs for delete
  using (auth.uid() = user_id);

-- Trigger for updated_at
create trigger user_api_key_refs_updated_at
  before update on user_api_key_refs
  for each row execute function update_updated_at();

-- ============================================
-- VAULT-BASED API KEY FUNCTIONS
-- ============================================

-- Generate a unique vault secret name for a user's API key
create or replace function generate_vault_secret_name(p_user_id uuid, p_provider text)
returns text as $$
begin
  return 'api_key_' || p_user_id::text || '_' || p_provider;
end;
$$ language plpgsql immutable;

-- Store an API key in the vault
create or replace function store_api_key(
  p_user_id uuid,
  p_provider text,
  p_api_key text,
  p_key_name text default 'Default',
  p_model text default null
)
returns uuid as $$
declare
  v_secret_name text;
  v_secret_id uuid;
  v_ref_id uuid;
begin
  -- Generate unique secret name
  v_secret_name := generate_vault_secret_name(p_user_id, p_provider);

  -- Delete existing vault secret if exists (by name)
  delete from vault.secrets where name = v_secret_name;

  -- Delete existing reference if exists
  delete from user_api_key_refs
  where user_id = p_user_id and provider = p_provider;

  -- Create new vault secret with the unique name
  select vault.create_secret(p_api_key, v_secret_name, 'API key for ' || p_provider)
  into v_secret_id;

  -- Create reference record
  insert into user_api_key_refs (user_id, provider, vault_secret_name, key_name, model, is_active)
  values (p_user_id, p_provider, v_secret_name, p_key_name, p_model, true)
  returning id into v_ref_id;

  return v_ref_id;
end;
$$ language plpgsql security definer;

-- Retrieve a decrypted API key from the vault
create or replace function get_api_key(p_user_id uuid, p_provider text)
returns text as $$
declare
  v_secret_name text;
  v_decrypted_secret text;
begin
  -- Get the vault secret name from the reference
  select vault_secret_name into v_secret_name
  from user_api_key_refs
  where user_id = p_user_id and provider = p_provider and is_active = true;

  if v_secret_name is null then
    return null;
  end if;

  -- Get the decrypted secret from vault
  select decrypted_secret into v_decrypted_secret
  from vault.decrypted_secrets
  where name = v_secret_name;

  return v_decrypted_secret;
end;
$$ language plpgsql security definer;

-- Delete an API key from the vault
create or replace function delete_api_key(p_user_id uuid, p_provider text)
returns boolean as $$
declare
  v_secret_name text;
begin
  -- Get the vault secret name
  select vault_secret_name into v_secret_name
  from user_api_key_refs
  where user_id = p_user_id and provider = p_provider;

  if v_secret_name is null then
    return false;
  end if;

  -- Delete from vault
  delete from vault.secrets where name = v_secret_name;

  -- Delete reference
  delete from user_api_key_refs
  where user_id = p_user_id and provider = p_provider;

  return true;
end;
$$ language plpgsql security definer;

-- ============================================
-- GRANT PERMISSIONS
-- Service role needs access to vault for Edge Functions
-- ============================================

-- Grant usage on vault schema to service_role
grant usage on schema vault to service_role;
grant select on vault.decrypted_secrets to service_role;
grant execute on function vault.create_secret(text, text, text) to service_role;

-- Grant execute on our functions
grant execute on function store_api_key(uuid, text, text, text, text) to authenticated;
grant execute on function get_api_key(uuid, text) to service_role;
grant execute on function delete_api_key(uuid, text) to authenticated;
