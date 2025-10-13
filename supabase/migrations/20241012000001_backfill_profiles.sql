-- ============================================
-- BACKFILL PROFILES FOR EXISTING USERS
-- ============================================
-- This creates profiles for users who signed up before the trigger was created

-- Insert profiles for all users who don't have one yet
INSERT INTO public.profiles (id, username, avatar_url)
SELECT
  au.id,
  -- Generate username from Google OAuth data
  CASE
    WHEN au.raw_user_meta_data->>'full_name' IS NOT NULL
      THEN regexp_replace(lower(au.raw_user_meta_data->>'full_name'), '[^a-z0-9_]', '', 'g')
    WHEN au.raw_user_meta_data->>'name' IS NOT NULL
      THEN regexp_replace(lower(au.raw_user_meta_data->>'name'), '[^a-z0-9_]', '', 'g')
    ELSE 'user_' || substr(au.id::text, 1, 8)
  END as base_username,
  -- Get avatar from Google OAuth
  COALESCE(
    au.raw_user_meta_data->>'picture',
    au.raw_user_meta_data->>'avatar_url'
  ) as avatar_url
FROM auth.users au
WHERE NOT EXISTS (
  SELECT 1 FROM public.profiles p WHERE p.id = au.id
)
ON CONFLICT (id) DO NOTHING;

-- Handle username collisions by appending numbers
DO $$
DECLARE
  profile_record RECORD;
  new_username TEXT;
  counter INT;
BEGIN
  FOR profile_record IN
    SELECT id, username
    FROM public.profiles
    WHERE username IN (
      SELECT username
      FROM public.profiles
      GROUP BY username
      HAVING COUNT(*) > 1
    )
  LOOP
    counter := 1;
    new_username := profile_record.username || counter::text;

    WHILE EXISTS (SELECT 1 FROM public.profiles WHERE username = new_username) LOOP
      counter := counter + 1;
      new_username := profile_record.username || counter::text;
    END LOOP;

    UPDATE public.profiles
    SET username = new_username
    WHERE id = profile_record.id;
  END LOOP;
END $$;
