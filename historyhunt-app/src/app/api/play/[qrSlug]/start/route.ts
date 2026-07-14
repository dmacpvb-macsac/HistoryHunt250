import { NextRequest, NextResponse } from 'next/server'

import { supabaseAdmin } from '@/lib/supabase/admin'

export const runtime = 'nodejs'

type StartRequestBody = {
  playerId?: string | null
}

function normalizeCampaign(value: unknown) {
  if (Array.isArray(value)) return value[0] || null
  return value || null
}

function sanitizeQuestion(question: Record<string, unknown>) {
  return {
    question_id: String(question.question_id || ''),
    sort_order: Number(question.sort_order || 0),
    lyric: question.lyric ? String(question.lyric) : '',
    lyric_prompt: question.lyric_prompt ? String(question.lyric_prompt) : '',
    question_text: question.question_text ? String(question.question_text) : '',
    choice_a: question.choice_a ? String(question.choice_a) : '',
    choice_b: question.choice_b ? String(question.choice_b) : '',
    choice_c: question.choice_c ? String(question.choice_c) : '',
    choice_d: question.choice_d ? String(question.choice_d) : '',
    category: question.category ? String(question.category) : '',
    difficulty: question.difficulty ? String(question.difficulty) : '',
    is_bonus: Boolean(question.is_bonus),
    active: Boolean(question.active),
  }
}

function publicGameFields(game: Record<string, unknown>) {
  return {
    game_id: String(game.game_id || ''),
    slug: String(game.slug || ''),
    title: String(game.title || ''),
    description: game.description ? String(game.description) : '',
    state: game.state ? String(game.state) : '',
    city: game.city ? String(game.city) : '',
    question_count: Number(game.question_count || 0),
    total_points: Number(game.total_points || 0),
    participant_badge_url: game.participant_badge_url ? String(game.participant_badge_url) : '',
    perfect_score_badge_url: game.perfect_score_badge_url ? String(game.perfect_score_badge_url) : '',
    share_url: game.share_url ? String(game.share_url) : '',
    share_title: game.share_title ? String(game.share_title) : '',
    share_text: game.share_text ? String(game.share_text) : '',
    public_play_url: game.public_play_url ? String(game.public_play_url) : '',
    badge_share_enabled: game.badge_share_enabled !== false,
    badge_download_enabled: game.badge_download_enabled !== false,
    status: game.status ? String(game.status) : '',
    starts_at: game.starts_at ? String(game.starts_at) : null,
    ends_at: game.ends_at ? String(game.ends_at) : null,
    countdown_enabled: Boolean(game.countdown_enabled),
    leaderboard_enabled: Boolean(game.leaderboard_enabled),
    registration_required: Boolean(game.registration_required),
    active: Boolean(game.active),
  }
}

function publicVenueFields(venue: Record<string, unknown>) {
  return {
    venue_id: String(venue.venue_id || ''),
    slug: String(venue.slug || ''),
    name: String(venue.name || ''),
    city: venue.city ? String(venue.city) : '',
    state: venue.state ? String(venue.state) : '',
    qr_slug: String(venue.qr_slug || ''),
    active: Boolean(venue.active),
    registration_enabled: Boolean(venue.registration_enabled),
    quiz_enabled: venue.quiz_enabled !== false,
    reward_enabled: venue.reward_enabled !== false,
    campaign_id: String(venue.campaign_id || ''),
  }
}

function publicCampaignFields(campaign: Record<string, unknown> | null) {
  if (!campaign) return null

  return {
    campaign_id: String(campaign.campaign_id || ''),
    slug: String(campaign.slug || ''),
    title: String(campaign.title || ''),
    active: Boolean(campaign.active),
  }
}

