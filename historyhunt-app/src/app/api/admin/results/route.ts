import { NextRequest, NextResponse } from 'next/server'

import { supabaseAdmin } from '@/lib/supabase/admin'

export const runtime = 'nodejs'

type PlayerRow = {
  player_id: string
  created_at: string | null
  first_name: string | null
  phone_number: string | null
  email: string | null
  sms_opt_in: boolean | null
  service_affiliation: boolean | null
}

type SessionRow = {
  session_id: string
  created_at: string | null
  player_id: string | null
  game_id: string | null
  score: number | null
  total_points: number | null
  completed: boolean | null
  completed_at: string | null
}

type ResponseRow = {
  response_id: string
  session_id: string | null
  player_id: string | null
  game_id: string | null
  question_id: string | null
  selected_answer: string | null
  correct: boolean | null
  points_awarded: number | null
}

type GameRow = {
  game_id: string
  slug: string | null
  title: string | null
}

type AdminPlayerResult = {
  playerId: string
  firstName: string
  phoneNumber: string
  email: string
  smsOptIn: boolean
  serviceAffiliation: boolean
  sessionsStarted: number
  sessionsCompleted: number
  bestScore: number
  totalPoints: number
  latestStartedAt: string | null
  latestCompletedAt: string | null
  gamesPlayed: string[]
  responsesRecorded: number
  correctResponses: number
}

function isAuthorized(request: NextRequest) {
  const expectedToken = process.env.ADMIN_IMPORT_TOKEN

  if (!expectedToken) {
    return false
  }

  const providedToken =
    request.headers.get('x-admin-token') ||
    request.headers.get('x-admin-import-token')

  return Boolean(providedToken) && providedToken === expectedToken
}

function asArray<T>(value: T[] | null) {
  return Array.isArray(value) ? value : []
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json(
      { error: 'Unauthorized.' },
      { status: 401 }
    )
  }

  const [
    playersResult,
    sessionsResult,
    responsesResult,
    gamesResult,
  ] = await Promise.all([
    supabaseAdmin
      .from('players')
      .select('player_id, created_at, first_name, phone_number, email, sms_opt_in, service_affiliation')
      .order('created_at', { ascending: false }),

    supabaseAdmin
      .from('sessions')
      .select('session_id, created_at, player_id, game_id, score, total_points, completed, completed_at')
      .order('created_at', { ascending: false }),

    supabaseAdmin
      .from('responses')
      .select('response_id, session_id, player_id, game_id, question_id, selected_answer, correct, points_awarded'),

    supabaseAdmin
      .from('games')
      .select('game_id, slug, title'),
  ])

  const firstError =
    playersResult.error ||
    sessionsResult.error ||
    responsesResult.error ||
    gamesResult.error

  if (firstError) {
    return NextResponse.json(
      { error: firstError.message },
      { status: 500 }
    )
  }

  const players = asArray(playersResult.data as PlayerRow[] | null)
  const sessions = asArray(sessionsResult.data as SessionRow[] | null)
  const responses = asArray(responsesResult.data as ResponseRow[] | null)
  const games = asArray(gamesResult.data as GameRow[] | null)

  const gameTitleById = new Map(
    games.map(game => [
      game.game_id,
      game.title || game.slug || game.game_id,
    ])
  )

  const sessionsByPlayerId = new Map<string, SessionRow[]>()
  for (const session of sessions) {
    if (!session.player_id) continue

    const existing = sessionsByPlayerId.get(session.player_id) || []
    existing.push(session)
    sessionsByPlayerId.set(session.player_id, existing)
  }

  const responsesByPlayerId = new Map<string, ResponseRow[]>()
  for (const response of responses) {
    if (!response.player_id) continue

    const existing = responsesByPlayerId.get(response.player_id) || []
    existing.push(response)
    responsesByPlayerId.set(response.player_id, existing)
  }

  const playerResults: AdminPlayerResult[] = players.map(player => {
    const playerSessions = sessionsByPlayerId.get(player.player_id) || []
    const completedSessions = playerSessions.filter(session => session.completed)
    const playerResponses = responsesByPlayerId.get(player.player_id) || []

    const bestSession = completedSessions.reduce<SessionRow | null>((best, session) => {
      if (!best) return session
      return Number(session.score || 0) > Number(best.score || 0) ? session : best
    }, null)

    const latestStartedAt = playerSessions.reduce<string | null>((latest, session) => {
      if (!session.created_at) return latest
      return !latest || session.created_at > latest ? session.created_at : latest
    }, null)

    const latestCompletedAt = completedSessions.reduce<string | null>((latest, session) => {
      if (!session.completed_at) return latest
      return !latest || session.completed_at > latest ? session.completed_at : latest
    }, null)

    const gameNames = Array.from(
      new Set(
        playerSessions
          .map(session => session.game_id ? gameTitleById.get(session.game_id) : null)
          .filter((value): value is string => Boolean(value))
      )
    )

    return {
      playerId: player.player_id,
      firstName: player.first_name || '',
      phoneNumber: player.phone_number || '',
      email: player.email || '',
      smsOptIn: Boolean(player.sms_opt_in),
      serviceAffiliation: Boolean(player.service_affiliation),
      sessionsStarted: playerSessions.length,
      sessionsCompleted: completedSessions.length,
      bestScore: Number(bestSession?.score || 0),
      totalPoints: Number(bestSession?.total_points || 0),
      latestStartedAt,
      latestCompletedAt,
      gamesPlayed: gameNames,
      responsesRecorded: playerResponses.length,
      correctResponses: playerResponses.filter(response => response.correct).length,
    }
  })

  return NextResponse.json({
    generatedAt: new Date().toISOString(),
    summary: {
      playerCount: players.length,
      sessionsStarted: sessions.length,
      sessionsCompleted: sessions.filter(session => session.completed).length,
      responsesRecorded: responses.length,
      smsOptInCount: players.filter(player => player.sms_opt_in).length,
      serviceAffiliationCount: players.filter(player => player.service_affiliation).length,
    },
    players: playerResults,
  })
}
