import { NextRequest, NextResponse } from 'next/server'

import { buildImportPreviewPayload } from '@/lib/importer/importWorkbook'
import type {
  ImportWorkbookInput,
  ImportWorkbookResult,
} from '@/lib/importer/importWorkbook'
import { supabaseAdmin } from '@/lib/supabase/admin'

export const runtime = 'nodejs'

function normalizeRpcResult(data: unknown, fallbackPayload: ReturnType<typeof buildImportPreviewPayload>): ImportWorkbookResult {
  const result = Array.isArray(data) ? data[0] : data
  const record = (result || {}) as Record<string, unknown>

  return {
    importBatchId: String(record.import_batch_id || ''),
    batchNumber: String(record.batch_number || fallbackPayload.batch.batch_number),
    campaignId: String(record.campaign_id || ''),
    venueId: String(record.venue_id || ''),
    gameId: String(record.game_id || ''),
    gameSlug: String(record.game_slug || fallbackPayload.huntInfo.game_slug),
    qrSlug: String(record.qr_slug || fallbackPayload.huntInfo.qr_slug),
    publicPlayUrl: String(record.public_play_url || fallbackPayload.huntInfo.public_play_url),
    shareUrl: String(record.share_url || fallbackPayload.huntInfo.share_url),
    questionsImported: Number(record.questions_imported || fallbackPayload.questions.length),
    totalPoints: Number(record.total_points || fallbackPayload.huntInfo.total_points),
    warningsCount: Number(record.warnings_count || fallbackPayload.warnings.length),
  }
}

type BadgeType = 'completed' | 'perfect_score'

// "community" games (states/territories) share one badge per state, stored
// in a single shared Storage folder rather than a per-game folder. Every
// other game type (venue, web, music, kidz) keeps a per-game badge and
// verifies its canonical Storage object exists.
const SHARED_BADGE_GAME_TYPES = new Set(['community'])
const SHARED_BADGE_FOLDER = 'games/states'

const DEFAULT_BADGE_SLUGS: Record<BadgeType, string> = {
  completed: 'default-completed',
  perfect_score: 'default-perfect',
}

/**
 * Ensures a badge is registered in the `badges` table, then returns the
 * slug that should actually be written onto the game record.
 *
 * - "community" (state/territory) games: the badge lives in the shared
 *   games/states/ folder, not a per-game folder. We trust the workbook's
 *   badge slug as-is once it's confirmed present there. A missing shared
 *   state badge is a hard failure — every game for that state depends on
 *   the one shared asset, so silently falling back would be misleading.
 * - venue / web / music / kidz games: the badge lives in its own
 *   games/{gameSlug}/ folder. If the canonical Storage object isn't found,
 *   we fall back to the default badge for that badge type instead of
 *   failing the whole import.
 */
