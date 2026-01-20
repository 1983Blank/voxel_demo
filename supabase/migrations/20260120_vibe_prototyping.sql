-- Migration: Vibe Prototyping System
-- Plan-first generation with 4 variants, server-side screenshots, UI analysis

-- ============================================
-- VIBE SESSIONS TABLE
-- Stores prototyping sessions with prompt and status
-- ============================================
create table if not exists vibe_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  screen_id uuid references screens(id) on delete cascade not null,
  name text not null,
  prompt text not null,
  status text not null default 'pending' check (status in ('pending', 'analyzing', 'planning', 'plan_ready', 'generating', 'complete', 'failed')),
  plan_approved boolean default false,
  selected_variant_index integer check (selected_variant_index >= 1 and selected_variant_index <= 4),
  error_message text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists vibe_sessions_user_id_idx on vibe_sessions(user_id);
create index if not exists vibe_sessions_screen_id_idx on vibe_sessions(screen_id);
create index if not exists vibe_sessions_status_idx on vibe_sessions(status);

alter table vibe_sessions enable row level security;

create policy "Users can view own vibe sessions"
  on vibe_sessions for select
  using (auth.uid() = user_id);

create policy "Users can insert own vibe sessions"
  on vibe_sessions for insert
  with check (auth.uid() = user_id);

create policy "Users can update own vibe sessions"
  on vibe_sessions for update
  using (auth.uid() = user_id);

create policy "Users can delete own vibe sessions"
  on vibe_sessions for delete
  using (auth.uid() = user_id);

create trigger vibe_sessions_updated_at
  before update on vibe_sessions
  for each row execute function update_updated_at();

-- ============================================
-- VIBE VARIANT PLANS TABLE
-- Stores 4 variant concepts before code generation
-- ============================================
create table if not exists vibe_variant_plans (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references vibe_sessions(id) on delete cascade not null,
  variant_index integer not null check (variant_index >= 1 and variant_index <= 4),
  title text not null,
  description text not null,
  key_changes jsonb not null default '[]',
  style_notes text,
  created_at timestamptz default now(),
  -- Each session has exactly 4 plans (1-4)
  unique(session_id, variant_index)
);

create index if not exists vibe_variant_plans_session_id_idx on vibe_variant_plans(session_id);

alter table vibe_variant_plans enable row level security;

create policy "Users can view plans of own sessions"
  on vibe_variant_plans for select
  using (
    exists (
      select 1 from vibe_sessions
      where vibe_sessions.id = vibe_variant_plans.session_id
      and vibe_sessions.user_id = auth.uid()
    )
  );

create policy "Users can insert plans for own sessions"
  on vibe_variant_plans for insert
  with check (
    exists (
      select 1 from vibe_sessions
      where vibe_sessions.id = vibe_variant_plans.session_id
      and vibe_sessions.user_id = auth.uid()
    )
  );

create policy "Users can update plans of own sessions"
  on vibe_variant_plans for update
  using (
    exists (
      select 1 from vibe_sessions
      where vibe_sessions.id = vibe_variant_plans.session_id
      and vibe_sessions.user_id = auth.uid()
    )
  );

create policy "Users can delete plans of own sessions"
  on vibe_variant_plans for delete
  using (
    exists (
      select 1 from vibe_sessions
      where vibe_sessions.id = vibe_variant_plans.session_id
      and vibe_sessions.user_id = auth.uid()
    )
  );

-- ============================================
-- VIBE VARIANTS TABLE
-- Stores generated variant files with CDN URLs
-- ============================================
create table if not exists vibe_variants (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references vibe_sessions(id) on delete cascade not null,
  plan_id uuid references vibe_variant_plans(id) on delete cascade not null,
  variant_index integer not null check (variant_index >= 1 and variant_index <= 4),
  -- Storage paths (relative to bucket)
  html_path text not null,
  css_path text,
  screenshot_path text,
  -- CDN URLs (public access)
  html_url text not null,
  css_url text,
  screenshot_url text,
  -- Generation metadata
  generation_model text,
  generation_duration_ms integer,
  token_count integer,
  status text not null default 'pending' check (status in ('pending', 'generating', 'capturing', 'complete', 'failed')),
  error_message text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  -- Each session has max 4 variants
  unique(session_id, variant_index)
);

create index if not exists vibe_variants_session_id_idx on vibe_variants(session_id);
create index if not exists vibe_variants_plan_id_idx on vibe_variants(plan_id);
create index if not exists vibe_variants_status_idx on vibe_variants(status);

alter table vibe_variants enable row level security;

create policy "Users can view variants of own sessions"
  on vibe_variants for select
  using (
    exists (
      select 1 from vibe_sessions
      where vibe_sessions.id = vibe_variants.session_id
      and vibe_sessions.user_id = auth.uid()
    )
  );

create policy "Users can insert variants for own sessions"
  on vibe_variants for insert
  with check (
    exists (
      select 1 from vibe_sessions
      where vibe_sessions.id = vibe_variants.session_id
      and vibe_sessions.user_id = auth.uid()
    )
  );

create policy "Users can update variants of own sessions"
  on vibe_variants for update
  using (
    exists (
      select 1 from vibe_sessions
      where vibe_sessions.id = vibe_variants.session_id
      and vibe_sessions.user_id = auth.uid()
    )
  );

create policy "Users can delete variants of own sessions"
  on vibe_variants for delete
  using (
    exists (
      select 1 from vibe_sessions
      where vibe_sessions.id = vibe_variants.session_id
      and vibe_sessions.user_id = auth.uid()
    )
  );