async function loadHunt(qrSlug: string) {
  const { data: venueRaw, error: venueError } = await supabaseAdmin
    .from('venues')
    .select(`
      venue_id,
      slug,
      name,
      city,
      state,
      qr_slug,
      active,
      registration_enabled,
      quiz_enabled,
      reward_enabled,
      campaign_id,
      campaigns (
        campaign_id,
        slug,
        title,
        active
      )
    `)
    .eq('qr_slug', qrSlug)
    .eq('active', true)
    .maybeSingle()

  if (venueError || !venueRaw) {
    throw new Error(`No active venue found for QR slug: ${qrSlug}`)
  }

  const venueRecord = venueRaw as Record<string, unknown>
  const campaign = normalizeCampaign(venueRecord.campaigns) as Record<string, unknown> | null

  if (!campaign) {
    throw new Error(`No campaign found for QR slug: ${qrSlug}`)
  }

  const { data: game, error: gameError } = await supabaseAdmin
    .from('games')
    .select(`
      game_id,
      campaign_id,
      slug,
      title,
      description,
      state,
      city,
      question_count,
      total_points,
      participant_badge_url,
      perfect_score_badge_url,
      share_url,
      share_title,
      share_text,
      public_play_url,
      badge_share_enabled,
      badge_download_enabled,
      status,
      starts_at,
      ends_at,
      countdown_enabled,
      leaderboard_enabled,
      registration_required,
      active
    `)
    .eq('campaign_id', venueRecord.campaign_id)
    .eq('active', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (gameError || !game) {
    throw new Error(`No active game found for QR slug: ${qrSlug}`)
  }

  const gameRecord = game as Record<string, unknown>

  const { data: questions, error: questionsError } = await supabaseAdmin
    .from('questions')
    .select(`
      question_id,
      sort_order,
      lyric,
      lyric_prompt,
      question_text,
      choice_a,
      choice_b,
      choice_c,
      choice_d,
      category,
      difficulty,
      is_bonus,
      active
    `)
    .eq('game_id', gameRecord.game_id)
    .eq('active', true)
    .order('sort_order', { ascending: true })

  if (questionsError || !questions) {
    throw new Error(`Questions not found for game: ${gameRecord.slug}`)
  }

  const { campaigns: _campaigns, ...venueWithoutCampaign } = venueRecord

  const registrationRequired = Boolean(gameRecord.registration_required) || Boolean(venueRecord.registration_enabled)

  return {
    venue: publicVenueFields(venueWithoutCampaign),
    campaign: publicCampaignFields(campaign),
    game: publicGameFields(gameRecord),
    questions: questions.map((question) => sanitizeQuestion(question as Record<string, unknown>)),
    permissions: {
      registrationRequired,
      quizEnabled: venueRecord.quiz_enabled !== false,
      rewardsEnabled: venueRecord.reward_enabled !== false,
    },
  }
}

function checkAvailability(game: { status: string; starts_at: string | null; ends_at: string | null }) {
  const now = new Date()
  const startsAt = game.starts_at ? new Date(game.starts_at) : null
  const endsAt = game.ends_at ? new Date(game.ends_at) : null

  if (game.status === 'draft' || game.status === 'archived') {
    return 'This History Hunt is not currently available.'
  }

  if (startsAt && now < startsAt) {
    return 'This History Hunt has not started yet. Check back when the hunt begins!'
  }

  if (endsAt && now > endsAt) {
    return 'This History Hunt has ended.'
  }

  return ''
}

async function resolvePlayerId(playerId: string | null, registrationRequired: boolean) {
  if (!playerId) {
    if (registrationRequired) {
      throw new Error('REGISTRATION_REQUIRED')
    }

    return null
  }

  const { data: playerExists, error } = await supabaseAdmin
    .from('players')
    .select('player_id')
    .eq('player_id', playerId)
    .maybeSingle()

  if (error || !playerExists) {
    if (registrationRequired) {
      throw new Error('REGISTRATION_REQUIRED')
    }

    return null
  }

  return String(playerExists.player_id)
}

async function resetIncompleteSession(sessionId: string) {
  const { error: resetSessionError } = await supabaseAdmin
    .from('sessions')
    .update({
      score: 0,
      completed: false,
      completed_at: null,
    })
    .eq('session_id', sessionId)

  if (resetSessionError) {
    throw new Error(resetSessionError.message || 'Unable to reset existing game session.')
  }

  const { error: cleanupResponsesError } = await supabaseAdmin
    .from('responses')
    .delete()
    .eq('session_id', sessionId)

  if (cleanupResponsesError) {
    throw new Error(cleanupResponsesError.message || 'Unable to reset existing answers.')
  }

  return sessionId
}

async function findIncompleteSession(gameId: string, playerId: string | null) {
  if (!playerId) return null

  const { data: existingSession, error: existingSessionError } = await supabaseAdmin
    .from('sessions')
    .select('session_id')
    .eq('player_id', playerId)
    .eq('game_id', gameId)
    .eq('completed', false)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (existingSessionError) {
    throw new Error(existingSessionError.message || 'Unable to find existing game session.')
  }

  return existingSession?.session_id ? String(existingSession.session_id) : null
}

function isDuplicateSessionError(error: { code?: string; message?: string } | null) {
  if (!error) return false

  return (
    error.code === '23505' ||
    String(error.message || '').includes('sessions_one_incomplete_per_player_game') ||
    String(error.message || '').toLowerCase().includes('duplicate key')
  )
}

async function startSession(hunt: Awaited<ReturnType<typeof loadHunt>>, playerId: string | null) {
  const existingSessionId = await findIncompleteSession(hunt.game.game_id, playerId)

  if (existingSessionId) {
    return resetIncompleteSession(existingSessionId)
  }

  const { data: newSession, error: sessionError } = await supabaseAdmin
    .from('sessions')
    .insert({
      player_id: playerId,
      campaign_id: hunt.campaign?.campaign_id || null,
      venue_id: hunt.venue.venue_id,
      game_id: hunt.game.game_id,
      score: 0,
      total_points: hunt.game.total_points || 0,
      completed: false,
    })
    .select('session_id')
    .single()

  if (sessionError || !newSession) {
    if (isDuplicateSessionError(sessionError)) {
      const duplicateSessionId = await findIncompleteSession(hunt.game.game_id, playerId)

      if (duplicateSessionId) {
        return resetIncompleteSession(duplicateSessionId)
      }
    }

    throw new Error(sessionError?.message || 'Unable to start game session.')
  }

  return String(newSession.session_id)
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ qrSlug: string }> }
) {
  const { qrSlug } = await params

  let body: StartRequestBody = {}

  try {
    body = await request.json()
  } catch {
    body = {}
  }

  try {
    const hunt = await loadHunt(qrSlug)
    const blockedMessage = checkAvailability(hunt.game)

    if (blockedMessage) {
      return NextResponse.json(
        {
          blockedMessage,
          hunt,
        },
        { status: 403 }
      )
    }

    if (!hunt.permissions.quizEnabled) {
      return NextResponse.json(
        {
          blockedMessage: 'This History Hunt quiz is not currently enabled.',
          hunt,
        },
        { status: 403 }
      )
    }

    const playerId = await resolvePlayerId(
      body.playerId ? String(body.playerId) : null,
      hunt.permissions.registrationRequired
    )

    const sessionId = await startSession(hunt, playerId)

    return NextResponse.json({
      sessionId,
      playerId,
      hunt,
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unable to start this History Hunt.'

    if (message === 'REGISTRATION_REQUIRED') {
      return NextResponse.json(
        {
          error: 'Registration required.',
          registrationRequired: true,
        },
        { status: 401 }
      )
    }

    return NextResponse.json(
      { error: message },
      { status: 400 }
    )
  }
}
