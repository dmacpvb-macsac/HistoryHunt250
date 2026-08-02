BEGIN;

-- V1.5 registration policy: every game requires a registered player.
ALTER TABLE public.games
  ALTER COLUMN registration_required SET DEFAULT true;

ALTER TABLE public.games
  ALTER COLUMN allow_anonymous_players SET DEFAULT false;

UPDATE public.games
SET
  registration_required = true,
  allow_anonymous_players = false,
  updated_at = now(),
  updated_by = 'V1.5 registration policy migration'
WHERE registration_required IS DISTINCT FROM true
   OR allow_anonymous_players IS DISTINCT FROM false;

-- Community/state games use one shared completion badge and no perfect badge.
UPDATE public.games
SET
  perfect_score_badge_id = NULL,
  updated_at = now(),
  updated_by = 'V1.5 community badge policy migration'
WHERE game_type = 'community'
  AND perfect_score_badge_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.v15_enforce_community_badge_policy()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.game_type = 'community' THEN
    NEW.perfect_score_badge_id := NULL;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS v15_enforce_community_badge_policy
ON public.games;

CREATE TRIGGER v15_enforce_community_badge_policy
BEFORE INSERT OR UPDATE ON public.games
FOR EACH ROW
EXECUTE FUNCTION public.v15_enforce_community_badge_policy();

-- A session may award a given badge only once.
CREATE UNIQUE INDEX IF NOT EXISTS player_badges_session_badge_unique
ON public.player_badges (session_id, badge_id);

CREATE OR REPLACE FUNCTION public.v15_award_session_badges()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  completion_badge uuid;
  perfect_badge uuid;
BEGIN
  IF NEW.completed IS NOT TRUE
     OR NEW.player_id IS NULL
     OR NEW.game_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT
    g.completion_badge_id,
    g.perfect_score_badge_id
  INTO
    completion_badge,
    perfect_badge
  FROM public.games g
  WHERE g.game_id = NEW.game_id;

  IF completion_badge IS NOT NULL THEN
    INSERT INTO public.player_badges (
      player_id,
      session_id,
      badge_id
    )
    VALUES (
      NEW.player_id,
      NEW.session_id,
      completion_badge
    )
    ON CONFLICT DO NOTHING;
  END IF;

  IF perfect_badge IS NOT NULL
     AND NEW.score IS NOT NULL
     AND NEW.total_points IS NOT NULL
     AND NEW.score = NEW.total_points THEN
    INSERT INTO public.player_badges (
      player_id,
      session_id,
      badge_id
    )
    VALUES (
      NEW.player_id,
      NEW.session_id,
      perfect_badge
    )
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS v15_award_session_badges
ON public.sessions;

CREATE TRIGGER v15_award_session_badges
AFTER INSERT OR UPDATE ON public.sessions
FOR EACH ROW
EXECUTE FUNCTION public.v15_award_session_badges();

-- Idempotent historical backfill for environments that have not yet been repaired.
INSERT INTO public.player_badges (
  player_id,
  session_id,
  badge_id
)
SELECT
  s.player_id,
  s.session_id,
  g.completion_badge_id
FROM public.sessions s
JOIN public.games g
  ON g.game_id = s.game_id
WHERE s.completed IS TRUE
  AND s.player_id IS NOT NULL
  AND g.completion_badge_id IS NOT NULL
ON CONFLICT DO NOTHING;

INSERT INTO public.player_badges (
  player_id,
  session_id,
  badge_id
)
SELECT
  s.player_id,
  s.session_id,
  g.perfect_score_badge_id
FROM public.sessions s
JOIN public.games g
  ON g.game_id = s.game_id
WHERE s.completed IS TRUE
  AND s.player_id IS NOT NULL
  AND s.score IS NOT NULL
  AND s.total_points IS NOT NULL
  AND s.score = s.total_points
  AND g.perfect_score_badge_id IS NOT NULL
ON CONFLICT DO NOTHING;

COMMIT;
