-- History Hunt™
-- Migration: Fix ambiguous column references in import_engineering_workbook
-- Purpose:
--   The importer function returns columns named venue_id and game_id.
--   Unqualified references inside the PL/pgSQL function can become ambiguous.
--   This migration qualifies the affected table columns.
--
-- Safety:
--   Captured after successful HH-Validation Dev-Test patch.
--   Do not apply to Production until reviewed and approved.

CREATE OR REPLACE FUNCTION "public"."import_engineering_workbook"("payload" "jsonb") RETURNS TABLE("import_batch_id" "uuid", "batch_number" "text", "campaign_id" "uuid", "venue_id" "uuid", "game_id" "uuid", "game_slug" "text", "qr_slug" "text", "public_play_url" "text", "share_url" "text", "questions_imported" integer, "total_points" integer, "warnings_count" integer)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_batch jsonb := payload -> 'batch';
  v_hunt jsonb := payload -> 'huntInfo';
  v_questions jsonb := payload -> 'questions';
  v_raw_hunt jsonb := payload -> 'rawRows' -> 'huntInfo';
  v_raw_questions jsonb := payload -> 'rawRows' -> 'questions';
  v_warnings jsonb := payload -> 'warnings';

  v_import_batch_id uuid;
  v_organization_id uuid;
  v_campaign_id uuid;
  v_venue_id uuid;
  v_game_id uuid;

  v_org_name text := NULLIF(v_hunt ->> 'organization_name', '');
  v_org_slug text;
  v_campaign_name text := NULLIF(v_hunt ->> 'campaign_name', '');
  v_campaign_slug text;
  v_venue_name text := NULLIF(v_hunt ->> 'venue_name', '');
  v_venue_slug text;
  v_game_slug text := NULLIF(v_hunt ->> 'game_slug', '');
  v_qr_slug text := NULLIF(v_hunt ->> 'qr_slug', '');

  v_start_ts timestamptz;
  v_end_ts timestamptz;

  q jsonb;
  w jsonb;
  r jsonb;
  ord bigint;
