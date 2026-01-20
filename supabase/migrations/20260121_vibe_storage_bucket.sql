-- Create vibe-files storage bucket for variant HTML files
-- This migration sets up the storage bucket and RLS policies

-- Create the storage bucket
insert into storage.buckets (id, name, public, file_size_limit)
values ('vibe-files', 'vibe-files', true, 10485760) -- 10MB limit
on conflict (id) do nothing;

-- Storage RLS policies

-- Users can upload to their own folder (user_id/session_id/variant_N.html)
create policy "Users can upload to own folder"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'vibe-files'
  and (storage.foldername(name))[1] = auth.uid()::text
);

-- Anyone can read vibe files (public bucket)
create policy "Anyone can read vibe files"
on storage.objects for select
to public
using (bucket_id = 'vibe-files');

-- Users can update their own files
create policy "Users can update own files"
on storage.objects for update
to authenticated
using (
  bucket_id = 'vibe-files'
  and (storage.foldername(name))[1] = auth.uid()::text
);

-- Users can delete their own files
create policy "Users can delete own files"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'vibe-files'
  and (storage.foldername(name))[1] = auth.uid()::text
);
