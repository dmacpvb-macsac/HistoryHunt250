'use client'

import { use, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { resolveGameFromQr } from '@/lib/gameLoader'
import { supabase } from '@/lib/supabase'

export default function PlayPage({
  params,
}: {
  params: Promise<{ qrSlug: string }>
}) {
  const { qrSlug } = use(params)
  const router = useRouter()

  const [hunt, setHunt] = useState<any>(null)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [questionIndex, setQuestionIndex] = useState(0)
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null)
  const [answerWasCorrect, setAnswerWasCorrect] = useState<boolean | null>(null)
  const [score, setScore] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [blockedMessage, setBlockedMessage] = useState('')

  const scoreRef = useRef(0)

  useEffect(() => {
    async function bootGame() {
      setLoading(true)
      setError('')
      setBlockedMessage('')

      try {
        const huntData = await resolveGameFromQr(qrSlug)
        const game = huntData.game

        const now = new Date()
        const startsAt = game.starts_at ? new Date(game.starts_at) : null
        const endsAt = game.ends_at ? new Date(game.ends_at) : null

        if (game.status === 'draft' || game.status === 'archived') {
          setBlockedMessage('This History Hunt is not currently available.')
          setHunt(huntData)
          setLoading(false)
          return
        }

        if (startsAt && now < startsAt) {
          setBlockedMessage('This History Hunt has not started yet. Check back when the hunt begins!')
          setHunt(huntData)
          setLoading(false)
          return
        }

        if (endsAt && now > endsAt) {
          setBlockedMessage('This History Hunt has ended.')
          setHunt(huntData)
          setLoading(false)
          return
        }

        const playerId = localStorage.getItem('player_id')

        if (!playerId) {
          router.push(`/register?qrSlug=${encodeURIComponent(qrSlug)}`)
          return
        }

        const { data: existingSession } = await supabase
          .from('sessions')
          .select('session_id')
          .eq('player_id', playerId)
          .eq('game_id', game.game_id)
          .eq('completed', false)
          .order('created_at', { ascending: true })
          .limit(1)
          .maybeSingle()

        let activeSessionId = existingSession?.session_id

        if (activeSessionId) {
          const { error: resetSessionError } = await supabase
            .from('sessions')
            .update({
              score: 0,
              completed: false,
              completed_at: null,
            })
            .eq('session_id', activeSessionId)

          if (resetSessionError) {
            console.error('SESSION RESET ERROR', resetSessionError)
            throw new Error(resetSessionError.message || 'Unable to reset existing game session.')
          }

          const { error: cleanupResponsesError } = await supabase
            .from('responses')
            .delete()
            .eq('session_id', activeSessionId)

          if (cleanupResponsesError) {
            console.error('RESPONSE CLEANUP ERROR', cleanupResponsesError)
            throw new Error(cleanupResponsesError.message || 'Unable to reset existing answers.')
          }
        } else {
          const { data: newSession, error: sessionError } = await supabase
            .from('sessions')
            .insert({
              player_id: playerId,
              campaign_id: huntData.campaign.campaign_id,
              venue_id: huntData.venue.venue_id,
              game_id: game.game_id,
              score: 0,
              total_points: game.total_points || 0,
              completed: false,
            })
            .select('session_id')
            .single()

          if (sessionError || !newSession) {
            console.error('SESSION INSERT ERROR', sessionError)
            throw new Error(sessionError?.message || 'Unable to start game session.')
          }

          activeSessionId = newSession.session_id
        }

        setHunt(huntData)
        setSessionId(activeSessionId)
        setQuestionIndex(0)
        setSelectedAnswer(null)
        setAnswerWasCorrect(null)
        setScore(0)
        scoreRef.current = 0
        setLoading(false)
      } catch (err: any) {
        setError(err?.message || 'Unable to load this History Hunt.')
        setLoading(false)
      }
    }

    bootGame()
  }, [qrSlug, router])

  async function chooseAnswer(choice: 'A' | 'B' | 'C' | 'D') {
    if (!hunt || !sessionId || selectedAnswer) return

    const playerId = localStorage.getItem('player_id')

    if (!playerId) {
      router.push(`/register?qrSlug=${encodeURIComponent(qrSlug)}`)
      return
    }

    const question = hunt.questions[questionIndex]
    const correct = choice === question.correct_answer
    const pointsAwarded = correct ? question.points || 1 : 0

    setSelectedAnswer(choice)
    setAnswerWasCorrect(correct)

    if (correct) {
      scoreRef.current += pointsAwarded
      setScore(scoreRef.current)
    }

    const { error: existingResponseDeleteError } = await supabase
      .from('responses')
      .delete()
      .eq('session_id', sessionId)
      .eq('question_id', question.question_id)

    if (existingResponseDeleteError) {
      console.error('EXISTING RESPONSE DELETE ERROR', existingResponseDeleteError)
      setError(existingResponseDeleteError.message || 'Unable to reset this answer. Please try again.')
      return
    }

    const { error: responseError } = await supabase
      .from('responses')
      .insert({
        session_id: sessionId,
        player_id: playerId,
        game_id: hunt.game.game_id,
        question_id: question.question_id,
        selected_answer: choice,
        correct,
        points_awarded: pointsAwarded,
      })

    if (responseError) {
      console.error('RESPONSE INSERT ERROR', responseError)
      setError(responseError.message || 'Unable to save your answer. Please try again.')
    }
  }

  async function nextQuestion() {
    if (!hunt || !sessionId) return

    const isLastQuestion = questionIndex >= hunt.questions.length - 1

    if (!isLastQuestion) {
      setQuestionIndex(questionIndex + 1)
      setSelectedAnswer(null)
      setAnswerWasCorrect(null)
      return
    }

    const { error: completeError } = await supabase
      .from('sessions')
      .update({
        score: scoreRef.current,
        total_points: hunt.game.total_points || scoreRef.current,
        completed: true,
        completed_at: new Date().toISOString(),
      })
      .eq('session_id', sessionId)

    if (completeError) {
      setError('Unable to save your final score. Please try again.')
      return
    }

    router.push(`/results/${sessionId}`)
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-100 p-6 text-center">
        <p className="text-blue-900 font-bold">Loading History Hunt...</p>
      </main>
    )
  }

  if (error) {
    return (
      <main className="min-h-screen bg-slate-100 p-6 text-center">
        <div className="max-w-xl mx-auto bg-white rounded-3xl shadow-xl p-6">
          <h1 className="text-2xl font-bold text-red-700">Unable to Load Hunt</h1>
          <p className="mt-3 text-gray-700">{error}</p>
        </div>
      </main>
    )
  }

  if (blockedMessage) {
    return (
      <main className="min-h-screen bg-slate-100 p-6 text-center">
        <div className="max-w-xl mx-auto bg-white rounded-3xl shadow-xl p-6">
          <h1 className="text-2xl font-bold text-blue-900">
            {hunt?.game?.title || 'History Hunt™'}
          </h1>

          <p className="mt-4 text-lg text-gray-700">{blockedMessage}</p>

          {hunt?.game?.starts_at && (
            <p className="mt-4 text-sm text-gray-500">
              Begins: {new Date(hunt.game.starts_at).toLocaleString()}
            </p>
          )}
        </div>
      </main>
    )
  }

  if (!hunt || !sessionId) {
    return (
      <main className="min-h-screen bg-slate-100 p-6 text-center">
        <p className="text-red-700 font-bold">History Hunt unavailable.</p>
      </main>
    )
  }

  const question = hunt.questions[questionIndex]
  const totalQuestions = hunt.questions.length

  const choices = [
    { key: 'A', text: question.choice_a },
    { key: 'B', text: question.choice_b },
    { key: 'C', text: question.choice_c },
    { key: 'D', text: question.choice_d },
  ] as const

  return (
    <main className="min-h-screen bg-slate-100 p-4">
      <div className="max-w-2xl mx-auto bg-white rounded-3xl shadow-xl p-6">
        <p className="text-center text-2x1 font-bold text-red-700 tracking-wide">
          {hunt.campaign?.title || 'History Hunt™'}
        </p>

        <h1 className="text-center text-2xl font-bold text-blue-900 mt-1">
          {hunt.game.title}
        </h1>

        <div className="mt-5 flex items-center justify-between text-sm text-gray-600">
          <span>
            Question {questionIndex + 1} of {totalQuestions}
          </span>
          <span>
            Score: {score} / {hunt.game.total_points}
          </span>
        </div>

        {question.lyric && (
          <div className="mt-5 bg-blue-50 border border-blue-200 rounded-2xl p-4">
            <p className="text-sm font-bold text-blue-900">Lyric Clue</p>
            <p className="mt-1 text-gray-800 italic">“{question.lyric}”</p>
          </div>
        )}

        <h2 className="mt-6 text-xl font-bold text-slate-900">
          {question.question_text}
        </h2>

        <div className="mt-5 space-y-3">
          {choices.map((choice) => {
            const isSelected = selectedAnswer === choice.key
            const isCorrectChoice = question.correct_answer === choice.key

            let buttonClass =
              'w-full text-left rounded-xl p-4 font-bold border transition '

            if (!selectedAnswer) {
              buttonClass += 'bg-white border-slate-300 hover:bg-blue-50 text-slate-900'
            } else if (isCorrectChoice) {
              buttonClass += 'bg-green-100 border-green-600 text-green-900'
            } else if (isSelected && !isCorrectChoice) {
              buttonClass += 'bg-red-100 border-red-600 text-red-900'
            } else {
              buttonClass += 'bg-slate-100 border-slate-300 text-slate-600'
            }

            return (
              <button
                key={choice.key}
                onClick={() => chooseAnswer(choice.key)}
                disabled={!!selectedAnswer}
                className={buttonClass}
              >
                <span className="mr-2">{choice.key}.</span>
                {choice.text}
              </button>
            )
          })}
        </div>

        {selectedAnswer && (
          <section className="mt-6 bg-slate-50 border border-slate-200 rounded-2xl p-4">
            <p
              className={`font-bold ${
                answerWasCorrect ? 'text-green-800' : 'text-red-800'
              }`}
            >
              {answerWasCorrect ? 'Correct!' : 'Not quite.'}
            </p>

            {question.educational_fact && (
              <p className="mt-3 text-gray-800">
                {question.educational_fact}
              </p>
            )}

            {question.lyric_meaning && (
              <p className="mt-3 text-gray-700">
                <span className="font-bold">Meaning: </span>
                {question.lyric_meaning}
              </p>
            )}

            {question.youtube_prompt && (
              <p className="mt-3 text-gray-700">
                {question.youtube_prompt}
              </p>
            )}

            <button
              onClick={nextQuestion}
              className="mt-5 w-full bg-blue-900 text-white rounded-xl p-4 text-lg font-bold"
            >
              {questionIndex >= totalQuestions - 1
                ? 'Finish Hunt'
                : 'Next Question →'}
            </button>
          </section>
        )}
      </div>
    </main>
  )
}
