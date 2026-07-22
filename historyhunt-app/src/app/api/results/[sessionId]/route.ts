import { createHash, timingSafeEqual } from 'crypto'

import { NextResponse } from 'next/server'

import { supabaseAdmin } from '@/lib/supabase/admin'

export const runtime = 'nodejs'

function hashSessionAccessToken(token: string) {
  return createHash('sha256').update(token).digest('hex')
}

function sessionAccessTokenMatches(token: string, storedHash: string) {
  const providedHash = Buffer.from(hashSessionAccessToken(token), 'hex')
  const expectedHash = Buffer.from(storedHash, 'hex')

  return (
    providedHash.length === expectedHash.length &&
    timingSafeEqual(providedHash, expectedHash)
  )
}

function sanitizeSession(session: Record<string, unknown>) {
  return {
    session_id: String(session.session_id || ''),
    score: Number(session.score || 0),
    total_points: Number(session.total_points || 0),
    completed: Boolean(session.completed),
    completed_at: session.completed_at ? String(session.completed_at) : null,
  }
}

function sanitizePlayer(player: Record<string, unknown> | null) {
  if (!player) return null

  return {
    first_name: player.first_name ? String(player.first_name) : '',
  }
}

function sanitizeBadge(badge: Record<string, unknown> | null) {
  if (!badge) return null

  return {
    badge_id: String(badge.badge_id || ''),
    slug: String(badge.slug || ''),
    title: String(badge.title || ''),
    badge_type: String(badge.badge_type || ''),
    image_url: badge.image_url ? String(badge.image_url) : '',
    alt_text: badge.alt_text ? String(badge.alt_text) : '',
    active: badge.active !== false,
  }
}

function sanitizeGame(game: Record<string, unknown> | null) {
  if (!game) return null

  return {
    game_id: String(game.game_id || ''),
    slug: String(game.slug || ''),
    title: String(game.title || ''),
    completion_badge_id: game.completion_badge_id ? String(game.completion_badge_id) : '',
    perfect_score_badge_id: game.perfect_score_badge_id ? String(game.perfect_score_badge_id) : '',
    participant_badge_url: game.participant_badge_url ? String(game.participant_badge_url) : '',
    perfect_score_badge_url: game.perfect_score_badge_url ? String(game.perfect_score_badge_url) : '',
    share_url: game.share_url ? String(game.share_url) : '',
    public_play_url: game.public_play_url ? String(game.public_play_url) : '',
    share_title: game.share_title ? String(game.share_title) : '',
    share_text: game.share_text ? String(game.share_text) : '',
    badge_share_enabled: game.badge_share_enabled !== false,
    badge_download_enabled: game.badge_download_enabled !== false,
    results_cta_enabled: game.results_cta_enabled === true,
    results_cta_type: game.results_cta_type ? String(game.results_cta_type) : '',
    results_cta_label: game.results_cta_label ? String(game.results_cta_label) : '',
    results_cta_url: game.results_cta_url ? String(game.results_cta_url) : '',
    results_cta_note: game.results_cta_note ? String(game.results_cta_note) : '',
  }
}

function sanitizeVenue(venue: Record<string, unknown> | null) {
  if (!venue) return null

  return {
    venue_id: String(venue.venue_id || ''),
    name: String(venue.name || ''),
    city: venue.city ? String(venue.city) : '',
    state: venue.state ? String(venue.state) : '',
    qr_slug: String(venue.qr_slug || ''),
  }
}

function sanitizeCampaign(campaign: Record<string, unknown> | null) {
  if (!campaign) return null

  return {
    campaign_id: String(campaign.campaign_id || ''),
    slug: String(campaign.slug || ''),
    title: String(campaign.title || ''),
  }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await params
  const sessionAccessToken = String(
    request.headers.get('x-session-access-token') || ''
  ).trim()

  if (!sessionAccessToken) {
    return NextResponse.json(
      { error: 'Session authorization is required.' },
      { status: 401 }
    )
  }

  const { data: sessionData, error: sessionError } = await supabaseAdmin
    .from('sessions')
    .select('session_id, player_id, campaign_id, venue_id, game_id, score, total_points, completed, completed_at, session_access_token_hash')
    .eq('session_id', sessionId)
    .maybeSingle()

  if (sessionError || !sessionData) {
    return NextResponse.json(
      { error: 'Results not found.' },
      { status: 404 }
    )
  }

  const storedTokenHash = String(sessionData.session_access_token_hash || '')

  if (!storedTokenHash || !sessionAccessTokenMatches(sessionAccessToken, storedTokenHash)) {
    return NextResponse.json(
      { error: 'Invalid session authorization.' },
      { status: 401 }
    )
  }

  if (!sessionData.completed) {
    return NextResponse.json(
      { error: 'Results are not available until the hunt is completed.' },
      { status: 409 }
    )
  }

  const [
    { data: playerData },
    { data: gameData },
    { data: venueData },
    { data: campaignData },
  ] = await Promise.all([
    sessionData.player_id
      ? supabaseAdmin
          .from('players')
          .select('first_name')
          .eq('player_id', sessionData.player_id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    supabaseAdmin
      .from('games')
      .select(
        'game_id, slug, title, completion_badge_id, perfect_score_badge_id, participant_badge_url, perfect_score_badge_url, share_url, public_play_url, share_title, share_text, badge_share_enabled, badge_download_enabled, results_cta_enabled, results_cta_type, results_cta_label, results_cta_url, results_cta_note'
      )
      .eq('game_id', sessionData.game_id)
      .maybeSingle(),
    sessionData.venue_id
      ? supabaseAdmin
          .from('venues')
          .select('venue_id, name, city, state, qr_slug')
          .eq('venue_id', sessionData.venue_id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    sessionData.campaign_id
      ? supabaseAdmin
          .from('campaigns')
          .select('campaign_id, slug, title')
          .eq('campaign_id', sessionData.campaign_id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ])

  const game = sanitizeGame(gameData as Record<string, unknown> | null)

  if (!game) {
    return NextResponse.json(
      { error: 'Game not found for this result.' },
      { status: 404 }
    )
  }

  const badgeIds = [
    game.completion_badge_id,
    game.perfect_score_badge_id,
  ].filter(Boolean)

  let completionBadge = null
  let perfectScoreBadge = null

  if (badgeIds.length > 0) {
    const { data: badgeRows, error: badgeError } = await supabaseAdmin
      .from('badges')
      .select('badge_id, slug, title, badge_type, image_url, alt_text, active')
      .in('badge_id', badgeIds)

    if (badgeError) {
      return NextResponse.json(
        { error: 'Unable to load badge data for this result.' },
        { status: 500 }
      )
    }

    const badges = (badgeRows || []).map(row =>
      sanitizeBadge(row as Record<string, unknown>)
    )

    completionBadge =
      badges.find(badge => badge?.badge_id === game.completion_badge_id) || null

    perfectScoreBadge =
      badges.find(badge => badge?.badge_id === game.perfect_score_badge_id) || null
  }

  return NextResponse.json({
    session: sanitizeSession(sessionData as Record<string, unknown>),
    player: sanitizePlayer(playerData as Record<string, unknown> | null),
    game,
    badges: {
      completion: completionBadge,
      perfect_score: perfectScoreBadge,
    },
    venue: sanitizeVenue(venueData as Record<string, unknown> | null),
    campaign: sanitizeCampaign(campaignData as Record<string, unknown> | null),
  })
}
