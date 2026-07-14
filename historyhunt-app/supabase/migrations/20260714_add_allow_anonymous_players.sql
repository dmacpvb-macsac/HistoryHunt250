-- Adds explicit anonymous-play control at the game level.
-- Privacy-first default: anonymous play is allowed unless a game intentionally requires registration.

ALTER TABLE public.games
ADD COLUMN IF NOT EXISTS allow_anonymous_players boolean DEFAULT true;

COMMENT ON COLUMN public.games.allow_anonymous_players IS
'When true, players may choose Play Anonymous on the registration page. Anonymous sessions use player_id = null and do not create player profile/history records.';
