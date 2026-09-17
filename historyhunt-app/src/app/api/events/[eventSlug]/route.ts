import { NextResponse } from 'next/server'

import { supabaseAdmin } from '@/lib/supabase/admin'
import type { EventGame, EventLeaderboardEntry } from '@/lib/events/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function gameStatus(game: Record<string, unknown>): EventGame['status'] {
  const now = Date.now()
  const status = String(game.status || '')
  const startsAt = game.starts_at ? Date.parse(String(game.starts_at)) : null
  const endsAt = game.ends_at ? Date.parse(String(game.ends_at)) : null

  if (status === 'draft' || status === 'archived' || game.active !== true) return 'unavailable'
  if (startsAt && now < startsAt) return 'upcoming'
  if (endsAt && now > endsAt) return 'ended'
  return 'available'
}

type SessionRow = {
  player_id: string
  game_id: string
  score: number | null
  total_points: number | null
  completed_at: string | null
  display_name: string
}

function buildLeaderboard(rows: SessionRow[]): EventLeaderboardEntry[] {
  const bestByPlayerGame = new Map<string, SessionRow>()

  for (const row of rows) {
    if (!row.display_name.trim()) continue

    const key = `${row.player_id}:${row.game_id}`
    const current = bestByPlayerGame.get(key)
    const rowScore = Number(row.score || 0)
    const currentScore = Number(current?.score || 0)

    if (
      !current ||
      rowScore > currentScore ||
      (rowScore === currentScore && String(row.completed_at || '') < String(current.completed_at || ''))
    ) {
      bestByPlayerGame.set(key, row)
    }
  }

  const totals = new Map<string, EventLeaderboardEntry & { lastCompletion: string }>()
  for (const row of bestByPlayerGame.values()) {
    const current = totals.get(row.player_id) || {
      rank: 0,
      displayName: row.display_name,
      totalScore: 0,
      gamesCompleted: 0,
      possiblePoints: 0,
      lastCompletion: '',
    }
    current.totalScore += Number(row.score || 0)
    current.possiblePoints += Number(row.total_points || 0)
    current.gamesCompleted += 1
    if (String(row.completed_at || '') > current.lastCompletion) {
      current.lastCompletion = String(row.completed_at || '')
    }
    totals.set(row.player_id, current)
  }

  return [...totals.values()]
    .sort((a, b) =>
      b.totalScore - a.totalScore ||
      b.gamesCompleted - a.gamesCompleted ||
      a.lastCompletion.localeCompare(b.lastCompletion) ||
      a.displayName.localeCompare(b.displayName)
    )
    .slice(0, 50)
    .map((entry, index) => ({
      rank: index + 1,
      displayName: entry.displayName,
      totalScore: entry.totalScore,
      gamesCompleted: entry.gamesCompleted,
      possiblePoints: entry.possiblePoints,
    }))
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ eventSlug: string }> }
) {
  const { eventSlug } = await params

  const { data: campaign, error: campaignError } = await supabaseAdmin
    .from('campaigns')
    .select('campaign_id, slug, title, description, active, event_enabled, event_type, event_visibility, event_subtitle, event_short_description, event_welcome_title, event_welcome_message, event_welcome_note, event_hero_image_url, event_logo_image_url, event_primary_color, event_secondary_color, event_accent_color, event_leaderboard_enabled')
    .eq('slug', eventSlug)
    .eq('active', true)
    .eq('event_enabled', true)
    .maybeSingle()

  if (campaignError || !campaign || campaign.event_visibility === 'private') {
    return NextResponse.json({ error: 'Event not found.' }, { status: 404 })
  }

  const { data: gameRows, error: gamesError } = await supabaseAdmin
    .from('games')
    .select('game_id, slug, title, description, question_count, total_points, event_display_order, status, starts_at, ends_at, active')
    .eq('campaign_id', campaign.campaign_id)
    .eq('active', true)
    .not('status', 'in', '(draft,archived)')
    .order('event_display_order', { ascending: true, nullsFirst: false })
    .order('title', { ascending: true })

  if (gamesError) {
    return NextResponse.json({ error: 'Unable to load event games.' }, { status: 500 })
  }

  const games: EventGame[] = (gameRows || []).map(row => ({
    gameId: String(row.game_id),
    slug: String(row.slug),
    title: String(row.title || ''),
    description: String(row.description || ''),
    questionCount: Number(row.question_count || 0),
    totalPoints: Number(row.total_points || 0),
    displayOrder: row.event_display_order == null ? null : Number(row.event_display_order),
    status: gameStatus(row as Record<string, unknown>),
    startsAt: row.starts_at ? String(row.starts_at) : null,
    endsAt: row.ends_at ? String(row.ends_at) : null,
    playUrl: `/play/${encodeURIComponent(String(row.slug))}`,
  }))

  let leaderboard: EventLeaderboardEntry[] = []
  if (campaign.event_leaderboard_enabled && games.length > 0) {
    const { data: preferences, error: preferencesError } = await supabaseAdmin
      .from('event_player_preferences')
      .select('player_id')
      .eq('campaign_id', campaign.campaign_id)
      .eq('leaderboard_opt_in', true)

    if (preferencesError) {
      return NextResponse.json({ error: 'Unable to load the event leaderboard.' }, { status: 500 })
    }

    const optedInPlayerIds = (preferences || []).map(row => String(row.player_id))

    const { data: players, error: playersError } = optedInPlayerIds.length > 0
      ? await supabaseAdmin
          .from('players')
          .select('player_id, display_name')
          .in('player_id', optedInPlayerIds)
          .not('display_name', 'is', null)
      : { data: [], error: null }

    if (playersError) {
      return NextResponse.json({ error: 'Unable to load the event leaderboard.' }, { status: 500 })
    }

    const displayNames = new Map(
      (players || []).map(row => [String(row.player_id), String(row.display_name || '')])
    )
    const publicPlayerIds = [...displayNames.keys()]

    const { data: sessions, error: leaderboardError } = publicPlayerIds.length > 0
      ? await supabaseAdmin
      .from('sessions')
      .select('player_id, game_id, score, total_points, completed_at')
      .eq('campaign_id', campaign.campaign_id)
      .eq('completed', true)
      .in('player_id', publicPlayerIds)
      : { data: [], error: null }

    if (leaderboardError) {
      return NextResponse.json({ error: 'Unable to load the event leaderboard.' }, { status: 500 })
    }
    leaderboard = buildLeaderboard((sessions || []).map(row => ({
      ...row,
      display_name: displayNames.get(String(row.player_id)) || '',
    })) as SessionRow[])
  }

  return NextResponse.json({
    event: {
      campaignId: String(campaign.campaign_id),
      slug: String(campaign.slug),
      title: String(campaign.title || ''),
      subtitle: String(campaign.event_subtitle || ''),
      description: String(campaign.event_short_description || campaign.description || ''),
      welcomeTitle: String(campaign.event_welcome_title || ''),
      welcomeMessage: String(campaign.event_welcome_message || ''),
      welcomeNote: String(campaign.event_welcome_note || ''),
      eventType: String(campaign.event_type || 'custom'),
      heroImageUrl: String(campaign.event_hero_image_url || ''),
      logoImageUrl: String(campaign.event_logo_image_url || ''),
      primaryColor: String(campaign.event_primary_color || '#172554'),
      secondaryColor: String(campaign.event_secondary_color || '#f1f5f9'),
      accentColor: String(campaign.event_accent_color || '#b91c1c'),
      leaderboardEnabled: Boolean(campaign.event_leaderboard_enabled),
    },
    games,
    leaderboard,
  })
}
