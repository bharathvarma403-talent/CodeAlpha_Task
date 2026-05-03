-- Migration: 009_security_hardening.sql
-- Description: Advanced security constraints and rate limiting triggers

-- 1. Prevent excessive comment spamming (Simple Rate Limit)
CREATE OR REPLACE FUNCTION check_comment_rate()
RETURNS trigger AS $$
BEGIN
  IF (
    SELECT count(*) 
    FROM public.comments 
    WHERE user_id = auth.uid() 
    AND created_at > now() - interval '1 minute'
  ) > 10 THEN
    RAISE EXCEPTION 'Rate limit exceeded: Max 10 comments per minute.';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trig_comment_rate_limit') THEN
    CREATE TRIGGER trig_comment_rate_limit
      BEFORE INSERT ON public.comments
      FOR EACH ROW EXECUTE FUNCTION check_comment_rate();
  END IF;
END $$;

-- 2. Data Sanitization (Strict JSONB Validation)
ALTER TABLE public.tasks 
  ADD CONSTRAINT task_description_json_check 
  CHECK (jsonb_typeof(description) = 'object' OR description IS NULL);

-- 3. Immutable Timestamps
CREATE OR REPLACE FUNCTION protect_created_at()
RETURNS trigger AS $$
BEGIN
  IF OLD.created_at IS DISTINCT FROM NEW.created_at THEN
    NEW.created_at = OLD.created_at;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to core tables
DO $$
BEGIN
  CREATE TRIGGER protect_tasks_created_at BEFORE UPDATE ON public.tasks FOR EACH ROW EXECUTE FUNCTION protect_created_at();
  CREATE TRIGGER protect_projects_created_at BEFORE UPDATE ON public.projects FOR EACH ROW EXECUTE FUNCTION protect_created_at();
EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- 4. Audit Log Integrity
ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Activity log is read-only for members" 
  ON public.activity_log FOR SELECT 
  USING (EXISTS (SELECT 1 FROM workspace_members WHERE workspace_id = activity_log.workspace_id AND user_id = auth.uid()));
