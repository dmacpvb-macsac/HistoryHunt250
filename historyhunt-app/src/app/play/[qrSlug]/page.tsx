'use client'

import { use, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

type HuntQuestion = {
  question_id: string
  sort_order: number
  lyric: string
  lyric_prompt: string
  question_text: string
  choice_a: string
  choice_b: string
  choice_c: string
  choice_d: string
  category: string
  difficulty: string
  is_bonus: boolean
  active: boolean
}

type HuntData = {
  qrSlug?: string
  venue: {
    venue_id: string
    name: string
    city: string
    state: string
    qr_slug: string
  }
  campaign: {
    campaign_id: string
    slug: string
    title: string
  } | null
  game: {
    game_id: string
    slug: string
    title: string
    total_points: number
    status: string
    starts_at: string | null
    ends_at: string | null
    registration_required: boolean
  }
  questions: HuntQuestion[]
  permissions: {
    registrationRequired: boolean
    quizEnabled: boolean
    rewardsEnabled: boolean
  }
}

type StartResponse = {
  sessionId?: string
  playerId?: string | null
  hunt?: HuntData
  blockedMessage?: string
  error?: string
  registrationRequired?: boolean
}

type AnswerFeedback = {
  alreadyRecorded?: boolean
  selectedAnswer: string
  correct: boolean
  pointsAwarded: number
  correctAnswer: string
  currentScore: number
  educationalFact: string
  lyricMeaning: string
  youtubePrompt: string
}

type CompleteResponse = {
  sessionId?: string
  score?: number
  totalPoints?: number
  completed?: boolean
  error?: string
}

export default function PlayPage({
  params,
}: {
  params: Promise<{ qrSlug: string }>
}) {
  const { qrSlug } = use(params)
  const router = useRouter()

  const [hunt, setHunt] = useState<HuntData | null>(null)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [questionIndex, setQuestionIndex] = useState(0)
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null)
  const [answerFeedback, setAnswerFeedback] = useState<AnswerFeedback | null>(null)
  const [score, setScore] = useState(0)
  const [loading, setLoading] = useState(true)
  const [savingAnswer, setSavingAnswer] = useState(false)
  const [finishing, setFinishing] = useState(false)
  const [error, setError] = useState('')
  const [blockedMessage, setBlockedMessage] = useState('')

  useEffect(() => {
    async function bootGame() {
      setLoading(true)
      setError('')
      setBlockedMessage('')

      try {
        const playerId = localStorage.getItem('player_id')
        const anonymousRequested = sessionStorage.getItem(`anonymous_player:${qrSlug}`) === 'true'

        const response = await fetch(`/api/play/${encodeURIComponent(qrSlug)}/start`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ playerId, anonymous: anonymousRequested }),
        })

        const body = await response.json().catch(() => ({})) as StartResponse

        if (response.status === 401 && body.registrationRequired) {
          localStorage.removeItem('player_id')
          localStorage.removeItem('player_name')
          sessionStorage.removeItem(`anonymous_player:${qrSlug}`)
          router.push(`/register?qrSlug=${encodeURIComponent(qrSlug)}`)
          return
        }

        if (!response.ok) {
          if (body.hunt) {
            setHunt(body.hunt)
          }

          setBlockedMessage(body.blockedMessage || body.error || 'This History Hunt is not currently available.')
          setLoading(false)
          return
        }

        if (!body.hunt || !body.sessionId) {
          throw new Error('Start API returned an invalid response.')
        }

        setHunt(body.hunt)
        setSessionId(body.sessionId)
        setQuestionIndex(0)
        setSelectedAnswer(null)
        setAnswerFeedback(null)
        setScore(0)
        setLoading(false)
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Unable to load this History Hunt.'
        setError(message)
        setLoading(false)
      }
    }

    bootGame()
  }, [qrSlug, router])

  async function chooseAnswer(choice: 'A' | 'B' | 'C' | 'D') {
    if (!hunt || !sessionId || selectedAnswer || savingAnswer) return

    const question = hunt.questions[questionIndex]

    setSelectedAnswer(choice)
    setSavingAnswer(true)
    setError('')

    try {
      const response = await fetch('/api/play/answer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId,
          questionId: question.question_id,
          selectedAnswer: choice,
        }),
      })

      const body = await response.json().catch(() => ({})) as Partial<AnswerFeedback> & {
        error?: string
      }

      if (!response.ok) {
        throw new Error(body.error || `Unable to save answer. Status ${response.status}.`)
      }

      if (!body.selectedAnswer || typeof body.correct !== 'boolean') {
        throw new Error('Answer API returned an invalid response.')
      }

      const feedback = body as AnswerFeedback

      setAnswerFeedback(feedback)
      setScore(Number(feedback.currentScore || 0))
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unable to save your answer. Please try again.'
      setSelectedAnswer(null)
      setAnswerFeedback(null)
      setError(message)
    } finally {
      setSavingAnswer(false)
    }
  }

  async function nextQuestion() {
    if (!hunt || !sessionId || finishing) return

    const isLastQuestion = questionIndex >= hunt.questions.length - 1

    if (!isLastQuestion) {
      setQuestionIndex(questionIndex + 1)
      setSelectedAnswer(null)
      setAnswerFeedback(null)
      setError('')
      return
    }

    setFinishing(true)
    setError('')

    try {
      const response = await fetch('/api/play/complete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sessionId }),
      })

      const body = await response.json().catch(() => ({})) as CompleteResponse

      if (!response.ok) {
        throw new Error(body.error || `Unable to complete hunt. Status ${response.status}.`)
      }

      sessionStorage.removeItem(`anonymous_player:${qrSlug}`)

      router.push(`/results/${sessionId}`)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unable to save your final score. Please try again.'
      setError(message)
      setFinishing(false)
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-100 p-6 text-center">
        <p className="font-bold text-blue-900">Loading History Hunt...</p>
      </main>
    )
  }

  if (error && !hunt) {
    return (
      <main className="min-h-screen bg-slate-100 p-6 text-center">
        <div className="mx-auto max-w-xl rounded-3xl bg-white p-6 shadow-xl">
          <h1 className="text-2xl font-bold text-red-700">Unable to Load Hunt</h1>
          <p className="mt-3 text-gray-700">{error}</p>
        </div>
      </main>
    )
  }

  if (blockedMessage) {
    return (
      <main className="min-h-screen bg-slate-100 p-6 text-center">
        <div className="mx-auto max-w-xl rounded-3xl bg-white p-6 shadow-xl">
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
        <p className="font-bold text-red-700">History Hunt unavailable.</p>
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
      <div className="mx-auto max-w-2xl rounded-3xl bg-white p-6 shadow-xl">
        <p className="text-center text-sm font-bold tracking-wide text-red-700">
          {hunt.campaign?.title || 'History Hunt™'}
        </p>

        <h1 className="mt-1 text-center text-2xl font-bold text-blue-900">
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
          <div className="mt-5 rounded-2xl border border-blue-200 bg-blue-50 p-4">
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
            const isCorrectChoice = answerFeedback?.correctAnswer === choice.key

            let buttonClass =
              'w-full rounded-xl border p-4 text-left font-bold transition '

            if (!selectedAnswer) {
              buttonClass += 'border-slate-300 bg-white text-slate-900 hover:bg-blue-50'
            } else if (isCorrectChoice) {
              buttonClass += 'border-green-600 bg-green-100 text-green-900'
            } else if (isSelected && !isCorrectChoice && answerFeedback) {
              buttonClass += 'border-red-600 bg-red-100 text-red-900'
            } else {
              buttonClass += 'border-slate-300 bg-slate-100 text-slate-600'
            }

            return (
              <button
                key={choice.key}
                onClick={() => chooseAnswer(choice.key)}
                disabled={!!selectedAnswer || savingAnswer}
                className={buttonClass}
              >
                <span className="mr-2">{choice.key}.</span>
                {choice.text}
              </button>
            )
          })}
        </div>

        {error && (
          <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 font-semibold text-red-700">
            {error}
          </div>
        )}

        {selectedAnswer && (
          <section className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4">
            {!answerFeedback && (
              <p className="font-bold text-blue-900">Saving answer...</p>
            )}

            {answerFeedback && (
              <>
                <p
                  className={`font-bold ${
                    answerFeedback.correct ? 'text-green-800' : 'text-red-800'
                  }`}
                >
                  {answerFeedback.correct ? 'Correct!' : 'Not quite.'}
                </p>

                {answerFeedback.educationalFact && (
                  <p className="mt-3 text-gray-800">
                    {answerFeedback.educationalFact}
                  </p>
                )}

                {answerFeedback.lyricMeaning && (
                  <p className="mt-3 text-gray-700">
                    <span className="font-bold">Meaning: </span>
                    {answerFeedback.lyricMeaning}
                  </p>
                )}

                {answerFeedback.youtubePrompt && (
                  <p className="mt-3 text-gray-700">
                    {answerFeedback.youtubePrompt}
                  </p>
                )}

                <button
                  onClick={nextQuestion}
                  disabled={finishing}
                  className="mt-5 w-full rounded-xl bg-blue-900 p-4 text-lg font-bold text-white disabled:cursor-not-allowed disabled:bg-gray-400"
                >
                  {finishing
                    ? 'Finishing...'
                    : questionIndex >= totalQuestions - 1
                      ? 'Finish Hunt'
                      : 'Next Question →'}
                </button>
              </>
            )}
          </section>
        )}
      </div>
    </main>
  )
}
