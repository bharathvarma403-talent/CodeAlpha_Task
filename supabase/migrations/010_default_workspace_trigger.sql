-- Migration: 010_default_workspace_trigger.sql
-- Description: Automatically creates a default workspace for new users

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  default_workspace_id uuid;
  user_name text;
BEGIN
  user_name := COALESCE(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email, '@', 1));

  -- 1. Create Profile
  INSERT INTO public.profiles (id, full_name, avatar_url, display_name)
  VALUES (
    new.id,
    user_name,
    new.raw_user_meta_data->>'avatar_url',
    COALESCE(new.raw_user_meta_data->>'display_name', user_name)
  );

  -- 2. Create Default Workspace
  INSERT INTO public.workspaces (name, slug, owner_id)
  VALUES (
    user_name || '''s Workspace',
    'ws-' || lower(substring(new.id::text from 1 for 8)),
    new.id
  )
  RETURNING id INTO default_workspace_id;

  -- 3. Add user as Owner in workspace_members
  -- Note: role is of type member_role (enum)
  INSERT INTO public.workspace_members (workspace_id, user_id, role)
  VALUES (default_workspace_id, new.id, 'owner');

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
