-- History Hunt Events: additive presentation and leaderboard metadata.
-- Campaigns group games for an Event Hub only. They never select gameplay.

ALTER TABLE public.campaigns
  ADD COLUMN IF NOT EXISTS event_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS event_type text,
  ADD COLUMN IF NOT EXISTS event_visibility text NOT NULL DEFAULT 'unlisted',
  ADD COLUMN IF NOT EXISTS event_subtitle text,
  ADD COLUMN IF NOT EXISTS event_short_description text,
  ADD COLUMN IF NOT EXISTS event_hero_image_url text,
  ADD COLUMN IF NOT EXISTS event_logo_image_url text,
  ADD COLUMN IF NOT EXISTS event_leaderboard_enabled boolean NOT NULL DEFAULT false;

ALTER TABLE public.games
  ADD COLUMN IF NOT EXISTS event_display_order integer;

ALTER TABLE public.players
  ADD COLUMN IF NOT EXISTS display_name text;

CREATE TABLE IF NOT EXISTS public.event_player_preferences (
  campaign_id uuid NOT NULL REFERENCES public.campaigns(campaign_id) ON DELETE CASCADE,
  player_id uuid NOT NULL REFERENCES public.players(player_id) ON DELETE CASCADE,
  leaderboard_opt_in boolean NOT NULL DEFAULT false,
  leaderboard_opt_in_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (campaign_id, player_id)
);

REVOKE ALL PRIVILEGES ON TABLE public.event_player_preferences FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.event_player_preferences TO service_role;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'campaigns_event_visibility_check'
      AND conrelid = 'public.campaigns'::regclass
  ) THEN
    ALTER TABLE public.campaigns
      ADD CONSTRAINT campaigns_event_visibility_check
      CHECK (event_visibility IN ('public', 'unlisted', 'private'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'campaigns_event_type_check'
      AND conrelid = 'public.campaigns'::regclass
  ) THEN
    ALTER TABLE public.campaigns
      ADD CONSTRAINT campaigns_event_type_check
      CHECK (
        event_type IS NULL OR event_type IN (
          'reunion', 'wedding', 'graduation', 'conference',
          'festival', 'fundraiser', 'corporate', 'community', 'custom'
        )
      );
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS campaigns_event_hub_lookup_idx
  ON public.campaigns (slug)
  WHERE active = true AND event_enabled = true;

CREATE INDEX IF NOT EXISTS games_event_hub_order_idx
  ON public.games (campaign_id, event_display_order, title)
  WHERE active = true;

CREATE INDEX IF NOT EXISTS sessions_event_leaderboard_idx
  ON public.sessions (campaign_id, player_id, game_id, score DESC, completed_at)
  WHERE completed = true AND player_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS players_display_name_unique_ci_idx
  ON public.players (lower(display_name))
  WHERE display_name IS NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'players_display_name_format_check'
      AND conrelid = 'public.players'::regclass
  ) THEN
    ALTER TABLE public.players
      ADD CONSTRAINT players_display_name_format_check
      CHECK (
        display_name IS NULL OR display_name ~ '^[A-Za-z0-9][A-Za-z0-9 _-]{1,22}[A-Za-z0-9]$'
      );
  END IF;
END $$;

COMMENT ON COLUMN public.campaigns.event_enabled IS
  'Publishes a campaign as an Event Hub. Presentation only; never a gameplay selector.';
COMMENT ON COLUMN public.campaigns.event_leaderboard_enabled IS
  'Allows the public event leaderboard API. Rows still require player opt-in.';
COMMENT ON COLUMN public.games.event_display_order IS
  'Optional presentation order inside an Event Hub. Does not affect gameplay.';
COMMENT ON COLUMN public.players.display_name IS
  'Optional, globally unique public Game Play User Name reused for this player across all game types.';
COMMENT ON TABLE public.event_player_preferences IS
  'Per-event affirmative leaderboard consent. The public Game Play User Name remains on the player profile.';
