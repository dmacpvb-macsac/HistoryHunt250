-- OPTIONAL, DESTRUCTIVE, AND NOT PART OF THE AUTOMATIC MIGRATION.
-- Back up Production and validate the new player flow before running.
-- This preserves player IDs, public player names, sessions, scores, responses,
-- badges, and leaderboard history while erasing legacy contact/affiliation data.

BEGIN;

UPDATE public.players
SET
  first_name = NULL,
  phone_number = NULL,
  phone_e164 = NULL,
  email = NULL,
  country_code = NULL,
  country_iso = NULL,
  sms_opt_in = NULL,
  service_affiliation = NULL,
  terms_accepted = NULL,
  privacy_accepted = NULL;

COMMIT;
