import { NextRequest, NextResponse } from 'next/server'

import { supabaseAdmin } from '@/lib/supabase/admin'

export const runtime = 'nodejs'

type GameRow = {
  game_id: string
  campaign_id: string | null
  slug: string | null
  title: string | null
  status: string | null
  active: boolean | null
  starts_at: string | null
  ends_at: string | null
  registration_required: boolean | null
  allow_anonymous_players: boolean | null
  question_count: number | null
  total_points: number | null
  participant_badge_url: string | null
  perfect_score_badge_url: string | null
  public_play_url: string | null
  share_url: string | null
  share_title: string | null
  share_text: string | null
  badge_share_enabled: boolean | null
  badge_download_enabled: boolean | null
  created_at: string | null
  updated_at: string | null
}

type CampaignRow = {
  campaign_id: string
  slug: string | null
  title: string | null
  active: boolean | null
}

type VenueRow = {
  venue_id: string
  campaign_id: string | null
  slug: string | null
  name: string | null
  qr_slug: string | null
  active: boolean | null
  quiz_enabled: boolean | null
  start_at: string | null
  end_at: string | null
}

type QuestionRow = {
  question_id: string
  game_id: string | null
  points: number | null
  active: boolean | null
  import_batch_id: string | null
}

type ImportBatchRow = {
  import_batch_id: string
  batch_number: string | null
  workbook_name: string | null
  workbook_version: string | null
  importer_version: string | null
  review_status: string | null
  import_status: string | null
  status: string | null
  game_slug: string | null
  created_at: string | null
}

function isAuthorized(request: NextRequest) {
  const expectedToken = process.env.ADMIN_IMPORT_TOKEN

  if (!expectedToken) return false

  const providedToken =
    request.headers.get('x-admin-token') ||
    request.headers.get('x-admin-import-token')

  return Boolean(providedToken) && providedToken === expectedToken
}

function asArray<T>(value: T[] | null) {
  return Array.isArray(value) ? value : []
}

function firstValidDate(...values: Array<string | null | undefined>) {
  for (const value of values) {
    if (!value) continue
    const date = new Date(value)
    if (!Number.isNaN(date.getTime())) return date
  }

  return null
}

function formatDuration(ms: number) {
  const totalMinutes = Math.max(0, Math.ceil(ms / 60000))
  const days = Math.floor(totalMinutes / 1440)
  const hours = Math.floor((totalMinutes % 1440) / 60)
  const minutes = totalMinutes % 60

  if (days > 0) return `${days}d ${hours}h ${minutes}m`
  if (hours > 0) return `${hours}h ${minutes}m`
  return `${minutes}m`
}

function evaluatePlayableNow(game: GameRow, venue: VenueRow | null, questionCount: number) {
  if (!venue) {
    return {
      playableNow: false,
      reasonNotPlayable: 'No venue / QR slug linked to this campaign.',
    }
  }

  if (!venue.qr_slug) {
    return {
      playableNow: false,
      reasonNotPlayable: 'Venue has no QR slug.',
    }
  }

  if (venue.active === false) {
    return {
      playableNow: false,
      reasonNotPlayable: 'Venue is inactive.',
    }
  }

  if (venue.quiz_enabled === false) {
    return {
      playableNow: false,
      reasonNotPlayable: 'Venue quiz is disabled.',
    }
  }

  if (game.active === false) {
    return {
      playableNow: false,
      reasonNotPlayable: 'Game is inactive.',
    }
  }

  if (questionCount <= 0) {
    return {
      playableNow: false,
      reasonNotPlayable: 'No active questions imported.',
    }
  }

  const status = (game.status || '').toLowerCase()
  if (status === 'draft') {
    return {
      playableNow: false,
      reasonNotPlayable: 'Game status is draft.',
    }
  }

  if (status === 'completed') {
    return {
      playableNow: false,
      reasonNotPlayable: 'Game status is completed.',
    }
  }

  if (status === 'archived') {
    return {
      playableNow: false,
      reasonNotPlayable: 'Game status is archived.',
    }
  }

  const now = Date.now()
  const startDate = firstValidDate(game.starts_at, venue.start_at)
  const endDate = firstValidDate(game.ends_at, venue.end_at)

  if (startDate && startDate.getTime() > now) {
    return {
      playableNow: false,
      reasonNotPlayable: `Starts in ${formatDuration(startDate.getTime() - now)}.`,
    }
  }

  if (endDate && endDate.getTime() < now) {
    return {
      playableNow: false,
      reasonNotPlayable: 'Game ended.',
    }
  }

  if (status === 'scheduled') {
    return {
      playableNow: false,
      reasonNotPlayable: 'Game status is scheduled.',
    }
  }

  if (status === 'countdown') {
    return {
      playableNow: false,
      reasonNotPlayable: 'Game status is countdown.',
    }
  }

  if (status && status !== 'active') {
    return {
      playableNow: false,
      reasonNotPlayable: `Game status is ${status}.`,
    }
  }

  return {
    playableNow: true,
    reasonNotPlayable: '',
  }
}

