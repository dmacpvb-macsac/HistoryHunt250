'use client'

import { use, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { resolveGameFromQr } from '@/lib/gameLoader'
import { supabase } from '@/lib/supabase'

const BONUS_VIDEO_URL = 'https://www.youtube.com/watch?v=drnBrAmbNHE'
const LISTEN_EVERYWHERE_URL = 'https://america250proof.com/go/'

export default function PlayPage({
  params,
}: {
  params: Promise<{ qrSlug: string }>
}) {
  const { qrSlug } = use(params)
  const router = useRouter()

  const [hunt, setHunt] = useState<any>(null)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [current, setCurrent] = useState(0)
  const [selected, setSelected] = useState('')
  const [score, setScore] = useState(0)
  const [finished, setFinished] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [copiedShareLink, setCopiedShareLink] = useState(false)

  useEffect(() => {
    async function start() {
      try {
        const playerId = localStorage.getItem('player_id')

        if (!playerId) {
          router.push(`/register?play=${qrSlug}`)
          return
        }

        const data = await resolveGameFromQr(qrSlug)
        setHunt(data)

        const { data: session, error: sessionError } = await supabase
          .from('sessions')
          .insert([{
            player_id: playerId,
            campaign_id: data.campaign.campaign_id,
            venue_id: data.venue.venue_id,
            game_id: data.game.game_id,
            score: 0,
            total_points: data.game.total_points,
            completed: false,
          }])
          .select()
          .single()

        if (sessionError) {
          if (sessionError.message.includes('sessions_player_id_fkey')) {
            localStorage.clear()
            router.push(`/register?play=${qrSlug}`)
            return
          }

          throw new Error(sessionError.message)
        }

        setSessionId(session.session_id)
      } catch (err: any) {
        setError(err.message || 'Unable to load History Hunt.')
      } finally {
        setLoading(false)
      }
    }

    start()
  }, [qrSlug, router])

  if (loading) {
    return <main className="p-8">Loading History Hunt...</main>
  }

  if (error) {
    return (
      <main className="min-h-screen bg-slate-100 p-6">
        <div className="max-w-xl mx-auto bg-white rounded-3xl shadow-xl p-6">
          <h1 className="text-2xl font-bold text-red-600">Error</h1>
          <p className="mt-4">{error}</p>
        </div>
      </main>
    )
  }

  if (!hunt) return null

  const questions = hunt.questions
  const q = questions[current]

  const choices = [
    { key: 'A', text: q.choice_a },
    { key: 'B', text: q.choice_b },
    { key: 'C', text: q.choice_c },
    { key: 'D', text: q.choice_d },
  ]

  const answered = selected !== ''
  const correct = selected === q.correct_answer

  async function choose(choiceKey: string) {
    if (answered || saving || !sessionId) return

    setSaving(true)
    setSelected(choiceKey)

    const isCorrect = choiceKey === q.correct_answer
    const pointsAwarded = isCorrect ? q.points : 0

    if (isCorrect) {
      setScore(prev => prev + pointsAwarded)
    }

    const playerId = localStorage.getItem('player_id')

    const { error: responseError } = await supabase
      .from('responses')
      .insert([{
        session_id: sessionId,
        player_id: playerId,
        game_id: hunt.game.game_id,
        question_id: q.question_id,
        selected_answer: choiceKey,
        correct: isCorrect,
        points_awarded: pointsAwarded,
      }])

    if (responseError) {
      setError(responseError.message)
    }

    setSaving(false)
  }

  async function nextQuestion() {
    if (current === questions.length - 1) {
      const finalScore = score

      if (sessionId) {
        await supabase
          .from('sessions')
          .update({
            score: finalScore,
            completed: true,
            completed_at: new Date().toISOString(),
          })
          .eq('session_id', sessionId)
      }

      setFinished(true)
      return
    }

    setCurrent(prev => prev + 1)
    setSelected('')
  }

  async function copyShareLink(shareUrl: string) {
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopiedShareLink(true)
      window.setTimeout(() => setCopiedShareLink(false), 2500)
    } catch {
      window.prompt('Copy this link to share your badge:', shareUrl)
    }
  }

  if (finished) {
    const isPerfect = score === hunt.game.total_points
    const participantBadge =
      hunt.game.participant_badge_url || '/badges/jax-participant.png'
    const perfectBadge =
      hunt.game.perfect_score_badge_url || '/badges/jax-perfect-score.png'
    const badgeUrl = isPerfect ? perfectBadge : participantBadge
    const shareUrl = hunt.game.share_url || ''
    const shareTitle =
      hunt.game.share_title ||
      'I completed the America 250 Proof™ History Hunt'
    const shareText =
      hunt.game.share_text ||
      'I earned my History Hunt™ badge. Can you beat my score?'
    const badgeShareEnabled = hunt.game.badge_share_enabled !== false
    const badgeDownloadEnabled = hunt.game.badge_download_enabled !== false
    const encodedShareUrl = encodeURIComponent(shareUrl)
    const encodedShareTitle = encodeURIComponent(shareTitle)
    const encodedShareText = encodeURIComponent(`${shareText} ${shareUrl}`)

    return (
      <main className="min-h-screen bg-slate-100 p-6 text-center">
        <div className="max-w-xl mx-auto bg-white rounded-3xl shadow-xl p-6">
          <h1 className="text-3xl font-bold text-blue-900">
            Hunt Complete!
          </h1>

          <p className="text-gray-600 mt-2">
            {hunt.campaign.title}
          </p>

          <p className="text-4xl font-bold mt-6 text-blue-900">
            {score} / {hunt.game.total_points}
          </p>

          <p className="mt-2 text-gray-600">
            Final Score
          </p>

          <div className="mt-6">
            <img
              src={badgeUrl}
              alt={isPerfect ? 'Perfect Score Badge' : 'Participant Badge'}
              className="w-72 mx-auto"
            />
          </div>

          <div className="mt-6 bg-blue-50 border border-blue-200 rounded-xl p-4">
            {isPerfect ? (
              <>
                <p className="text-xl font-bold text-blue-900">
                  🏆 Perfect Score!
                </p>
                <p className="mt-2 text-gray-700">
                  Congratulations — you earned the Freedom Fest 250 Perfect Score Badge.
                </p>
              </>
            ) : (
              <>
                <p className="text-xl font-bold text-blue-900">
                  🎖 Badge Earned!
                </p>
                <p className="mt-2 text-gray-700">
                  Congratulations — you completed the Freedom Fest 250 History Hunt.
                </p>
              </>
            )}
          </div>

          {badgeDownloadEnabled && (
            <a
              href={badgeUrl}
              target="_blank"
              rel="noopener noreferrer"
              download
              className="block mt-6 bg-yellow-500 text-blue-950 rounded-xl p-4 text-xl font-bold"
            >
              💾 Save My Badge
            </a>
          )}

          {badgeShareEnabled && (
            <div className="mt-6 border-t pt-6">
              <p className="text-sm font-bold text-blue-900 uppercase tracking-wide">
                Share Your Badge
              </p>

              <p className="mt-2 text-sm text-gray-600">
                Invite friends, family, classmates, or guests to play the same History Hunt.
              </p>

              <button
                onClick={() => copyShareLink(shareUrl)}
                className="mt-4 w-full bg-blue-900 text-white rounded-xl p-4 text-lg font-bold"
              >
                {copiedShareLink ? '✅ Link Copied!' : '🔗 Copy Share Link'}
              </button>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3">
                <a
                  href={`https://www.facebook.com/sharer/sharer.php?u=${encodedShareUrl}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block bg-blue-700 text-white rounded-xl p-3 font-bold"
                >
                  Facebook
                </a>

                <a
                  href={`https://twitter.com/intent/tweet?text=${encodedShareText}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block bg-slate-900 text-white rounded-xl p-3 font-bold"
                >
                  X
                </a>

                <a
                  href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodedShareUrl}&title=${encodedShareTitle}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block bg-blue-800 text-white rounded-xl p-3 font-bold"
                >
                  LinkedIn
                </a>
              </div>
            </div>
          )}

          <a
            href={LISTEN_EVERYWHERE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="block mt-6 bg-red-600 text-white rounded-xl p-4 text-xl font-bold"
          >
            🎵 Listen to America 250 Proof™
          </a>

          <a
            href="https://america250proof.com"
            target="_blank"
            rel="noopener noreferrer"
            className="block mt-4 bg-blue-900 text-white rounded-xl p-4 text-xl font-bold"
          >
            Visit America250Proof.com
          </a>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-slate-100 p-6">
      <div className="max-w-xl mx-auto bg-white rounded-3xl shadow-xl p-6">
        <img
          src="/history-hunt-logo.png"
          alt="History Hunt"
          className="w-36 mx-auto mb-4"
        />

        <p className="text-sm font-bold text-red-600">
          Question {current + 1} of {questions.length}
          {q.is_bonus ? ' — Bonus Worth 2 Points' : ''}
        </p>

        <h1 className="text-2xl font-bold text-blue-900 mt-2">
          {hunt.game.title}
        </h1>

        <p className="text-gray-500">
          {hunt.venue.name}
        </p>

        {q.lyric && (
          <div className="mt-5 bg-blue-50 border-l-4 border-blue-900 p-4 rounded">
            <p className="text-sm uppercase font-bold text-blue-900">
              Lyric Clue
            </p>
            <p className="italic">“{q.lyric}”</p>
          </div>
        )}

        {q.youtube_prompt && (
          <div className="mt-5 bg-yellow-100 p-4 rounded-xl">
            <p className="font-bold">🎵 Bonus Challenge</p>
            <p className="text-sm mt-1">{q.youtube_prompt}</p>
            <a
              href={BONUS_VIDEO_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block mt-3 bg-red-600 text-white px-4 py-2 rounded-lg font-bold"
            >
              Listen Now
            </a>
          </div>
        )}

        <h2 className="text-xl font-bold mt-6">
          {q.question_text}
        </h2>

        <div className="space-y-3 mt-5">
          {choices.map(choice => {
            let cls =
              'w-full border-2 border-blue-900 rounded-xl p-4 text-left font-semibold'

            if (answered && choice.key === selected && correct) {
              cls =
                'w-full border-2 border-green-600 bg-green-100 rounded-xl p-4 text-left font-semibold'
            } else if (answered && choice.key === selected && !correct) {
              cls =
                'w-full border-2 border-red-600 bg-red-100 rounded-xl p-4 text-left font-semibold'
            } else if (answered && choice.key === q.correct_answer) {
              cls =
                'w-full border-2 border-green-600 bg-green-50 rounded-xl p-4 text-left font-semibold'
            }

            return (
              <button
                key={choice.key}
                onClick={() => choose(choice.key)}
                disabled={answered || saving}
                className={cls}
              >
                {choice.key}. {choice.text}
              </button>
            )
          })}
        </div>

        {answered && (
          <div className="mt-6 bg-slate-50 rounded-xl p-4">
            <p className="text-xl font-bold">
              {correct ? '✅ Correct!' : '❌ Not quite.'}
            </p>

            <p className="mt-3">
              {q.educational_fact}
            </p>

            {q.lyric_meaning && (
              <div className="mt-4 border-t pt-4">
                <p className="font-bold text-blue-900">
                  Why this lyric matters
                </p>
                <p>{q.lyric_meaning}</p>
              </div>
            )}

            <button
              onClick={nextQuestion}
              className="mt-5 w-full bg-blue-900 text-white rounded-xl p-4 text-xl font-bold"
            >
              {current === questions.length - 1 ? 'See Results' : 'Next Question'}
            </button>
          </div>
        )}
      </div>
    </main>
  )
}
