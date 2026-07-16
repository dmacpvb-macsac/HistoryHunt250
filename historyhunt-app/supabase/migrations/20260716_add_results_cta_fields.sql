-- RC 2.0 Post-Hardening / Results CTA
-- Adds optional game-level call-to-action fields for results pages.
-- Example uses: Donate, Learn More, Sponsor, Merch, Custom.

BEGIN;

ALTER TABLE public.games
ADD COLUMN IF NOT EXISTS results_cta_enabled boolean DEFAULT false;

ALTER TABLE public.games
ADD COLUMN IF NOT EXISTS results_cta_type text;

ALTER TABLE public.games
ADD COLUMN IF NOT EXISTS results_cta_label text;

ALTER TABLE public.games
ADD COLUMN IF NOT EXISTS results_cta_url text;

ALTER TABLE public.games
ADD COLUMN IF NOT EXISTS results_cta_note text;

COMMENT ON COLUMN public.games.results_cta_enabled IS
'When true, the results page may display a game-level call-to-action button.';

COMMENT ON COLUMN public.games.results_cta_type IS
'Optional results CTA type: donate, learn_more, sponsor, merch, or custom.';

COMMENT ON COLUMN public.games.results_cta_label IS
'Button label displayed on the results page, such as Donate to Wounded Warrior Project.';

COMMENT ON COLUMN public.games.results_cta_url IS
'Destination URL for the results page CTA button.';

COMMENT ON COLUMN public.games.results_cta_note IS
'Optional supporting text displayed with the results CTA.';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'games_results_cta_type_check'
  ) THEN
    ALTER TABLE public.games
    ADD CONSTRAINT games_results_cta_type_check
    CHECK (
      results_cta_type IS NULL
      OR results_cta_type = ''
      OR results_cta_type IN (
        'donate',
        'learn_more',
        'sponsor',
        'merch',
        'custom'
      )
    );
  END IF;
END $$;

COMMIT;