create trigger vibe_variants_updated_at
  before update on vibe_variants
  for each row execute function update_updated_at();

-- ============================================
-- SCREEN UI METADATA TABLE
-- Stores extracted UI analysis from screens
-- ============================================
create table if not exists screen_ui_metadata (
  id uuid primary key default gen_random_uuid(),
  screen_id uuid references screens(id) on delete cascade not null unique,
  -- Extracted colors (primary, secondary, background, text, accents)
  colors jsonb not null default '{}',
  -- Typography (font families, sizes, weights, line heights)
  typography jsonb not null default '{}',
  -- Layout structure (grid, flexbox, container widths, spacing)
  layout jsonb not null default '{}',
  -- Component inventory (buttons, forms, cards, navbars, etc.)
  components jsonb not null default '[]',
  -- Accessibility info (contrast ratios, aria usage, semantic HTML)
  accessibility jsonb not null default '{}',
  -- Screenshot URL from rendering service
  screenshot_url text,
  -- Analysis metadata
  analyzed_at timestamptz default now(),
  analysis_model text,
  html_size_bytes integer,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists screen_ui_metadata_screen_id_idx on screen_ui_metadata(screen_id);

alter table screen_ui_metadata enable row level security;

create policy "Users can view metadata of own screens"
  on screen_ui_metadata for select
  using (
    exists (
      select 1 from screens
      where screens.id = screen_ui_metadata.screen_id
      and screens.user_id = auth.uid()
    )
  );

create policy "Users can insert metadata for own screens"
  on screen_ui_metadata for insert
  with check (
    exists (
      select 1 from screens
      where screens.id = screen_ui_metadata.screen_id
      and screens.user_id = auth.uid()
    )
  );

create policy "Users can update metadata of own screens"
  on screen_ui_metadata for update
  using (
    exists (
      select 1 from screens
      where screens.id = screen_ui_metadata.screen_id
      and screens.user_id = auth.uid()
    )
  );

create policy "Users can delete metadata of own screens"
  on screen_ui_metadata for delete
  using (
    exists (
      select 1 from screens
      where screens.id = screen_ui_metadata.screen_id
      and screens.user_id = auth.uid()
    )
  );

create trigger screen_ui_metadata_updated_at
  before update on screen_ui_metadata
  for each row execute function update_updated_at();

-- ============================================
-- STORAGE BUCKET: vibe-files
-- Public read, user-scoped write
-- ============================================
-- Note: Bucket creation and policies need to be configured in Supabase Dashboard
-- or via the Storage API. The SQL below documents the intended structure.

/*
Bucket structure:
vibe-files/
└── {user_id}/
    └── {session_id}/
        ├── source.html
        ├── source_screenshot.png
        ├── variant_1.html
        ├── variant_1.css
        ├── variant_1.png
        └── ... (variants 2-4)

Storage policies to configure:

-- Allow authenticated users to upload to their own folder
create policy "Users can upload vibe files"
on storage.objects for insert
with check (
  bucket_id = 'vibe-files' and
  auth.role() = 'authenticated' and
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to update their own files
create policy "Users can update own vibe files"
on storage.objects for update
using (
  bucket_id = 'vibe-files' and
  auth.role() = 'authenticated' and
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to delete their own files
create policy "Users can delete own vibe files"
on storage.objects for delete
using (
  bucket_id = 'vibe-files' and
  auth.role() = 'authenticated' and
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow public read access (for CDN serving)
create policy "Public read access for vibe files"
on storage.objects for select
using (bucket_id = 'vibe-files');
*/

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Get all variants for a session with their plans
create or replace function get_session_variants(p_session_id uuid)
returns table (
  variant_id uuid,
  variant_index integer,
  plan_title text,
  plan_description text,
  key_changes jsonb,
  style_notes text,
  html_url text,
  css_url text,
  screenshot_url text,
  status text,
  generation_model text,
  generation_duration_ms integer
) as $$
begin
  return query
  select
    v.id as variant_id,
    v.variant_index,
    p.title as plan_title,
    p.description as plan_description,
    p.key_changes,
    p.style_notes,
    v.html_url,
    v.css_url,
    v.screenshot_url,
    v.status,
    v.generation_model,
    v.generation_duration_ms
  from vibe_variants v
  join vibe_variant_plans p on v.plan_id = p.id
  where v.session_id = p_session_id
  order by v.variant_index;
end;
$$ language plpgsql security definer;

-- Get session with all related data
create or replace function get_vibe_session_full(p_session_id uuid)
returns json as $$
declare
  v_result json;
begin
  select json_build_object(
    'session', row_to_json(s),
    'plans', (
      select coalesce(json_agg(row_to_json(p) order by p.variant_index), '[]'::json)
      from vibe_variant_plans p
      where p.session_id = s.id
    ),
    'variants', (
      select coalesce(json_agg(row_to_json(v) order by v.variant_index), '[]'::json)
      from vibe_variants v
      where v.session_id = s.id
    ),
    'screen_metadata', (
      select row_to_json(m)
      from screen_ui_metadata m
      where m.screen_id = s.screen_id
    )
  ) into v_result
  from vibe_sessions s
  where s.id = p_session_id;

  return v_result;
end;
$$ language plpgsql security definer;

-- Grant execute permissions
grant execute on function get_session_variants(uuid) to authenticated;
grant execute on function get_vibe_session_full(uuid) to authenticated;
