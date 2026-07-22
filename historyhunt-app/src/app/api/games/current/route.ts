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

function corsHeaders(request: Request) {
  const origin = request.headers.get('origin') || ''

  return {
    'Access-Control-Allow-Origin': ALLOWED_ORIGINS.has(origin) ? origin : '',
    'Vary': 'Origin',
    'Cache-Control': 'no-store',
  }
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
    if (!venue.qr_slug) continue
    venueByQrSlug.set(venue.qr_slug, venue)
  }

  const questionCountByGameId = new Map<string, number>()

  for (const question of questions) {
    if (!question.game_id || question.active === false) continue

    questionCountByGameId.set(
      question.game_id,
      (questionCountByGameId.get(question.game_id) || 0) + 1
    )
  }

  const currentGames = games.flatMap(game => {
    const publicPlayQrSlug = game.public_play_url
      ? game.public_play_url.split('/').filter(Boolean).pop() || ''
      : ''

    const qrSlug = publicPlayQrSlug || game.slug || ''
    const venue = qrSlug ? venueByQrSlug.get(qrSlug) || null : null

    const questionCount = questionCountByGameId.get(game.game_id) || 0
    const playable = evaluatePlayableNow(game, venue, questionCount)

    if (!playable.playableNow || !venue?.qr_slug) {
      return []
    }

    return [{
      title: game.title || '',
      gameSlug: game.slug || '',
      gameType: game.game_type || '',
      qrSlug,
      venueName: venue.name || '',
      publicPlayUrl:
        `https://play.historyhuntgames.com/play/${encodeURIComponent(qrSlug)}`,
      startsAt: game.starts_at || venue.start_at || null,
      endsAt: game.ends_at || venue.end_at || null,
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