function sortByCreatedAtDesc(a: ImportBatchRow, b: ImportBatchRow) {
  const aTime = a.created_at ? new Date(a.created_at).getTime() : 0
  const bTime = b.created_at ? new Date(b.created_at).getTime() : 0
  return bTime - aTime
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json(
      { error: 'Unauthorized.' },
      { status: 401 }
    )
  }

  const [
    gamesResult,
    campaignsResult,
    venuesResult,
    questionsResult,
    importBatchesResult,
  ] = await Promise.all([
    supabaseAdmin
      .from('games')
      .select('game_id, campaign_id, slug, title, status, active, starts_at, ends_at, registration_required, allow_anonymous_players, question_count, total_points, participant_badge_url, perfect_score_badge_url, public_play_url, share_url, share_title, share_text, badge_share_enabled, badge_download_enabled, created_at, updated_at')
      .order('created_at', { ascending: false }),

    supabaseAdmin
      .from('campaigns')
      .select('campaign_id, slug, title, active'),

    supabaseAdmin
      .from('venues')
      .select('venue_id, campaign_id, slug, name, qr_slug, active, quiz_enabled, start_at, end_at'),

    supabaseAdmin
      .from('questions')
      .select('question_id, game_id, points, active, import_batch_id'),

    supabaseAdmin
      .from('import_batches')
      .select('import_batch_id, batch_number, workbook_name, workbook_version, importer_version, review_status, import_status, status, game_slug, created_at'),
  ])

  const firstError =
    gamesResult.error ||
    campaignsResult.error ||
    venuesResult.error ||
    questionsResult.error ||
    importBatchesResult.error

  if (firstError) {
    return NextResponse.json(
      { error: firstError.message },
      { status: 500 }
    )
  }

  const games = asArray(gamesResult.data as GameRow[] | null)
  const campaigns = asArray(campaignsResult.data as CampaignRow[] | null)
  const venues = asArray(venuesResult.data as VenueRow[] | null)
  const questions = asArray(questionsResult.data as QuestionRow[] | null)
  const importBatches = asArray(importBatchesResult.data as ImportBatchRow[] | null)

  const campaignById = new Map(campaigns.map(campaign => [campaign.campaign_id, campaign]))
  const importBatchById = new Map(importBatches.map(batch => [batch.import_batch_id, batch]))

  const venuesByCampaignId = new Map<string, VenueRow[]>()
  for (const venue of venues) {
    if (!venue.campaign_id) continue
    const existing = venuesByCampaignId.get(venue.campaign_id) || []
    existing.push(venue)
    venuesByCampaignId.set(venue.campaign_id, existing)
  }

  const questionsByGameId = new Map<string, QuestionRow[]>()
  for (const question of questions) {
    if (!question.game_id) continue
    const existing = questionsByGameId.get(question.game_id) || []
    existing.push(question)
    questionsByGameId.set(question.game_id, existing)
  }

  const playBaseUrl =
    process.env.NEXT_PUBLIC_PLAY_BASE_URL ||
    'https://play.historyhuntgames.com'

  const rows = games.map(game => {
    const campaign = game.campaign_id ? campaignById.get(game.campaign_id) || null : null
    const campaignVenues = game.campaign_id ? venuesByCampaignId.get(game.campaign_id) || [] : []
    const venue =
      campaignVenues.find(item => item.active !== false && Boolean(item.qr_slug)) ||
      campaignVenues.find(item => Boolean(item.qr_slug)) ||
      campaignVenues[0] ||
      null

    const gameQuestions = questionsByGameId.get(game.game_id) || []
    const activeQuestions = gameQuestions.filter(question => question.active !== false)
    const questionCount = activeQuestions.length
    const totalPoints = activeQuestions.reduce(
      (sum, question) => sum + Number(question.points || 0),
      0
    )

    const importBatchIds = Array.from(
      new Set(
        activeQuestions
          .map(question => question.import_batch_id)
          .filter((value): value is string => Boolean(value))
      )
    )

    const questionLinkedBatches = importBatchIds
      .map(id => importBatchById.get(id))
      .filter((value): value is ImportBatchRow => Boolean(value))
      .sort(sortByCreatedAtDesc)

    const slugLinkedBatches = importBatches
      .filter(batch => batch.game_slug === game.slug)
      .sort(sortByCreatedAtDesc)

    const latestImportBatch = questionLinkedBatches[0] || slugLinkedBatches[0] || null

    const publicPlayUrl =
      game.public_play_url ||
      (venue?.qr_slug ? `${playBaseUrl.replace(/\/$/, '')}/play/${venue.qr_slug}` : '')

    const hasBadgeConfig = Boolean(
      game.participant_badge_url ||
      game.perfect_score_badge_url ||
      game.badge_download_enabled ||
      game.badge_share_enabled
    )

    const hasShareUrl = Boolean(
      game.share_url ||
      game.public_play_url ||
      publicPlayUrl
    )

    const playable = evaluatePlayableNow(game, venue, questionCount)

    return {
      gameId: game.game_id,
      title: game.title || '',
      gameSlug: game.slug || '',
      qrSlug: venue?.qr_slug || '',
      publicPlayUrl,
      status: game.status || '',
      active: Boolean(game.active),
      campaignTitle: campaign?.title || '',
      campaignSlug: campaign?.slug || '',
      venueName: venue?.name || '',
      registrationRequired: Boolean(game.registration_required),
      allowAnonymousPlayers: game.allow_anonymous_players !== false,
      startsAt: game.starts_at || venue?.start_at || null,
      endsAt: game.ends_at || venue?.end_at || null,
      questionCount,
      totalPoints,
      createdAt: game.created_at,
      updatedAt: game.updated_at,
      latestImportBatchNumber: latestImportBatch?.batch_number || '',
      workbookName: latestImportBatch?.workbook_name || '',
      workbookVersion: latestImportBatch?.workbook_version || '',
      importerVersion: latestImportBatch?.importer_version || '',
      reviewStatus: latestImportBatch?.review_status || '',
      importStatus: latestImportBatch?.import_status || latestImportBatch?.status || '',
      hasQuestions: questionCount > 0,
      hasBadgeConfig,
      hasShareUrl,
      playableNow: playable.playableNow,
      reasonNotPlayable: playable.reasonNotPlayable,
    }
  })

  return NextResponse.json({
    generatedAt: new Date().toISOString(),
    summary: {
      gameCount: rows.length,
      playableCount: rows.filter(row => row.playableNow).length,
      activeCount: rows.filter(row => row.active).length,
      draftCount: rows.filter(row => row.status === 'draft').length,
      scheduledCount: rows.filter(row => row.status === 'scheduled').length,
      archivedCount: rows.filter(row => row.status === 'archived').length,
    },
    games: rows,
  })
}
