-- ============================================
-- ADD LAST_VISITED TO PROFILES
-- ============================================
-- Track when users last visited the app

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS last_visited TIMESTAMPTZ;

-- Set last_visited to current time for existing users
UPDATE public.profiles
SET last_visited = NOW()
WHERE last_visited IS NULL;

-- Create function to update last_visited on auth
CREATE OR REPLACE FUNCTION update_last_visited()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.profiles
  SET last_visited = NOW()
  WHERE id = NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Note: We'll track last_visited in the app layer when users sign in
-- rather than using a trigger, as triggers on auth.users aren't reliable
-- for tracking active sessions
