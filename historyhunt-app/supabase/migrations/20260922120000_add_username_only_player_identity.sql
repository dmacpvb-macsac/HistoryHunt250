-- Username-only player identity for every History Hunt game.
-- Run this migration before deploying the matching application code.

ALTER TABLE public.players
  ADD COLUMN IF NOT EXISTS player_access_token_hash text;

CREATE UNIQUE INDEX IF NOT EXISTS players_access_token_hash_unique_idx
  ON public.players (player_access_token_hash)
  WHERE player_access_token_hash IS NOT NULL;

-- New players do not provide contact or registration fields. Keep the legacy
-- columns temporarily so existing production records and history remain valid.
DO $$
DECLARE
  v_column_name text;
BEGIN
  FOREACH v_column_name IN ARRAY ARRAY[
    'first_name',
    'phone_number',
    'phone_e164',
    'email',
    'country_code',
    'country_iso',
    'sms_opt_in',
    'service_affiliation',
    'terms_accepted',
    'privacy_accepted',
    'source'
  ]
  LOOP
    IF EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'players'
        AND information_schema.columns.column_name = v_column_name
        AND is_nullable = 'NO'
    ) THEN
      EXECUTE format('ALTER TABLE public.players ALTER COLUMN %I DROP NOT NULL', v_column_name);
    END IF;
  END LOOP;
END $$;

COMMENT ON COLUMN public.players.player_access_token_hash IS
  'SHA-256 hash of the random HttpOnly cookie token used to recognize a returning player. Plaintext tokens are never stored.';
