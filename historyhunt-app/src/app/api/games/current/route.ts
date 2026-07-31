import { NextResponse } from 'next/server'

import { evaluatePlayableNow } from '@/lib/games/playability'
import { supabaseAdmin } from '@/lib/supabase/admin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type GameRow = {
  game_id: string
  campaign_id: string | null
  slug: string | null
  title: string | null
  game_type: string | null
  public_play_url: string | null
  status: string | null
  active: boolean | null
  starts_at: string | null
  ends_at: string | null
}

type VenueRow = {
  venue_id: string
  campaign_id: string | null
  name: string | null
  qr_slug: string | null
  active: boolean | null
  quiz_enabled: boolean | null
  start_at: string | null
  end_at: string | null
}

type QuestionRow = {
  game_id: string | null
  active: boolean | null
}

function asArray<T>(value: T[] | null) {
  return Array.isArray(value) ? value : []
}

const ALLOWED_ORIGINS = new Set([
  'https://historyhuntgames.com',
  'https://www.historyhuntgames.com',
])

const NON_VENUE_GAME_TYPES = new Set([
  'web',
  'music',
  'community',
  'kidz',
])

function corsHeaders(request: Request) {
  const origin = request.headers.get('origin') || ''

  return {
    'Access-Control-Allow-Origin': ALLOWED_ORIGINS.has(origin) ? origin : '',
    Vary: 'Origin',
    'Cache-Control': 'no-store',
  }
}

function isValidDateWindow(
  startsAt: string | null,
  endsAt: string | null,
  nowMs: number
) {
  if (startsAt) {
    const startMs = Date.parse(startsAt)
    if (!Number.isFinite(startMs) || nowMs < startMs) return false
  }

  if (endsAt) {
    const endMs = Date.parse(endsAt)
    if (!Number.isFinite(endMs) || nowMs > endMs) return false
  }

  return true
}

function isNonVenueGamePlayableNow(
  game: GameRow,
  questionCount: number,
  nowMs: number
) {
  const status = (game.status || '').trim().toLowerCase()

  return (
    game.active === true &&
    status === 'active' &&
    Boolean(game.slug?.trim()) &&
    questionCount > 0 &&
    isValidDateWindow(game.starts_at, game.ends_at, nowMs)
  )
}

export async function GET(request: Request) {
  const [gamesResult, venuesResult, questionsResult] = await Promise.all([
    supabaseAdmin
      .from('games')
      .select(
        'game_id, campaign_id, slug, title, game_type, public_play_url, status, active, starts_at, ends_at'
      )
      .order('created_at', { ascending: false }),

    supabaseAdmin
      .from('venues')
      .select(
        'venue_id, campaign_id, name, qr_slug, active, quiz_enabled, start_at, end_at'
      ),

    supabaseAdmin
      .from('questions')
      .select('game_id, active'),
  ])

  const firstError =
    gamesResult.error ||
    venuesResult.error ||
    questionsResult.error

  if (firstError) {
    console.error('Current games API error:', firstError)

    return NextResponse.json(
      { error: 'Unable to load current games.' },
      { status: 500 }
    )
  }

  const games = asArray(gamesResult.data as GameRow[] | null)
  const venues = asArray(venuesResult.data as VenueRow[] | null)
  const questions = asArray(questionsResult.data as QuestionRow[] | null)

  const venueByQrSlug = new Map<string, VenueRow>()

  for (const venue of venues) {
    const qrSlug = venue.qr_slug?.trim()
    if (!qrSlug) continue
    venueByQrSlug.set(qrSlug, venue)
  }

  const questionCountByGameId = new Map<string, number>()

  for (const question of questions) {
    if (!question.game_id || question.active === false) continue

    questionCountByGameId.set(
      question.game_id,
      (questionCountByGameId.get(question.game_id) || 0) + 1
    )
  }

  const nowMs = Date.now()

  const currentGames = games.flatMap(game => {
    const gameSlug = game.slug?.trim() || ''
    const gameType = game.game_type?.trim().toLowerCase() || ''

    if (!gameSlug) return []

    const questionCount = questionCountByGameId.get(game.game_id) || 0
    const venue =
      gameType === 'venue'
        ? venueByQrSlug.get(gameSlug) || null
        : null

    let playableNow = false

    if (gameType === 'venue') {
      playableNow = evaluatePlayableNow(
        game,
        venue,
        questionCount
      ).playableNow
    } else if (NON_VENUE_GAME_TYPES.has(gameType)) {
      playableNow = isNonVenueGamePlayableNow(
        game,
        questionCount,
        nowMs
      )
    }

    if (!playableNow) return []

    // Only venue games require a matching venue / QR record.
    if (gameType === 'venue' && !venue?.qr_slug) return []

    return [{
      title: game.title || '',
      gameSlug,
      gameType,
      qrSlug: gameSlug,
      venueName: gameType === 'venue' ? venue?.name || '' : '',
      publicPlayUrl:
        `https://play.historyhuntgames.com/play/${encodeURIComponent(gameSlug)}`,
      startsAt:
        game.starts_at ||
        (gameType === 'venue' ? venue?.start_at || null : null),
      endsAt:
        game.ends_at ||
        (gameType === 'venue' ? venue?.end_at || null : null),
    }]
  })

  return NextResponse.json(
    {
      generatedAt: new Date().toISOString(),
      count: currentGames.length,
      games: currentGames,
    },
    {
      headers: corsHeaders(request),
    }
  )
}