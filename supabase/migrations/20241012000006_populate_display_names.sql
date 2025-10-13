-- ============================================
-- POPULATE DISPLAY NAMES FROM GOOGLE OAUTH
-- ============================================
-- Set display_name to the user's actual full name from Google

-- Backfill display_name for existing users from auth metadata
UPDATE public.profiles p
SET display_name = au.raw_user_meta_data->>'full_name'
FROM auth.users au
WHERE p.id = au.id
  AND p.display_name IS NULL
  AND au.raw_user_meta_data->>'full_name' IS NOT NULL;

-- Update the handle_new_user function to also set display_name
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  base_username TEXT;
  final_username TEXT;
  counter INT := 0;
BEGIN
  -- Try to get username from Google OAuth metadata
  base_username := COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'name',
    split_part(NEW.email, '@', 1)
  );

  -- Clean username (remove spaces, special chars)
  base_username := regexp_replace(lower(base_username), '[^a-z0-9_]', '', 'g');

  -- Ensure minimum length
  IF char_length(base_username) < 2 THEN
    base_username := 'user_' || substr(NEW.id::text, 1, 8);
  END IF;

  -- Handle collisions by appending numbers
  final_username := base_username;
  WHILE EXISTS (SELECT 1 FROM public.profiles WHERE username = final_username) LOOP
    counter := counter + 1;
    final_username := base_username || counter::text;
  END LOOP;

  -- Insert profile with BOTH username and display_name
  INSERT INTO public.profiles (id, username, display_name, avatar_url)
  VALUES (
    NEW.id,
    final_username,
    -- NEW: Set display_name to actual full name (not cleaned)
    COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'name'
    ),
    COALESCE(
      NEW.raw_user_meta_data->>'picture',
      NEW.raw_user_meta_data->>'avatar_url'
    )
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
