# Watch Lock - Schema Summary (Updated)

## Profiles Table Structure

### Applied Migrations (All Synced ✅)

All 21 migrations are applied to both local and remote:
- Initial schema (20241012000000)
- Display names populated (20241012000006)
- Game/Room relationship fixed (20250116000004)
- External ID index added (20250116000005)
- Username unique constraint (20250116000006) - REMOVED IN NEXT MIGRATION
- **Username field removed** (20250116000007) ✅ JUST APPLIED

### Profiles Table Schema (CURRENT)

```sql
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY,                    -- References auth.users(id)
  display_name TEXT,                      -- Editable display name (first name from Google)
  avatar_url TEXT,                        -- From Google OAuth picture
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Field Explanations

#### `id` (UUID, PRIMARY KEY)
- **Purpose**: Permanent user identifier
- **Source**: From auth.users table (Supabase Auth)
- **Used for**: All user references, foreign keys

#### `display_name` (TEXT, NULLABLE)
- **Purpose**: User's display name shown in UI
- **Generation**: Auto-populated from Google OAuth `given_name` (first name) on signup
  - Example: "Trevor" (not "Trevor Brown")
- **Editable**: ✅ YES - users can change to anything they want in profile settings
- **Fallback**: If null, UI shows 'User' or email prefix
- **Used for**: Room member names, message authors, profile headers
- **Comment**: "User display name (typically first name from Google OAuth given_name, e.g., 'Trevor'). Can be edited by user to any preferred name."

#### `avatar_url` (TEXT, NULLABLE)
- **Purpose**: Profile picture URL
- **Source**: From Google OAuth `picture` field
- **Used for**: Avatar display in UI

### Permanent Identifiers

1. **`user.id`** (UUID) - Database primary key, never changes
2. **`user.email`** (from auth.users) - Google email, unique, never changes

### What Was Removed

❌ **`username` field** - No longer exists
- Previously: `@trevorbrown3` (auto-generated, caused confusion)
- Reason for removal: Not needed with Google-only auth
- Replaced by: `display_name` (simpler, more user-friendly)

### Trigger Logic (Updated)

**On User Signup** (`handle_new_user()` trigger):
1. Extracts **first name** from Google OAuth `given_name`
2. Creates profile with:
   - `display_name`: First name from Google (e.g., "Trevor")
   - `avatar_url`: from Google `picture` field

```sql
-- Extracts first name only
COALESCE(
  NEW.raw_user_meta_data->>'given_name',  -- "Trevor" (not "Trevor Brown")
  NEW.raw_user_meta_data->>'name',
  split_part(NEW.email, '@', 1)            -- Fallback to email prefix
)
```

### UI Behavior

**Profile Page** (`app/profile/page.tsx`):
- Shows: `Trevor` (display_name) in large text
- Shows: `tbrown034@gmail.com` (email) below in smaller text
- Edit button allows changing display_name
- Helper text: "This is your display name - typically your first name, but you can change it to anything you like."

**Room Members** (`components/room/RoomMemberList.tsx`):
- Shows: `Trevor` (display_name)
- Fallback: `User` if display_name is null

**Messages** (`components/game/MessageFeed.tsx`):
- Author shown as: `Trevor` (display_name)
- Fallback: `User` if display_name is null

## Example User Data

**On Signup:**
```json
{
  "id": "uuid-here",
  "display_name": "Trevor",              // From Google given_name
  "avatar_url": "https://...",
  "email": "tbrown034@gmail.com"        // In auth.users table
}
```

**After User Edits:**
```json
{
  "id": "uuid-here",
  "display_name": "T-Brown",           // User can change to anything ✅
  "avatar_url": "https://...",
  "email": "tbrown034@gmail.com"        // Never changes ✅
}
```

## Summary of Changes

✅ **Removed**: `username` field (unnecessary complexity)
✅ **Simplified**: Use first name from Google OAuth as display_name
✅ **Editable**: Users can change display_name to anything
✅ **Permanent IDs**: user.id (UUID) and user.email
✅ **Updated**: All API routes and UI components
✅ **Migration**: Successfully applied to remote database
