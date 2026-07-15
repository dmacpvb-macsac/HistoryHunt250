-- RC 2.0 Post-Hardening
-- Tighten direct client grants on sensitive gameplay tables.
-- Browser/client access is now routed through protected server-side API routes.
-- Service role access is preserved for server routes.

BEGIN;

REVOKE ALL PRIVILEGES ON TABLE public.players
FROM anon, authenticated, PUBLIC;

REVOKE ALL PRIVILEGES ON TABLE public.sessions
FROM anon, authenticated, PUBLIC;

REVOKE ALL PRIVILEGES ON TABLE public.responses
FROM anon, authenticated, PUBLIC;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.players TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.sessions TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.responses TO service_role;

COMMIT;
