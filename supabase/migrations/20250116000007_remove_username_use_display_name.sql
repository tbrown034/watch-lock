-- Remove username field, use display_name for everything
-- display_name = first name from Google OAuth (given_name), editable by user
-- Permanent identifiers: user.id (UUID) and user.email

-- Step 1: Update trigger to use given_name (first name) instead of generating username
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert profile with display_name set to first name from Google
  INSERT INTO public.profiles (id, username, display_name, avatar_url)
  VALUES (
    NEW.id,
    -- Temporary: Keep username as email prefix until we drop the column
    split_part(NEW.email, '@', 1),
    -- NEW: Use given_name (first name) from Google OAuth
    COALESCE(
      NEW.raw_user_meta_data->>'given_name',
      NEW.raw_user_meta_data->>'name',
      split_part(NEW.email, '@', 1)
    ),
    COALESCE(
      NEW.raw_user_meta_data->>'picture',
      NEW.raw_user_meta_data->>'avatar_url'
    )
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 2: Backfill existing display_names with given_name (first name only)
UPDATE public.profiles p
SET display_name = COALESCE(
  au.raw_user_meta_data->>'given_name',
  -- Fallback: extract first word from full_name
  split_part(au.raw_user_meta_data->>'full_name', ' ', 1),
  -- Last fallback: use current display_name or email prefix
  p.display_name,
  split_part(au.email, '@', 1)
)
FROM auth.users au
WHERE p.id = au.id;

-- Step 3: Drop the username column (no longer needed)
-- First, drop the unique constraint
ALTER TABLE public.profiles
DROP CONSTRAINT IF EXISTS profiles_username_unique;

-- Drop the check constraint
ALTER TABLE public.profiles
DROP CONSTRAINT IF EXISTS username_min_length;

-- Finally, drop the column
ALTER TABLE public.profiles
DROP COLUMN username;

-- Step 4: Update schema comments
COMMENT ON COLUMN public.profiles.display_name IS
  'User display name (typically first name from Google OAuth given_name, e.g., "Trevor"). Can be edited by user to any preferred name.';

COMMENT ON TABLE public.profiles IS
  'User profiles extending auth.users. Permanent identifiers are id (UUID) and email. Display name is editable.';
