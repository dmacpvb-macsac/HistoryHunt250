'use client'

import { use, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import ShareBar from '@/components/share/ShareBar'

type ResultsResponse = {
  session: {
    session_id: string
    score: number
    total_points: number
    completed: boolean
    completed_at: string | null
  }
  player: {
    first_name: string
  } | null
  game: {
    game_id: string
    slug: string
    title: string
    participant_badge_url: string
    perfect_score_badge_url: string
    share_url: string
    public_play_url: string
    share_title: string
    share_text: string
    badge_share_enabled: boolean
    badge_download_enabled: boolean
  }
  venue: {
    venue_id: string
    name: string
    city: string
    state: string
    qr_slug: string
  } | null
  campaign: {
    campaign_id: string
    slug: string
    title: string
  } | null
  error?: string
}

export default function ResultsPage({
  params,
}: {
  params: Promise<{ sessionId: string }>
}) {
  const { sessionId } = use(params)

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [nativeShareSupported, setNativeShareSupported] = useState(false)
  const [results, setResults] = useState<ResultsResponse | null>(null)

  useEffect(() => {
    async function loadResults() {
      setLoading(true)
      setError('')

      try {
        const response = await fetch(`/api/results/${encodeURIComponent(sessionId)}`, {
          cache: 'no-store',
        })

        const body = await response.json().catch(() => ({})) as ResultsResponse

        if (!response.ok) {
          throw new Error(body.error || `Unable to load results. Status ${response.status}.`)
        }

        if (!body.session || !body.game) {
          throw new Error('Results API returned an invalid response.')
        }

        setResults(body)
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Unable to load this result.'
        setError(message)
      } finally {
        setLoading(false)
      }
    }

    loadResults()
  }, [sessionId])

  useEffect(() => {
    setNativeShareSupported(
      typeof navigator !== 'undefined' &&
        typeof navigator.share === 'function'
    )
  }, [])

  const session = results?.session || null
  const player = results?.player || null
  const game = results?.game || null
  const venue = results?.venue || null
  const campaign = results?.campaign || null

  const isPerfect = session && Number(session.score) >= Number(session.total_points)

  const badgeUrl = useMemo(() => {
    if (!game) return ''
    return isPerfect
      ? game.perfect_score_badge_url || game.participant_badge_url || ''
      : game.participant_badge_url || ''
  }, [game, isPerfect])

  const playUrl = useMemo(() => {
    if (typeof window === 'undefined') return ''
    if (game?.share_url) return game.share_url
    if (game?.public_play_url) return game.public_play_url
    if (venue?.qr_slug) return `${window.location.origin}/play/${venue.qr_slug}`
    return window.location.href
  }, [game, venue])

  const shareTitle =
    game?.share_title ||
    `I completed the ${game?.title || 'History Hunt™'}`

  const shareText =
    game?.share_text ||
    'I earned my History Hunt™ badge. Can you beat my score?'

  const listenUrl = 'https://interceptmusic.lnk.to/fwCUA4'
  const songInfoUrl = 'https://america250proof.com'

  async function nativeShare() {
    if (
      typeof navigator === 'undefined' ||
      typeof navigator.share !== 'function'
    ) {
      return
    }

    try {
      await navigator.share({
        title: shareTitle,
        text: shareText,
        url: playUrl,
      })
    } catch {
      // User cancelled or platform declined the native share sheet.
      // Existing fallback remains available on non-supporting browsers.
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-100 p-6 text-center">
        <p className="font-bold text-blue-900">Loading results...</p>
      </main>
    )
  }

  if (error || !session || !game) {
    return (
      <main className="min-h-screen bg-slate-100 p-6 text-center">
        <div className="mx-auto max-w-xl rounded-3xl bg-white p-6 shadow-xl">
          <h1 className="text-2xl font-black text-red-700">Results Unavailable</h1>
          <p className="mt-3 text-slate-700">{error || 'Unable to load this result.'}</p>
          <Link href="/" className="mt-6 inline-block rounded-xl bg-blue-900 px-5 py-3 font-bold text-white">
            Return Home
          </Link>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-slate-100 p-5 text-center">
      <div className="mx-auto max-w-2xl rounded-3xl bg-white p-6 shadow-xl">
        <p className="text-sm font-bold uppercase tracking-wide text-red-700">
          {campaign?.title || 'History Hunt™'}
        </p>

        <h1 className="mt-2 text-4xl font-black text-blue-900">
          {isPerfect ? 'Perfect Score!' : 'Hunt Completed!'}
        </h1>

        <p className="mt-2 text-slate-700">
          Nice work{player?.first_name ? `, ${player.first_name}` : ''}.
        </p>

        <div className="mt-6 rounded-2xl border border-blue-200 bg-blue-50 p-5">
          <p className="text-lg text-slate-700">Your Score</p>
          <p className="mt-2 text-5xl font-black text-blue-900">
            {session.score} / {session.total_points}
          </p>
        </div>

        {badgeUrl && (
          <section className="mt-6">
            <img
              src={badgeUrl}
              alt={isPerfect ? 'Perfect Score Badge' : 'Completed Hunt Badge'}
              className="mx-auto w-56 rounded-2xl shadow-md"
            />

            {game.badge_download_enabled !== false && (
              <a
                href={badgeUrl}
                download
                className="mt-4 inline-flex items-center justify-center gap-2 rounded-xl bg-blue-900 px-5 py-3 font-bold text-white"
              >
                <img src="/icons/actions/download.svg" alt="" className="h-5 w-5" aria-hidden="true" />
                Save Badge
              </a>
            )}
          </section>
        )}

        {game.badge_share_enabled !== false && nativeShareSupported && (
          <section className="mt-8 border-t border-slate-200 pt-6 text-center">
            <h2 className="text-xl font-black text-blue-900">Share Your Badge</h2>
            <p className="mt-2 text-slate-700">
              Open your phone&apos;s share sheet to post, text, or send this hunt.
            </p>

            <button
              type="button"
              onClick={nativeShare}
              className="mt-5 inline-flex items-center justify-center rounded-xl bg-blue-900 px-6 py-4 text-lg font-bold text-white"
            >
              Share →
            </button>
          </section>
        )}

        {game.badge_share_enabled !== false && !nativeShareSupported && (
          <ShareBar
            shareUrl={playUrl}
            shareTitle={shareTitle}
            shareText={shareText}
          />
        )}

        <section className="mt-8 border-t border-slate-200 pt-6">
          <h2 className="text-xl font-black text-blue-900">Keep Exploring</h2>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <a
              href={listenUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="block rounded-xl bg-red-600 p-4 text-lg font-bold text-white"
            >
              Listen to the Song →
            </a>

            <a
              href={songInfoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="block rounded-xl bg-blue-900 p-4 text-lg font-bold text-white"
            >
              More About the Song →
            </a>
          </div>
        </section>
      </div>
    </main>
  )
}
