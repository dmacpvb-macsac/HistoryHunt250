# Username-Only Player Flow — Deployment

## What changes

- Every game uses the same flow: pick a game, choose a unique 6–12 character player name, and play.
- No name, phone, email, veteran/service, marketing, or leaderboard opt-in fields are collected.
- A secure HttpOnly cookie recognizes returning players on the same device.
- Player names and scores are automatically eligible for enabled leaderboards.
- Existing sessions, scores, responses, and badges remain intact.

## Deployment order

1. Apply `supabase/migrations/20260922120000_add_username_only_player_identity.sql` to Validation.
2. Deploy this code to a preview environment connected to Validation.
3. Complete the Validation checks below.
4. Apply the same migration to Production.
5. Merge/deploy the code to Production.
6. Complete the Production smoke test on a phone.

The database migration must run before the code because the code reads and writes
`players.player_access_token_hash`.

## Validation checks

1. Open a game in a private/incognito window.
2. Confirm the only requested value is Player Name.
3. Confirm names shorter than 6 or longer than 12 characters are rejected.
4. Confirm an existing name, ignoring case, is rejected.
5. Submit a valid name and confirm Question 1 opens directly.
6. Complete a game and confirm the result uses the player name.
7. Confirm the score appears on an enabled event leaderboard without an opt-in step.
8. Open another game in the same browser and confirm **Play as _player name_** appears.
9. Test the complete flow at a narrow mobile width and on a physical phone.
10. Confirm America 250 Proof games retain their intended song controls.

## Legacy player behavior

The first visit from a browser with the former localStorage player ID upgrades that
existing player to cookie identity, keeps their history, and clears that record's
legacy contact fields. Other historical contact fields are not automatically deleted
by this release.

## Optional historical PII retirement

After Production validation and a database backup, run the separately reviewed
`USERNAME_ONLY_PLAYER_FLOW_RETIRE_LEGACY_PII.sql` script if the business decision is
to erase old registration contact data. This cleanup is intentionally not automatic.
