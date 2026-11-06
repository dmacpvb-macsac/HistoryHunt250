# Jacksonville Veterans Week 2026 — implementation and launch checklist

## App routes in this change
- `/veterans-week-jax` — new public Veterans Week game hub.
- `/` — adds a prominent link to the Veterans Week hub, preserving the existing Freedom Fest content.

## Game safety and behavior
- Games are retrieved client-side from `GET /api/games/current`, which already checks active status, question availability, schedule, and venue eligibility.
- Groups include Wounded Warrior Project / Carry Forward, Veterans United, and military/veteran history.
- No inactive game is auto-reactivated; no game, session, badge, or registration data is changed.
- Results-page donation CTAs remain a separate per-game database configuration, **not included** in this change.
- Donation/ticket links are third-party destinations; playing does not require a donation.
- Validate that WWP, Veterans United, and Jacksonville games appear as intended after deployment; if a game is missing, check its existing publication status instead of overriding it.

## Hosting distinction
`play.historyhuntgames.com` is the Next.js app deployment. `historyhuntgames.com` is a separate public marketing website currently hosted outside this repository. Updating the latter requires its actual document root, `index.html`, shared styles/scripts and hosting setup. Don't assume that pushing to this repo changes the public marketing home page.

## Spotify
The playlist is being created separately. Replace the hub's Spotify placeholder with an embed **only after receiving the verified public Spotify playlist URL**.

## QR link correction
The currently supplied flyer QR resolves to `https://america250proof.com`, rather than the Veterans Week hub. Regenerate/reverify the QR once the destination is selected. Do not redistribute the old flyer as a direct Veterans Week QR.

## Suggested public paths
- App: `https://play.historyhuntgames.com/veterans-week-jax` (after app deployment).
- Marketing site: `https://historyhuntgames.com/veterans-week-jax/` (requires Namecheap site upload).
- Optionally redirect `https://america250proof.com/hh/veteransweekJax/` to the marketing page once the A250P site can be edited.

## Verification before release
1. Review and merge this PR.
2. Deploy the app from the merged branch.
3. Confirm HTTP 200 for the new app route; test mobile games and CORS.
4. Inspect active-game card links and official nonprofit destinations.
5. Publish Namecheap marketing page and add link to its homepage.
6. Update America 250 Proof and Mac & Sac links and embed Spotify once available.
7. Correct/verify promotional QR and test on a phone.
