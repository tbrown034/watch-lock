-- Add UNIQUE constraint to username
-- This ensures no duplicate usernames can exist
-- Username is a permanent identifier (like Twitter @handle)
-- Display name is the editable user-facing name

-- Step 1: Check for any duplicate usernames (shouldn't exist due to trigger logic)
-- If duplicates exist, append numbers to make them unique
DO $$
DECLARE
  dup_username TEXT;
  counter INT;
BEGIN
  FOR dup_username IN
    SELECT username
    FROM public.profiles
    GROUP BY username
    HAVING COUNT(*) > 1
  LOOP
    counter := 1;
    -- Update duplicates by appending incrementing numbers
    UPDATE public.profiles
    SET username = username || counter::text
    WHERE id IN (
      SELECT id
      FROM public.profiles
      WHERE username = dup_username
      OFFSET 1  -- Keep the first one as-is, modify the rest
    );
    counter := counter + 1;
  END LOOP;
END $$;

-- Step 2: Add UNIQUE constraint on username
ALTER TABLE public.profiles
ADD CONSTRAINT profiles_username_unique UNIQUE (username);

-- Step 3: Add helpful comments to document the schema
COMMENT ON COLUMN public.profiles.username IS
  'Permanent username identifier (e.g., @trevorbrown). Auto-generated on signup from Google name/email. Cannot be changed.';

COMMENT ON COLUMN public.profiles.display_name IS
  'User display name (e.g., "Trevor Brown"). From Google OAuth but can be edited by user in profile settings.';
