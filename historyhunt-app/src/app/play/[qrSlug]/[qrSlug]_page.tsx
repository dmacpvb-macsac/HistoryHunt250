'use client'

import Image from 'next/image'
import { use, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { resolveGameFromQr } from '@/lib/gameLoader'
import { supabase } from '@/lib/supabase'

const BONUS_VIDEO_URL = 'https://www.youtube.com/watch?v=drnBrAmbNHE'
const LISTEN_EVERYWHERE_URL = 'https://america250proof.com/go/'

type HuntData = Awaited<ReturnType<typeof resolveGameFromQr>>

export default function PlayPage({
  params,
}: {
  params: Promise<{ qrSlug: string }>
}) {
  const { qrSlug } = use(params)
  const router = useRouter()

  const [hunt, setHunt] = useState<HuntData | null>(null)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [current, setCurrent] = useState(0)
  const [selected, setSelected] = useState('')
  const [score, setScore] = useState(0)
  const scoreRef = useRef(0)
  const [finished, setFinished] = useState(false)
  const [alreadyCompleted, setAlreadyCompleted] = useState(false)
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

        const { status: gameStatus, starts_at: startsAt, ends_at: endsAt } = data.game
        const now = new Date()

        if (gameStatus === 'draft' || gameStatus === 'archived') {
          throw new Error('This History Hunt is not currently available.')
        }

        if (startsAt && now < new Date(startsAt)) {
          throw new Error('This History Hunt has not started yet. Please check back soon.')
        }

        if (endsAt && now > new Date(endsAt)) {
          throw new Error('This History Hunt has ended. Thanks for playing!')
        }

        setHunt(data)

        // Check for an existing, unfinished session for this player + game
        // before creating a new one. This prevents abandoned 0-score rows
        // from piling up every time a player reloads, backs out, or restarts.
        const { data: existingSession, error: existingSessionError } = await supabase
          .from('sessions')
          .select('session_id, score, completed')
          .eq('player_id', playerId)
          .eq('game_id', data.game.game_id)
          .eq('completed', false)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()

        if (existingSessionError) {
          throw new Error(existingSessionError.message)
        }

        if (existingSession) {
          // Resume the existing in-progress session row rather than creating
          // a new one, but restart the question flow from the beginning so
          // we never risk double-counting points for already-answered
          // questions (we are not persisting which question index a player
          // was on, only their session and per-question responses).
          setSessionId(existingSession.session_id)
          scoreRef.current = 0
          setScore(0)
          setLoading(false)
          return
        }

        // No in-progress session found. Before starting a brand new attempt,
        // check whether this player has ALREADY completed this game. If so,
        // this is their official, final attempt for badge/leaderboard
        // purposes — show their existing result instead of silently
        // minting a new scored session and letting them replay for a
        // better score.
        const { data: completedSession, error: completedSessionError } = await supabase
          .from('sessions')
          .select('session_id, score')
          .eq('player_id', playerId)
          .eq('game_id', data.game.game_id)
          .eq('completed', true)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()

        if (completedSessionError) {
          throw new Error(completedSessionError.message)
        }

        if (completedSession) {
          scoreRef.current = completedSession.score ?? 0
          setScore(completedSession.score ?? 0)
          setSessionId(completedSession.session_id)
          setAlreadyCompleted(true)
          setFinished(true)
          setLoading(false)
          return
        }

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
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : 'Unable to load History Hunt.'

        setError(message)
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

  const huntData = hunt
  const questions = huntData.questions
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
      scoreRef.current += pointsAwarded
      setScore(scoreRef.current)
    }

    const playerId = localStorage.getItem('player_id')

    if (!playerId) {
      setError('Your session expired. Please rejoin the Hunt.')
      setSaving(false)
      router.push(`/register?play=${qrSlug}`)
      return
    }

    const { error: responseError } = await supabase
      .from('responses')
      .upsert([{
        session_id: sessionId,
        player_id: playerId,
        game_id: huntData.game.game_id,
        question_id: q.question_id,
        selected_answer: choiceKey,
        correct: isCorrect,
        points_awarded: pointsAwarded,
      }], { onConflict: 'session_id,question_id' })

    if (responseError) {
      setError(responseError.message)
    }

    setSaving(false)
  }

  async function nextQuestion() {
    if (current === questions.length - 1) {
      const finalScore = scoreRef.current

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
    const isPerfect = score === huntData.game.total_points
    const participantBadge =
      huntData.game.participant_badge_url || '/badges/jax-participant.png'
    const perfectBadge =
      huntData.game.perfect_score_badge_url || '/badges/jax-perfect-score.png'
    const badgeUrl = isPerfect ? perfectBadge : participantBadge
    const shareUrl =
      huntData.game.share_url ||
      (typeof window !== 'undefined' ? window.location.href : '')
    const shareTitle =
      huntData.game.share_title ||
      'I completed the America 250 Proof™ History Hunt'
    const shareText =
      huntData.game.share_text ||
      'I earned my History Hunt™ badge. Can you beat my score?'
    const badgeShareEnabled = huntData.game.badge_share_enabled !== false
    const badgeDownloadEnabled = huntData.game.badge_download_enabled !== false
    const encodedShareUrl = encodeURIComponent(shareUrl)
    const encodedShareTitle = encodeURIComponent(shareTitle)
    const encodedShareText = encodeURIComponent(`${shareText} ${shareUrl}`)

    return (
      <main className="min-h-screen bg-slate-100 p-6 text-center">
        <div className="max-w-xl mx-auto bg-white rounded-3xl shadow-xl p-6">
          <h1 className="text-3xl font-bold text-blue-900">
            {alreadyCompleted ? 'You Already Completed This Hunt!' : 'Hunt Complete!'}
          </h1>

          {alreadyCompleted && (
            <p className="text-sm text-gray-500 mt-2">
              Here's the result from your earlier attempt. Each player gets one official score per Hunt.
            </p>
          )}

          <p className="text-gray-600 mt-2">
            {huntData.campaign.title}
          </p>

          <p className="text-4xl font-bold mt-6 text-blue-900">
            {score} / {huntData.game.total_points}
          </p>

          <p className="mt-2 text-gray-600">
            Final Score
          </p>

          <div className="mt-6">
            <Image
              src={badgeUrl}
              alt={isPerfect ? 'Perfect Score Badge' : 'Participant Badge'}
              width={288}
              height={288}
              className="w-72 h-auto mx-auto"
              priority
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
                aria-live="polite"
              >
                {copiedShareLink ? '✅ Link Copied!' : '🔗 Copy Share Link'}
              </button>

              <div
                className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3"
                role="group"
                aria-label="Share your badge on social media"
              >
                <a
                  href={`https://www.facebook.com/sharer/sharer.php?u=${encodedShareUrl}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block bg-blue-700 text-white rounded-xl p-3 font-bold"
                  aria-label="Share your badge on Facebook"
                >
                  Facebook
                </a>

                <a
                  href={`https://twitter.com/intent/tweet?text=${encodedShareText}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block bg-slate-900 text-white rounded-xl p-3 font-bold"
                  aria-label="Share your badge on X"
                >
                  X
                </a>

                <a
                  href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodedShareUrl}&title=${encodedShareTitle}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block bg-blue-800 text-white rounded-xl p-3 font-bold"
                  aria-label="Share your badge on LinkedIn"
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
        <Image
          src="/logos/historyhunt/history-hunt-logo.png"
          alt="History Hunt"
          width={144}
          height={144}
          className="w-36 h-auto mx-auto mb-4"
          priority
        />

        <p className="text-sm font-bold text-red-600">
          Question {current + 1} of {questions.length}
          {q.is_bonus ? ' — Bonus Worth 2 Points' : ''}
        </p>

        <h1 className="text-2xl font-bold text-blue-900 mt-2">
          {huntData.game.title}
        </h1>

        <p className="text-gray-500">
          {huntData.venue.name}
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