async function ensureBadgeRegistered(
  gameSlug: string,
  gameTitle: string,
  gameType: string,
  badgeSlug: string,
  badgeType: BadgeType
): Promise<string> {
  if (!gameSlug || !badgeSlug) {
    return badgeSlug
  }

  const isSharedStateBadge = SHARED_BADGE_GAME_TYPES.has(gameType)

  const { data: existingBadge, error: existingBadgeError } = await supabaseAdmin
    .from('badges')
    .select('badge_id, slug, badge_type, image_url, active')
    .eq('slug', badgeSlug)
    .maybeSingle()

  if (existingBadgeError) {
    throw new Error(`Unable to check badge "${badgeSlug}": ${existingBadgeError.message}`)
  }

  if (existingBadge) {
    if (existingBadge.active !== true) {
      throw new Error(`Badge "${badgeSlug}" exists but is inactive.`)
    }

    if (existingBadge.badge_type !== badgeType) {
      throw new Error(
        `Badge "${badgeSlug}" has badge_type "${existingBadge.badge_type}", expected "${badgeType}".`
      )
    }

    if (!existingBadge.image_url) {
      throw new Error(`Badge "${badgeSlug}" exists but has no image URL.`)
    }

    // Already registered (e.g. a previous state game already registered
    // this shared badge) — nothing further to do.
    return badgeSlug
  }

  const fileName = `${badgeSlug}.png`
  const folder = isSharedStateBadge ? SHARED_BADGE_FOLDER : `games/${gameSlug}`
  const objectPath = `${folder}/${fileName}`

  const { data: objects, error: storageError } = await supabaseAdmin.storage
    .from('badges')
    .list(folder, {
      limit: 100,
      search: fileName,
    })

  if (storageError) {
    throw new Error(
      `Unable to check badge Storage object "${objectPath}": ${storageError.message}`
    )
  }

  const storageObject = objects?.find(object => object.name === fileName)

  if (!storageObject) {
    if (isSharedStateBadge) {
      // Every game for this state depends on this one shared badge —
      // missing it is a real gap, not something to quietly paper over.
      throw new Error(
        `Shared state badge "${badgeSlug}" was not found at canonical Storage object "${objectPath}". ` +
        `Upload the shared state badge PNG to games/states/ before importing any game for this state.`
      )
    }

    // Non-community games: a missing badge shouldn't block the import —
    // fall back to the default badge for this badge type instead.
    return DEFAULT_BADGE_SLUGS[badgeType]
  }

  const { data: publicUrlData } = supabaseAdmin.storage
    .from('badges')
    .getPublicUrl(objectPath)

  const imageUrl = publicUrlData.publicUrl

  if (!imageUrl) {
    throw new Error(`Unable to create public URL for badge "${badgeSlug}".`)
  }

  const badgeLabel =
    badgeType === 'completed'
      ? 'Completion Badge'
      : 'Perfect Score Badge'

  const altText =
    badgeType === 'completed'
      ? `${gameTitle} completion badge`
      : `${gameTitle} perfect score badge`

  const description =
    badgeType === 'completed'
      ? isSharedStateBadge
        ? `Awarded for completing any ${gameTitle} History Hunt game.`
        : `Awarded for completing the ${gameTitle}.`
      : `Awarded for earning a perfect score on the ${gameTitle}.`

  const { error: insertError } = await supabaseAdmin
    .from('badges')
    .insert({
      slug: badgeSlug,
      title: `${gameTitle} ${badgeLabel}`,
      description,
      badge_type: badgeType,
      image_url: imageUrl,
      active: true,
      alt_text: altText,
      is_default: false,
    })

  if (insertError && insertError.code !== '23505') {
    throw new Error(`Unable to register badge "${badgeSlug}": ${insertError.message}`)
  }

  // Re-read after insert / concurrent insert so validation is deterministic.
  const { data: registeredBadge, error: registeredBadgeError } = await supabaseAdmin
    .from('badges')
    .select('badge_id, slug, badge_type, image_url, active')
    .eq('slug', badgeSlug)
    .maybeSingle()

  if (registeredBadgeError || !registeredBadge) {
    throw new Error(
      `Badge "${badgeSlug}" could not be verified after registration.`
    )
  }

  if (
    registeredBadge.active !== true ||
    registeredBadge.badge_type !== badgeType ||
    !registeredBadge.image_url
  ) {
    throw new Error(
      `Badge "${badgeSlug}" failed validation after registration.`
    )
  }

  return badgeSlug
}

function isAuthorized(request: NextRequest) {
  const expectedToken = process.env.ADMIN_IMPORT_TOKEN

  if (!expectedToken) {
    return false
  }

  const providedToken = request.headers.get('x-admin-import-token')

  return Boolean(providedToken) && providedToken === expectedToken
}

export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json(
      { error: 'Unauthorized.' },
      { status: 401 }
    )
  }

  let input: ImportWorkbookInput

  try {
    input = await request.json()
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON request body.' },
      { status: 400 }
    )
  }

  try {
    const payload = buildImportPreviewPayload(input)

    const gameSlug = String(payload.huntInfo.game_slug || '')
    const gameTitle = String(payload.huntInfo.title || 'History Hunt')
    const gameType = String(payload.huntInfo.game_type || '')
    const completionBadgeSlug = String(payload.huntInfo.completion_badge_slug || '')
    const perfectBadgeSlug = String(payload.huntInfo.perfect_score_badge_slug || '')

    // Explicit game-specific badge slugs may be auto-registered from their
    // canonical Storage objects. Blank badge fields continue to use the
    // default badges inside import_engineering_workbook. "community"
    // (state/territory) games use a shared per-state badge and skip
    // per-game Storage verification once registered; venue/web/music/kidz
    // games fall back to the default badge set if their badge is missing,
    // rather than failing the import. ensureBadgeRegistered() returns the
    // slug that should actually be written to the game record, which may
    // differ from the input slug if a fallback badge was used.
    if (completionBadgeSlug) {
      payload.huntInfo.completion_badge_slug = await ensureBadgeRegistered(
        gameSlug,
        gameTitle,
        gameType,
        completionBadgeSlug,
        'completed'
      )
    }

    if (perfectBadgeSlug) {
      payload.huntInfo.perfect_score_badge_slug = await ensureBadgeRegistered(
        gameSlug,
        gameTitle,
        gameType,
        perfectBadgeSlug,
        'perfect_score'
      )
    }

    const { data, error } = await supabaseAdmin.rpc('import_engineering_workbook', {
      payload,
    })

    if (error) {
      const missingRpc =
        error.message?.includes('import_engineering_workbook') ||
        error.code === 'PGRST202'

      return NextResponse.json(
        {
          error: missingRpc
            ? 'Database RPC import_engineering_workbook is not installed.'
            : error.message || 'Import failed.',
        },
        { status: 500 }
      )
    }

    return NextResponse.json(normalizeRpcResult(data, payload))
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unable to run atomic game import.'

    return NextResponse.json(
      { error: message },
      { status: 400 }
    )
  }
}
