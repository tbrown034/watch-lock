# CLAUDE CODE INSTRUCTIONS

## Database Workflow

This project uses **Supabase remote database only**.

### Making Schema Changes

1. Write SQL migration files manually in `supabase/migrations/`
2. Use timestamp format: `YYYYMMDDHHMMSS_description.sql`
3. Apply via `supabase db push` OR copy/paste into Supabase Dashboard SQL Editor

### Viewing Schema

Use Supabase Dashboard SQL Editor at https://supabase.com/dashboard/project/msdemnzgwzaokzjyymgi

### Testing

Test directly against remote database. Environment variables are in `.env.local`.

## Project Info

- **Supabase Project ID:** `msdemnzgwzaokzjyymgi`
- **Region:** East US (North Virginia)
- **Deployment:** Vercel

## Tech Stack

- Next.js 15 + TypeScript
- Supabase (PostgreSQL + Auth)
- Tailwind CSS

That's it. Keep it simple.
