-- Voxel Database Schema for Supabase
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/_/sql

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ============================================
-- USER PROFILES TABLE
-- Stores user roles and profile info
-- ============================================
create table if not exists user_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  name text,
  role text not null default 'user' check (role in ('admin', 'user', 'viewer')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- RLS policies for user_profiles
alter table user_profiles enable row level security;

-- Users can view their own profile
create policy "Users can view own profile"
  on user_profiles for select
  using (auth.uid() = id);

-- Admins can view all profiles
create policy "Admins can view all profiles"
  on user_profiles for select
  using (
    exists (
      select 1 from user_profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- Admins can insert new profiles (for inviting users)
create policy "Admins can insert profiles"
  on user_profiles for insert
  with check (
    exists (
      select 1 from user_profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- Admins can update any profile
create policy "Admins can update profiles"
  on user_profiles for update
  using (
    exists (
      select 1 from user_profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- Admins can delete profiles (except themselves)
create policy "Admins can delete profiles"
  on user_profiles for delete
  using (
    auth.uid() != id and
    exists (
      select 1 from user_profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- Function to create user profile on signup
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into user_profiles (id, email, name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    -- First user becomes admin, others are regular users
    case when (select count(*) from user_profiles) = 0 then 'admin' else 'user' end
  );
  return new;
end;
$$ language plpgsql security definer;

-- Trigger to auto-create profile on user signup
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ============================================
-- SCREENS TABLE
-- Stores captured HTML screens
-- ============================================
create table if not exists screens (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  file_name text not null,
  file_path text,
  html text,
  thumbnail text,
  tags text[] default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Index for faster user queries
create index if not exists screens_user_id_idx on screens(user_id);

-- RLS policies
alter table screens enable row level security;

create policy "Users can view own screens"
  on screens for select
  using (auth.uid() = user_id);

create policy "Users can insert own screens"
  on screens for insert
  with check (auth.uid() = user_id);

create policy "Users can update own screens"
  on screens for update
  using (auth.uid() = user_id);

create policy "Users can delete own screens"
  on screens for delete
  using (auth.uid() = user_id);

-- ============================================
-- SCREEN VERSIONS TABLE
-- Version history for screen edits
-- ============================================
create table if not exists screen_versions (
  id uuid primary key default uuid_generate_v4(),
  screen_id uuid references screens(id) on delete cascade not null,
  html text not null,
  prompt text,
  description text,
  created_at timestamptz default now()
);

create index if not exists screen_versions_screen_id_idx on screen_versions(screen_id);

alter table screen_versions enable row level security;

create policy "Users can view versions of own screens"
  on screen_versions for select
  using (
    exists (
      select 1 from screens
      where screens.id = screen_versions.screen_id
      and screens.user_id = auth.uid()
    )
  );

create policy "Users can insert versions for own screens"
  on screen_versions for insert
  with check (
    exists (
      select 1 from screens
      where screens.id = screen_versions.screen_id
      and screens.user_id = auth.uid()
    )
  );

-- ============================================
-- COMPONENTS TABLE
-- Extracted UI components
-- ============================================
create table if not exists components (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  screen_id uuid references screens(id) on delete set null,
  name text not null,
  html text not null,
  css text,
  category text,
  tags text[] default '{}',
  created_at timestamptz default now()
);

create index if not exists components_user_id_idx on components(user_id);

alter table components enable row level security;

create policy "Users can view own components"
  on components for select
  using (auth.uid() = user_id);

create policy "Users can insert own components"
  on components for insert
  with check (auth.uid() = user_id);

create policy "Users can update own components"
  on components for update
  using (auth.uid() = user_id);

create policy "Users can delete own components"
  on components for delete
  using (auth.uid() = user_id);

-- ============================================
-- PROTOTYPES TABLE
-- Published prototypes for sharing
-- ============================================
create table if not exists prototypes (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  screen_id uuid references screens(id) on delete cascade not null,
  name text not null,
  html text not null,
  is_published boolean default false,
  share_id text unique,
  allow_comments boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists prototypes_user_id_idx on prototypes(user_id);
create index if not exists prototypes_share_id_idx on prototypes(share_id);

alter table prototypes enable row level security;

-- Owners can do everything
create policy "Users can view own prototypes"
  on prototypes for select
  using (auth.uid() = user_id);

create policy "Users can insert own prototypes"
  on prototypes for insert
  with check (auth.uid() = user_id);

create policy "Users can update own prototypes"
  on prototypes for update
  using (auth.uid() = user_id);

create policy "Users can delete own prototypes"
  on prototypes for delete
  using (auth.uid() = user_id);

-- Anyone can view published prototypes via share_id
create policy "Anyone can view published prototypes"
  on prototypes for select
  using (is_published = true and share_id is not null);

-- ============================================
-- VARIANTS TABLE
-- A/B/C/D variants of prototypes
-- ============================================
create table if not exists variants (
  id uuid primary key default uuid_generate_v4(),
  prototype_id uuid references prototypes(id) on delete cascade not null,
  name text not null,
  label text not null check (label in ('A', 'B', 'C', 'D')),
  html text not null,
  created_at timestamptz default now()
);

create index if not exists variants_prototype_id_idx on variants(prototype_id);

alter table variants enable row level security;

create policy "Users can view variants of own prototypes"
  on variants for select
  using (
    exists (
      select 1 from prototypes
      where prototypes.id = variants.prototype_id
      and prototypes.user_id = auth.uid()
    )
  );

create policy "Users can insert variants for own prototypes"
  on variants for insert
  with check (
    exists (
      select 1 from prototypes
      where prototypes.id = variants.prototype_id
      and prototypes.user_id = auth.uid()
    )
  );

create policy "Users can update variants of own prototypes"
  on variants for update
  using (
    exists (
      select 1 from prototypes
      where prototypes.id = variants.prototype_id
      and prototypes.user_id = auth.uid()
    )
  );

create policy "Users can delete variants of own prototypes"
  on variants for delete
  using (
    exists (
      select 1 from prototypes
      where prototypes.id = variants.prototype_id
      and prototypes.user_id = auth.uid()
    )
  );

-- Anyone can view variants of published prototypes
create policy "Anyone can view variants of published prototypes"
  on variants for select
  using (
    exists (
      select 1 from prototypes
      where prototypes.id = variants.prototype_id
      and prototypes.is_published = true
    )
  );

-- ============================================
-- COMMENTS TABLE
-- Comments on prototypes
-- ============================================
create table if not exists comments (
  id uuid primary key default uuid_generate_v4(),
  prototype_id uuid references prototypes(id) on delete cascade not null,
  variant_id uuid references variants(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade not null,
  user_name text not null,
  user_avatar text,
  content text not null,
  position_x integer,
  position_y integer,
  parent_id uuid references comments(id) on delete cascade,
  resolved boolean default false,
  created_at timestamptz default now()
);

create index if not exists comments_prototype_id_idx on comments(prototype_id);
create index if not exists comments_parent_id_idx on comments(parent_id);

alter table comments enable row level security;

-- Users can view comments on prototypes they own or that are published
create policy "Users can view comments"
  on comments for select
  using (
    exists (
      select 1 from prototypes
      where prototypes.id = comments.prototype_id
      and (prototypes.user_id = auth.uid() or prototypes.is_published = true)
    )
  );

-- Authenticated users can comment on published prototypes
create policy "Users can insert comments"
  on comments for insert
  with check (
    auth.uid() = user_id and
    exists (
      select 1 from prototypes
      where prototypes.id = comments.prototype_id
      and (prototypes.user_id = auth.uid() or (prototypes.is_published = true and prototypes.allow_comments = true))
    )
  );

-- Users can update their own comments
create policy "Users can update own comments"
  on comments for update
  using (auth.uid() = user_id);

-- Users can delete their own comments or comments on their prototypes
create policy "Users can delete comments"
  on comments for delete
  using (
    auth.uid() = user_id or
    exists (
      select 1 from prototypes
      where prototypes.id = comments.prototype_id
      and prototypes.user_id = auth.uid()
    )
  );

-- ============================================
-- PRODUCT CONTEXTS TABLE
-- Product context documents for AI
-- ============================================
create table if not exists product_contexts (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  type text not null check (type in ('text', 'pdf', 'video', 'url')),
  content text not null,
  created_at timestamptz default now()
);

create index if not exists product_contexts_user_id_idx on product_contexts(user_id);

alter table product_contexts enable row level security;

create policy "Users can view own contexts"
  on product_contexts for select
  using (auth.uid() = user_id);

create policy "Users can insert own contexts"
  on product_contexts for insert
  with check (auth.uid() = user_id);

create policy "Users can update own contexts"
  on product_contexts for update
  using (auth.uid() = user_id);

create policy "Users can delete own contexts"
  on product_contexts for delete
  using (auth.uid() = user_id);

-- ============================================
-- ANALYTICS EVENTS TABLE
-- Track engagement events
-- ============================================
create table if not exists analytics_events (
  id uuid primary key default uuid_generate_v4(),
  prototype_id uuid references prototypes(id) on delete cascade not null,
  variant_id uuid references variants(id) on delete cascade,
  event_type text not null,
  user_id uuid references auth.users(id) on delete set null,
  metadata jsonb default '{}',
  created_at timestamptz default now()
);

create index if not exists analytics_events_prototype_id_idx on analytics_events(prototype_id);
create index if not exists analytics_events_created_at_idx on analytics_events(created_at);

alter table analytics_events enable row level security;

-- Users can view analytics for their own prototypes
create policy "Users can view own analytics"
  on analytics_events for select
  using (
    exists (
      select 1 from prototypes
      where prototypes.id = analytics_events.prototype_id
      and prototypes.user_id = auth.uid()
    )
  );

-- Anyone can insert analytics events (for tracking views)
create policy "Anyone can insert analytics events"
  on analytics_events for insert
  with check (true);

-- ============================================
-- FUNCTIONS
-- ============================================

-- Auto-update updated_at timestamp
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Triggers for updated_at
create trigger screens_updated_at
  before update on screens
  for each row execute function update_updated_at();

create trigger prototypes_updated_at
  before update on prototypes
  for each row execute function update_updated_at();

-- ============================================
-- LLM API KEYS TABLE (with pgcrypto encryption)
-- Securely stores API keys for AI providers
-- ============================================

-- Enable pgcrypto extension for encryption
create extension if not exists pgcrypto;

-- Drop old table if exists (for migration)
drop table if exists user_api_keys cascade;

create table user_api_keys (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  provider text not null check (provider in ('anthropic', 'openai', 'google')),
  key_name text not null default 'Default',
  -- Store the encrypted API key directly
  encrypted_key text not null,
  model text,
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  -- Each user can only have one active key per provider
  unique(user_id, provider)
);

create index if not exists user_api_keys_user_id_idx on user_api_keys(user_id);

alter table user_api_keys enable row level security;

-- Users can only view their own API keys
create policy "Users can view own API keys"
  on user_api_keys for select
  using (auth.uid() = user_id);

create policy "Users can insert own API keys"
  on user_api_keys for insert
  with check (auth.uid() = user_id);

create policy "Users can update own API keys"
  on user_api_keys for update
  using (auth.uid() = user_id);

create policy "Users can delete own API keys"
  on user_api_keys for delete
  using (auth.uid() = user_id);

-- Trigger for updated_at
drop trigger if exists user_api_keys_updated_at on user_api_keys;
create trigger user_api_keys_updated_at
  before update on user_api_keys
  for each row execute function update_updated_at();

-- ============================================
-- API KEY HELPER FUNCTIONS
-- Functions to safely store and retrieve API keys
-- Uses pgcrypto with a server-side encryption key
-- ============================================

-- IMPORTANT: Set this encryption key as a Supabase secret
-- In Supabase Dashboard > Settings > Edge Functions > Secrets
-- Or use: SELECT set_config('app.encryption_key', 'your-32-char-secret-key-here!!', false);
-- For production, store this in vault.secrets and retrieve it

-- Function to get the encryption key (set this up in your environment)
create or replace function get_encryption_key()
returns text as $$
begin
  -- Try to get from session config first (for testing)
  -- In production, you should use a proper secret management approach
  return coalesce(
    current_setting('app.encryption_key', true),
    'voxel-default-key-change-in-prod!'  -- 32 chars, CHANGE THIS IN PRODUCTION
  );
end;
$$ language plpgsql stable security definer;

-- Function to store an API key (encrypted)
create or replace function store_api_key(
  p_user_id uuid,
  p_provider text,
  p_api_key text,
  p_key_name text default 'Default',
  p_model text default null
)
returns uuid as $$
declare
  v_encrypted text;
  v_key_id uuid;
begin
  -- Encrypt the API key
  v_encrypted := encode(
    pgp_sym_encrypt(p_api_key, get_encryption_key()),
    'base64'
  );

  -- Delete existing key for this provider if exists
  delete from user_api_keys
  where user_id = p_user_id and provider = p_provider;

  -- Insert new key
  insert into user_api_keys (user_id, provider, key_name, encrypted_key, model, is_active)
  values (p_user_id, p_provider, p_key_name, v_encrypted, p_model, true)
  returning id into v_key_id;

  return v_key_id;
end;
$$ language plpgsql security definer;

-- Function to retrieve a decrypted API key
create or replace function get_api_key(p_user_id uuid, p_provider text)
returns text as $$
declare
  v_encrypted text;
  v_decrypted text;
begin
  -- Get the encrypted key
  select encrypted_key into v_encrypted
  from user_api_keys
  where user_id = p_user_id and provider = p_provider and is_active = true;

  if v_encrypted is null then
    return null;
  end if;

  -- Decrypt and return
  v_decrypted := pgp_sym_decrypt(
    decode(v_encrypted, 'base64'),
    get_encryption_key()
  );

  return v_decrypted;
end;
$$ language plpgsql security definer;

-- Function to delete an API key
create or replace function delete_api_key(p_user_id uuid, p_provider text)
returns boolean as $$
begin
  delete from user_api_keys
  where user_id = p_user_id and provider = p_provider;

  return found;
end;
$$ language plpgsql security definer;

-- ============================================
-- STORAGE BUCKETS
-- For editor images and assets
-- ============================================

-- Create storage bucket for editor images (run this in Supabase Dashboard > Storage)
-- The bucket should be named 'editor-images' and set to public

-- Storage policies (these need to be set via Supabase Dashboard or SQL)
-- 1. Allow authenticated users to upload to their own folder
-- 2. Allow public read access to all images

-- Example RLS policies for storage (run in SQL editor):
/*
-- Allow authenticated users to upload images
create policy "Users can upload images"
on storage.objects for insert
with check (
  bucket_id = 'editor-images' and
  auth.role() = 'authenticated' and
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to update their own images
create policy "Users can update own images"
on storage.objects for update
using (
  bucket_id = 'editor-images' and
  auth.role() = 'authenticated' and
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to delete their own images
create policy "Users can delete own images"
on storage.objects for delete
using (
  bucket_id = 'editor-images' and
  auth.role() = 'authenticated' and
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow public read access
create policy "Public read access"
on storage.objects for select
using (bucket_id = 'editor-images');
*/

-- ============================================
-- INITIAL SETUP COMPLETE
-- ============================================
