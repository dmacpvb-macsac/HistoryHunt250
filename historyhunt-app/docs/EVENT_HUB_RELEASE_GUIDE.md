# History Hunt Event Hub — Release Guide

Baseline: `d5bdb1a2a0df5397e9d8dcf8dadd77eec8b01d40`

## Contract

- A campaign may be presented as an Event Hub containing many games.
- The campaign is grouping and presentation metadata only.
- Every game still resolves independently from `games.slug` at `/play/{slug}`.
- The v1.3 Atomic Importer remains unchanged and authoritative for game production.
- Event leaderboard totals use each registered player's best completed score per game.
- Replays may improve a score but never add a second score for the same game.
- Every player may choose one globally unique Game Play User Name, stored on the player profile and reused across web, venue, and event games.
- Public leaderboard participation still requires affirmative consent for that specific event.
- Phone numbers, email addresses, first names, player IDs, and session IDs are never returned by the public Event API.
- Event games display only the completion badge. Existing non-event games retain their current completion/perfect behavior.

## Deployment order

1. Deploy migration `20260915090000_add_event_hubs_and_leaderboard_consent.sql`.
2. Deploy the application code.
3. Import each game independently with the frozen v1.3 importer. Use the same campaign name for all five games.
4. Configure the campaign as an Event using the SQL template below.
5. Confirm every leaderboard game requires registration and disallows anonymous play.
6. Confirm every game has one completion badge and no perfect-score badge.
7. Test registration, opt-in, all five play routes, completion badges, return navigation, replay scoring, and leaderboard ranking.

## Returning-player identity

- Mobile number continues to resolve the existing player record.
- `players.display_name` is the optional public Game Play User Name.
- User names are globally unique without regard to capitalization.
- Allowed format is 3–24 characters: letters, numbers, spaces, underscores, and hyphens, beginning and ending with a letter or number.
- Once a player has a Game Play User Name, ordinary game registration reuses it and does not replace it.
- `event_player_preferences` stores event consent only; it never creates a second public identity.

## Event activation template

Replace the values inside the `settings` CTE. Run only after the campaign and games exist.

```sql
WITH settings AS (
  SELECT
    'REPLACE-WITH-CAMPAIGN-SLUG'::text AS event_slug,
    'reunion'::text AS event_type,
    '40th Reunion'::text AS subtitle,
    'Choose from five games celebrating the Manzano High School Class of 1986.'::text AS short_description,
    NULL::text AS logo_image_url,
    NULL::text AS hero_image_url
)
UPDATE public.campaigns c
SET
  event_enabled = true,
  event_type = settings.event_type,
  event_visibility = 'unlisted',
  event_subtitle = settings.subtitle,
  event_short_description = settings.short_description,
  event_logo_image_url = settings.logo_image_url,
  event_hero_image_url = settings.hero_image_url,
  event_leaderboard_enabled = true
FROM settings
WHERE c.slug = settings.event_slug;

WITH settings AS (
  SELECT 'REPLACE-WITH-CAMPAIGN-SLUG'::text AS event_slug
)
UPDATE public.games g
SET
  registration_required = true,
  allow_anonymous_players = false,
  leaderboard_enabled = true,
  perfect_score_badge_id = NULL,
  perfect_score_badge_url = NULL
FROM public.campaigns c, settings
WHERE g.campaign_id = c.campaign_id
  AND c.slug = settings.event_slug;
```

The Event Hub URL is `/events/{campaign-slug}`.

## Game order

Set `event_display_order` to `1` through `5` after final game slugs are known:

```sql
UPDATE public.games SET event_display_order = 1 WHERE slug = 'FIRST-GAME-SLUG';
```

## Winner award — deliberately deferred

The leaderboard identifies rank 1 but sends nothing. A later award workflow can generate a special winner badge and contact the winner only through a separately authorized, audited notification job. SMS requires applicable SMS consent; email delivery needs its own consent and delivery policy. Do not expose contact data through the leaderboard API.
