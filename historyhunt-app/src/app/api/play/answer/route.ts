import { NextRequest, NextResponse } from 'next/server'

import { supabaseAdmin } from '@/lib/supabase/admin'

export const runtime = 'nodejs'

type AnswerRequestBody = {
  sessionId?: string
  questionId?: string
  selectedAnswer?: string
}

function normalizeChoice(value: unknown) {
  return String(value || '').trim().toUpperCase()
}

function validChoice(choice: string): choice is 'A' | 'B' | 'C' | 'D' {
  return choice === 'A' || choice === 'B' || choice === 'C' || choice === 'D'
}

async function currentScoreForSession(sessionId: string) {
  const { data, error } = await supabaseAdmin
    .from('responses')
    .select('points_awarded')
    .eq('session_id', sessionId)

  if (error) {
    throw new Error(error.message || 'Unable to calculate score.')
  }

  return (data || []).reduce((sum, row) => sum + Number(row.points_awarded || 0), 0)
}

export async function POST(request: NextRequest) {
  let body: AnswerRequestBody

  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON request body.' },
      { status: 400 }
    )
  }

  const sessionId = String(body.sessionId || '').trim()
  const questionId = String(body.questionId || '').trim()
  const selectedAnswer = normalizeChoice(body.selectedAnswer)

  if (!sessionId || !questionId || !validChoice(selectedAnswer)) {
    return NextResponse.json(
      { error: 'Session, question, and selected answer are required.' },
      { status: 400 }
    )
  }

  const { data: session, error: sessionError } = await supabaseAdmin
    .from('sessions')
    .select('session_id, player_id, game_id, completed')
    .eq('session_id', sessionId)
    .maybeSingle()

  if (sessionError || !session) {
    return NextResponse.json(
      { error: 'Session not found.' },
      { status: 404 }
    )
  }

  if (session.completed) {
    return NextResponse.json(
      { error: 'This session is already complete.' },
      { status: 409 }
    )
  }

  const { data: question, error: questionError } = await supabaseAdmin
    .from('questions')
    .select(`
      question_id,
      game_id,
      correct_answer,
      educational_fact,
      lyric_meaning,
      youtube_prompt,
      points,
      active
    `)
    .eq('question_id', questionId)
    .eq('game_id', session.game_id)
    .eq('active', true)
    .maybeSingle()

  if (questionError || !question) {
    return NextResponse.json(
      { error: 'Question not found for this session.' },
      { status: 404 }
    )
  }

  const correctAnswer = String(question.correct_answer || '').trim().toUpperCase()
  const correct = selectedAnswer === correctAnswer
  const pointsAwarded = correct ? Number(question.points || 1) : 0

  const { data: existingResponse, error: existingResponseError } = await supabaseAdmin
    .from('responses')
    .select('selected_answer, correct, points_awarded')
    .eq('session_id', sessionId)
    .eq('question_id', questionId)
    .maybeSingle()

  if (existingResponseError) {
    return NextResponse.json(
      { error: existingResponseError.message || 'Unable to check existing answer.' },
      { status: 500 }
    )
  }

  if (existingResponse) {
    return NextResponse.json({
      alreadyRecorded: true,
      selectedAnswer: String(existingResponse.selected_answer || ''),
      correct: Boolean(existingResponse.correct),
      pointsAwarded: Number(existingResponse.points_awarded || 0),
      correctAnswer,
      currentScore: await currentScoreForSession(sessionId),
      educationalFact: question.educational_fact ? String(question.educational_fact) : '',
      lyricMeaning: question.lyric_meaning ? String(question.lyric_meaning) : '',
      youtubePrompt: question.youtube_prompt ? String(question.youtube_prompt) : '',
    })
  }

  const { error: responseError } = await supabaseAdmin
    .from('responses')
    .insert({
      session_id: sessionId,
      player_id: session.player_id || null,
      game_id: session.game_id,
      question_id: questionId,
      selected_answer: selectedAnswer,
      correct,
      points_awarded: pointsAwarded,
    })

  if (responseError) {
    return NextResponse.json(
      { error: responseError.message || 'Unable to save answer.' },
      { status: 500 }
    )
  }

  return NextResponse.json({
    alreadyRecorded: false,
    selectedAnswer,
    correct,
    pointsAwarded,
    correctAnswer,
    currentScore: await currentScoreForSession(sessionId),
    educationalFact: question.educational_fact ? String(question.educational_fact) : '',
    lyricMeaning: question.lyric_meaning ? String(question.lyric_meaning) : '',
    youtubePrompt: question.youtube_prompt ? String(question.youtube_prompt) : '',
  })
}
