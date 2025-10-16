-- Add performance index on games.external_id
-- This column is queried frequently (finding/creating games, room lookups)
-- but doesn't have an index yet

CREATE INDEX IF NOT EXISTS idx_games_external_id ON public.games(external_id);
