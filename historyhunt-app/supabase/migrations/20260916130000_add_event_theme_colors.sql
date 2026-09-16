-- Reusable Event Hub theme colors. Presentation only; no gameplay effect.

ALTER TABLE public.campaigns
  ADD COLUMN IF NOT EXISTS event_primary_color text NOT NULL DEFAULT '#172554',
  ADD COLUMN IF NOT EXISTS event_secondary_color text NOT NULL DEFAULT '#f1f5f9',
  ADD COLUMN IF NOT EXISTS event_accent_color text NOT NULL DEFAULT '#b91c1c';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'campaigns_event_theme_colors_check'
      AND conrelid = 'public.campaigns'::regclass
  ) THEN
    ALTER TABLE public.campaigns
      ADD CONSTRAINT campaigns_event_theme_colors_check
      CHECK (
        event_primary_color ~ '^#[0-9A-Fa-f]{6}$'
        AND event_secondary_color ~ '^#[0-9A-Fa-f]{6}$'
        AND event_accent_color ~ '^#[0-9A-Fa-f]{6}$'
      );
  END IF;
END $$;

COMMENT ON COLUMN public.campaigns.event_primary_color IS
  'Event Hub primary color as a six-digit CSS hex value.';
COMMENT ON COLUMN public.campaigns.event_secondary_color IS
  'Event Hub secondary/background color as a six-digit CSS hex value.';
COMMENT ON COLUMN public.campaigns.event_accent_color IS
  'Event Hub accent and action color as a six-digit CSS hex value.';

