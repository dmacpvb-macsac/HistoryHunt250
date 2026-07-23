BEGIN;

-- Normalize legacy game types before tightening the constraint.
UPDATE public.games
SET
  game_type = 'venue',
  updated_at = now()
WHERE game_type = 'event';

-- Replace the old game type taxonomy.
ALTER TABLE public.games
DROP CONSTRAINT IF EXISTS games_game_type_check;

ALTER TABLE public.games
ADD CONSTRAINT games_game_type_check
CHECK (
  game_type IN (
    'venue',
    'community',
    'web',
    'music',
    'kidz'
  )
);

COMMIT;
