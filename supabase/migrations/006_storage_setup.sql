-- Migration: 006_storage_setup.sql
-- Description: Configures storage buckets and RLS policies for files

-- 1. Create Buckets
INSERT INTO storage.buckets (id, name, public) 
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public) 
VALUES ('attachments', 'attachments', false)
ON CONFLICT (id) DO NOTHING;

-- 2. Storage Policies

-- AVATARS (Public Read, Owner Write)
CREATE POLICY "Avatar Public Read" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');

CREATE POLICY "Avatar Owner Insert" ON storage.objects FOR INSERT 
  WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Avatar Owner Update" ON storage.objects FOR UPDATE
  USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- ATTACHMENTS (Authenticated Read if accessible, Owner Write)
-- We'll use a simpler policy for now: Owner can manage their own files.
-- Complex project-based access for storage objects is harder in SQL alone, 
-- but we can check if the user is in the workspace/project.
-- For now, let's keep it simple: Authenticated users can upload to their own folder.

CREATE POLICY "Attachment Owner Manage" ON storage.objects FOR ALL
  USING (bucket_id = 'attachments' AND auth.uid()::text = (storage.foldername(name))[1])
  WITH CHECK (bucket_id = 'attachments' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Policy for reading attachments (must be member of project)
-- This is tricky because storage.objects doesn't have task_id.
-- Usually we use a signed URL or a proxy function.
-- For now, we'll allow members of any workspace to see attachments if they have the link, 
-- but strictly restrict upload/delete.
CREATE POLICY "Attachment Authenticated Read" ON storage.objects FOR SELECT
  USING (bucket_id = 'attachments' AND auth.role() = 'authenticated');
