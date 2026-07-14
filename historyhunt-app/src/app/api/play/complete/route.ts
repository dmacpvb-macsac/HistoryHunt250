import { NextRequest, NextResponse } from 'next/server'

import { supabaseAdmin } from '@/lib/supabase/admin'

export const runtime = 'nodejs'

type CompleteRequestBody = {
  sessionId?: string
}

async function countActiveQuestions(gameId: string) {
  const { count, error } = await supabaseAdmin
    .from('questions')
    .select('*', { count: 'exact', head: true })
    .eq('game_id', gameId)
    .eq('active', true)

  if (error) {
    throw new Error(error.message || 'Unable to count questions.')
  }

  return count || 0
}

async function responseSummary(sessionId: string) {
  const { data, error } = await supabaseAdmin
    .from('responses')
    .select('points_awarded')
    .eq('session_id', sessionId)

  if (error) {
    throw new Error(error.message || 'Unable to calculate responses.')
  }

  return {
    responsesRecorded: data?.length || 0,
    score: (data || []).reduce((sum, row) => sum + Number(row.points_awarded || 0), 0),
  }
}

export async function POST(request: NextRequest) {
  let body: CompleteRequestBody

  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON request body.' },
      { status: 400 }
    )
  }

  const sessionId = String(body.sessionId || '').trim()

  if (!sessionId) {
    return NextResponse.json(
      { error: 'Session is required.' },
      { status: 400 }
    )
  }

  const { data: session, error: sessionError } = await supabaseAdmin
    .from('sessions')
    .select('session_id, game_id, score, total_points, completed')
    .eq('session_id', sessionId)
    .maybeSingle()

  if (sessionError || !session) {
    return NextResponse.json(
      { error: 'Session not found.' },
      { status: 404 }
    )
  }

  if (session.completed) {
    return NextResponse.json({
      sessionId,
      score: Number(session.score || 0),
      totalPoints: Number(session.total_points || 0),
      completed: true,
    })
  }

  const { data: game, error: gameError } = await supabaseAdmin
    .from('games')
    .select('game_id, total_points')
    .eq('game_id', session.game_id)
    .maybeSingle()

  if (gameError || !game) {
    return NextResponse.json(
      { error: 'Game not found for this session.' },
      { status: 404 }
    )
  }

  const activeQuestionCount = await countActiveQuestions(String(session.game_id))
  const summary = await responseSummary(sessionId)

  if (summary.responsesRecorded < activeQuestionCount) {
    return NextResponse.json(
      {
        error: `Cannot complete hunt yet. ${summary.responsesRecorded} of ${activeQuestionCount} questions have been answered.`,
      },
      { status: 409 }
    )
  }

  const totalPoints = Number(game.total_points || 0)

  const { data: updatedSession, error: completeError } = await supabaseAdmin
    .from('sessions')
    .update({
      score: summary.score,
      total_points: totalPoints,
      completed: true,
      completed_at: new Date().toISOString(),
    })
    .eq('session_id', sessionId)
    .select('session_id, score, total_points, completed')
    .single()

  if (completeError || !updatedSession) {
    return NextResponse.json(
      { error: completeError?.message || 'Unable to complete session.' },
      { status: 500 }
    )
  }

  return NextResponse.json({
    sessionId,
    score: Number(updatedSession.score || 0),
    totalPoints: Number(updatedSession.total_points || totalPoints),
    completed: Boolean(updatedSession.completed),
  })
}