BEGIN
  -- ------------------------------------------------------------
  -- Required payload validation
  -- ------------------------------------------------------------

  IF v_batch IS NULL OR v_hunt IS NULL OR v_questions IS NULL THEN
    RAISE EXCEPTION 'Invalid import payload. batch, huntInfo, and questions are required.';
  END IF;

  IF v_campaign_name IS NULL THEN
    RAISE EXCEPTION 'Campaign Name is required.';
  END IF;

  IF v_venue_name IS NULL THEN
    RAISE EXCEPTION 'Venue Name is required.';
  END IF;

  IF v_game_slug IS NULL THEN
    RAISE EXCEPTION 'Game Slug is required.';
  END IF;

  IF v_qr_slug IS NULL THEN
    RAISE EXCEPTION 'QR Slug is required.';
  END IF;

  IF COALESCE(jsonb_array_length(v_questions), 0) = 0 THEN
    RAISE EXCEPTION 'At least one question is required.';
  END IF;

  IF NULLIF(v_hunt ->> 'starts_at', '') IS NOT NULL THEN
    v_start_ts := (v_hunt ->> 'starts_at')::timestamptz;
  END IF;

  IF NULLIF(v_hunt ->> 'ends_at', '') IS NOT NULL THEN
    v_end_ts := (v_hunt ->> 'ends_at')::timestamptz;
  END IF;

  IF v_start_ts IS NOT NULL AND v_end_ts IS NOT NULL AND v_end_ts <= v_start_ts THEN
    RAISE EXCEPTION 'ends_at must be after starts_at.';
  END IF;

  -- ------------------------------------------------------------
  -- Create import batch master record
  -- ------------------------------------------------------------

  INSERT INTO public.import_batches (
    batch_name,
    file_name,
    import_mode,
    status,
    game_slug,
    created_by,
    source_file_checksum,
    supabase_project_ref,
    batch_number,
    workbook_name,
    workbook_version,
    importer_version,
    git_commit,
    submitted_by,
    submitted_email,
    organization,
    reviewer,
    review_status,
    import_status,
    notes
  )
  VALUES (
    COALESCE(v_batch ->> 'batch_number', 'IMPORT-' || to_char(now(), 'YYYYMMDDHH24MISS')),
    v_batch ->> 'workbook_name',
    COALESCE(v_batch ->> 'import_mode', 'draft'),
    'importing',
    v_game_slug,
    v_batch ->> 'created_by',
    v_batch ->> 'source_file_checksum',
    v_batch ->> 'supabase_project_ref',
    COALESCE(v_batch ->> 'batch_number', 'IMPORT-' || to_char(now(), 'YYYYMMDDHH24MISS')),
    v_batch ->> 'workbook_name',
    v_batch ->> 'workbook_version',
    v_batch ->> 'importer_version',
    v_batch ->> 'git_commit',
    v_batch ->> 'submitted_by',
    v_batch ->> 'submitted_email',
    v_batch ->> 'organization',
    NULL,
    'approved',
    'importing',
    'Created by import_engineering_workbook RPC.'
  )
  RETURNING public.import_batches.import_batch_id
  INTO v_import_batch_id;

  -- ------------------------------------------------------------
  -- Store raw workbook rows for auditability
  -- ------------------------------------------------------------

  IF v_raw_hunt IS NOT NULL THEN
    FOR r, ord IN
      SELECT value, ordinality
      FROM jsonb_array_elements(v_raw_hunt) WITH ORDINALITY
    LOOP
      INSERT INTO public.import_batch_rows (
        import_batch_id,
        sheet_name,
        row_number,
        row_data,
        status
      )
      VALUES (
        v_import_batch_id,
        'Hunt Info',
        ord::integer + 1,
        r,
        'parsed'
      );
    END LOOP;
  END IF;

  IF v_raw_questions IS NOT NULL THEN
    FOR r, ord IN
      SELECT value, ordinality
      FROM jsonb_array_elements(v_raw_questions) WITH ORDINALITY
    LOOP
      INSERT INTO public.import_batch_rows (
        import_batch_id,
        sheet_name,
        row_number,
        row_data,
        status
      )
      VALUES (
        v_import_batch_id,
        'Questions',
        ord::integer + 1,
        r,
        'parsed'
      );
    END LOOP;
  END IF;

  -- ------------------------------------------------------------
  -- Store validation warnings for auditability
  -- ------------------------------------------------------------

  IF v_warnings IS NOT NULL THEN
    FOR w IN SELECT value FROM jsonb_array_elements(v_warnings)
    LOOP
      INSERT INTO public.import_warnings (
        import_batch_id,
        sheet_name,
        row_number,
        field_name,
        warning_code,
        warning_message
      )
      VALUES (
        v_import_batch_id,
        COALESCE(w ->> 'sheetName', 'Workbook'),
        NULLIF(w ->> 'rowNumber', '')::integer,
        w ->> 'fieldName',
        w ->> 'code',
        w ->> 'message'
      );
    END LOOP;
  END IF;

  -- ------------------------------------------------------------
  -- Organization: find/create by slug
  -- ------------------------------------------------------------

  IF v_org_name IS NOT NULL THEN
    v_org_slug := public.hh_slugify(v_org_name);

    INSERT INTO public.organizations (
      slug,
      name,
      organization_type,
      contact_name,
      contact_email,
      active
    )
    VALUES (
      v_org_slug,
      v_org_name,
      'imported',
      v_hunt ->> 'contributor_name',
      v_hunt ->> 'contributor_email',
      true
    )
    ON CONFLICT (slug)
    DO UPDATE SET
      name = EXCLUDED.name,
      contact_name = COALESCE(EXCLUDED.contact_name, public.organizations.contact_name),
      contact_email = COALESCE(EXCLUDED.contact_email, public.organizations.contact_email),
      active = true
    RETURNING public.organizations.organization_id
    INTO v_organization_id;
  END IF;

  -- ------------------------------------------------------------
  -- Campaign: find/create by slug
  -- ------------------------------------------------------------

  v_campaign_slug := public.hh_slugify(v_campaign_name);

  INSERT INTO public.campaigns (
    slug,
    title,
    description,
    start_date,
    end_date,
    active,
    organization_id
  )
  VALUES (
    v_campaign_slug,
    v_campaign_name,
    v_hunt ->> 'description',
    v_start_ts::date,
    v_end_ts::date,
    true,
    v_organization_id
  )
  ON CONFLICT (slug)
  DO UPDATE SET
    title = EXCLUDED.title,
    description = COALESCE(EXCLUDED.description, public.campaigns.description),
    start_date = COALESCE(EXCLUDED.start_date, public.campaigns.start_date),
    end_date = COALESCE(EXCLUDED.end_date, public.campaigns.end_date),
    organization_id = COALESCE(EXCLUDED.organization_id, public.campaigns.organization_id),
    active = true
  RETURNING public.campaigns.campaign_id
  INTO v_campaign_id;

  -- ------------------------------------------------------------
  -- Venue: find by QR slug first; create/update otherwise
  -- ------------------------------------------------------------

  v_venue_slug := public.hh_slugify(v_venue_name || ' ' || COALESCE(v_hunt ->> 'city', ''));

  SELECT public.venues.venue_id
  INTO v_venue_id
  FROM public.venues
  WHERE public.venues.qr_slug = v_qr_slug
  LIMIT 1;

  IF v_venue_id IS NULL THEN
    INSERT INTO public.venues (
      slug,
      name,
      city,
      state,
      country,
      venue_type,
      qr_slug,
      active,
      organization_id,
      campaign_id,
      registration_enabled,
      quiz_enabled,
      reward_enabled
    )
    VALUES (
      v_venue_slug,
      v_venue_name,
      v_hunt ->> 'city',
      v_hunt ->> 'state',
      'USA',
      COALESCE(v_hunt ->> 'game_type', 'venue'),
      v_qr_slug,
      true,
      v_organization_id,
      v_campaign_id,
      COALESCE((v_hunt ->> 'registration_required')::boolean, true),
      true,
      true
    )
    ON CONFLICT (slug)
    DO UPDATE SET
      name = EXCLUDED.name,
      city = EXCLUDED.city,
      state = EXCLUDED.state,
      qr_slug = EXCLUDED.qr_slug,
      organization_id = COALESCE(EXCLUDED.organization_id, public.venues.organization_id),
      campaign_id = EXCLUDED.campaign_id,
      registration_enabled = EXCLUDED.registration_enabled,
      active = true
    RETURNING public.venues.venue_id
    INTO v_venue_id;
  ELSE
    UPDATE public.venues
    SET
      name = v_venue_name,
      city = v_hunt ->> 'city',
      state = v_hunt ->> 'state',
      organization_id = COALESCE(v_organization_id, organization_id),
      campaign_id = v_campaign_id,
      registration_enabled = COALESCE((v_hunt ->> 'registration_required')::boolean, registration_enabled),
      active = true
    WHERE public.venues.venue_id = v_venue_id;
  END IF;

  -- ------------------------------------------------------------
  -- Game: create/update by game slug
  -- ------------------------------------------------------------

  INSERT INTO public.games (
    campaign_id,
    slug,
    title,
    description,
    state,
    city,
    game_type,
    question_count,
    total_points,
    active,
    participant_badge_url,
    perfect_score_badge_url,
    status,
    starts_at,
    ends_at,
    public_play_url,
    share_url,
    share_title,
    share_text,
    badge_share_enabled,
    badge_download_enabled,
    countdown_enabled,
    leaderboard_enabled,
    registration_required,
    updated_at,
    updated_by
  )
  VALUES (
    v_campaign_id,
    v_game_slug,
    v_hunt ->> 'title',
    v_hunt ->> 'description',
    v_hunt ->> 'state',
    v_hunt ->> 'city',
    COALESCE(v_hunt ->> 'game_type', 'venue'),
    COALESCE((v_hunt ->> 'question_count')::integer, jsonb_array_length(v_questions)),
    COALESCE((v_hunt ->> 'total_points')::integer, 0),
    true,
    NULLIF(v_hunt ->> 'participant_badge_url', ''),
    NULLIF(v_hunt ->> 'perfect_score_badge_url', ''),
    COALESCE(v_hunt ->> 'status', 'draft'),
    v_start_ts,
    v_end_ts,
    v_hunt ->> 'public_play_url',
    v_hunt ->> 'share_url',
    v_hunt ->> 'share_title',
    v_hunt ->> 'share_text',
    COALESCE((v_hunt ->> 'badge_share_enabled')::boolean, true),
    COALESCE((v_hunt ->> 'badge_download_enabled')::boolean, true),
    COALESCE((v_hunt ->> 'countdown_enabled')::boolean, false),
    COALESCE((v_hunt ->> 'leaderboard_enabled')::boolean, false),
    COALESCE((v_hunt ->> 'registration_required')::boolean, true),
    now(),
    v_batch ->> 'created_by'
  )
  ON CONFLICT (slug)
  DO UPDATE SET
    campaign_id = EXCLUDED.campaign_id,
    title = EXCLUDED.title,
    description = EXCLUDED.description,
    state = EXCLUDED.state,
    city = EXCLUDED.city,
    game_type = EXCLUDED.game_type,
    question_count = EXCLUDED.question_count,
    total_points = EXCLUDED.total_points,
    active = true,
    participant_badge_url = EXCLUDED.participant_badge_url,
    perfect_score_badge_url = EXCLUDED.perfect_score_badge_url,
    status = EXCLUDED.status,
    starts_at = EXCLUDED.starts_at,
    ends_at = EXCLUDED.ends_at,
    public_play_url = EXCLUDED.public_play_url,
    share_url = EXCLUDED.share_url,
    share_title = EXCLUDED.share_title,
    share_text = EXCLUDED.share_text,
    badge_share_enabled = EXCLUDED.badge_share_enabled,
    badge_download_enabled = EXCLUDED.badge_download_enabled,
    countdown_enabled = EXCLUDED.countdown_enabled,
    leaderboard_enabled = EXCLUDED.leaderboard_enabled,
    registration_required = EXCLUDED.registration_required,
    updated_at = now(),
    updated_by = EXCLUDED.updated_by
  RETURNING public.games.game_id
  INTO v_game_id;

  -- ------------------------------------------------------------
  -- Replace questions for this game
  -- ------------------------------------------------------------

  DELETE FROM public.questions
  WHERE public.questions.game_id = v_game_id;

  FOR q IN SELECT value FROM jsonb_array_elements(v_questions)
  LOOP
    INSERT INTO public.questions (
      game_id,
      sort_order,
      lyric_prompt,
      question_text,
      choice_a,
      choice_b,
      choice_c,
      choice_d,
      correct_answer,
      educational_fact,
      category,
      difficulty,
      points,
      is_bonus,
      active,
      lyric,
      lyric_meaning,
      youtube_prompt,
      import_batch_id,
      source_row,
      question_version
    )
    VALUES (
      v_game_id,
      (q ->> 'sort_order')::integer,
      NULLIF(q ->> 'lyric_prompt', ''),
      q ->> 'question_text',
      q ->> 'choice_a',
      q ->> 'choice_b',
      COALESCE(q ->> 'choice_c', ''),
      COALESCE(q ->> 'choice_d', ''),
      (q ->> 'correct_answer')::char,
      NULLIF(q ->> 'educational_fact', ''),
      NULLIF(q ->> 'category', ''),
      COALESCE(NULLIF(q ->> 'difficulty', ''), 'medium'),
      COALESCE((q ->> 'points')::integer, 1),
      COALESCE((q ->> 'is_bonus')::boolean, false),
      COALESCE((q ->> 'active')::boolean, true),
      NULLIF(q ->> 'lyric', ''),
      NULLIF(q ->> 'lyric_meaning', ''),
      NULLIF(q ->> 'youtube_prompt', ''),
      v_import_batch_id,
      COALESCE((q ->> 'source_row')::integer, NULL),
      COALESCE((q ->> 'question_version')::integer, 1)
    );
  END LOOP;

  -- ------------------------------------------------------------
  -- Recalculate totals from inserted questions
  -- ------------------------------------------------------------

  UPDATE public.games
  SET
    question_count = (
      SELECT COUNT(*)::integer
      FROM public.questions
      WHERE public.questions.game_id = v_game_id
        AND active = true
    ),
    total_points = (
      SELECT COALESCE(SUM(points), 0)::integer
      FROM public.questions
      WHERE public.questions.game_id = v_game_id
        AND active = true
    ),
    updated_at = now()
  WHERE public.games.game_id = v_game_id
  RETURNING public.games.question_count, public.games.total_points
  INTO questions_imported, total_points;

  -- ------------------------------------------------------------
  -- Mark import batch complete
  -- ------------------------------------------------------------

  UPDATE public.import_batches
  SET
    status = 'completed',
    import_status = 'imported',
    published_at = now()
  WHERE public.import_batches.import_batch_id = v_import_batch_id;

  warnings_count := COALESCE(jsonb_array_length(v_warnings), 0);

  RETURN QUERY
  SELECT
    v_import_batch_id,
    v_batch ->> 'batch_number',
    v_campaign_id,
    v_venue_id,
    v_game_id,
    v_game_slug,
    v_qr_slug,
    v_hunt ->> 'public_play_url',
    v_hunt ->> 'share_url',
    questions_imported,
    total_points,
    warnings_count;
END;
$$;

REVOKE EXECUTE
ON FUNCTION public.import_engineering_workbook(jsonb)
FROM PUBLIC, anon, authenticated;

GRANT EXECUTE
ON FUNCTION public.import_engineering_workbook(jsonb)
TO service_role;
