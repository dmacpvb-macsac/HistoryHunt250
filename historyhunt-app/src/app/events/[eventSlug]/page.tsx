'use client'

import Link from 'next/link'
import { use, useEffect, useState } from 'react'

import type { EventHubResponse } from '@/lib/events/types'

function statusLabel(status: string) {
  if (status === 'upcoming') return 'Coming Soon'
  if (status === 'ended') return 'Ended'
  if (status === 'available') return 'Play Now'
  return 'Unavailable'
}

export default function EventPage({
  params,
}: {
  params: Promise<{ eventSlug: string }>
}) {
  const { eventSlug } = use(params)
  const [data, setData] = useState<EventHubResponse | null>(null)
  const [error, setError] = useState('')
  const [completedSlugs, setCompletedSlugs] = useState<Set<string>>(new Set())

  useEffect(() => {
    let cancelled = false

    async function loadEvent() {
      try {
        const response = await fetch(`/api/events/${encodeURIComponent(eventSlug)}`, {
          cache: 'no-store',
        })
        const body = await response.json().catch(() => ({}))
        if (!response.ok) throw new Error(body.error || 'Unable to load this event.')
        if (!cancelled) {
          const eventData = body as EventHubResponse
          setData(eventData)
          setCompletedSlugs(new Set(
            eventData.games
              .filter(game => localStorage.getItem(`history_hunt_event_completed:${eventSlug}:${game.slug}`))
              .map(game => game.slug)
          ))
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : 'Unable to load this event.')
        }
      }
    }

    loadEvent()
    return () => { cancelled = true }
  }, [eventSlug])

  if (error) {
    return (
      <main className="min-h-screen bg-slate-100 p-6 text-center">
        <div className="mx-auto max-w-xl rounded-3xl bg-white p-8 shadow-xl">
          <h1 className="text-3xl font-black text-blue-950">Event Unavailable</h1>
          <p className="mt-3 text-slate-700">{error}</p>
          <Link href="/" className="mt-6 inline-block rounded-xl bg-blue-900 px-5 py-3 font-bold text-white">
            Return Home
          </Link>
        </div>
      </main>
    )
  }

  if (!data) {
    return <main className="min-h-screen bg-slate-950 p-8 text-center font-bold text-white">Loading event…</main>
  }

  const { primaryColor, secondaryColor, accentColor } = data.event

  return (
    <main className="min-h-screen pb-14" style={{ backgroundColor: secondaryColor }}>
      <header className="px-5 py-8 text-white sm:py-10" style={{ backgroundColor: primaryColor }}>
        <div className="mx-auto flex max-w-5xl flex-col items-center gap-6 text-center sm:flex-row sm:text-left">
          {data.event.logoImageUrl && (
            <img
              src={data.event.logoImageUrl}
              alt={`${data.event.title} logo`}
              className="h-36 w-auto max-w-[12rem] object-contain drop-shadow-xl sm:h-44"
            />
          )}
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.2em]" style={{ color: accentColor }}>History Hunt Event</p>
            <h1 className="mt-2 text-4xl font-black sm:text-5xl">{data.event.title}</h1>
            {data.event.subtitle && <p className="mt-2 text-xl font-bold text-white/85">{data.event.subtitle}</p>}
            {data.event.description && <p className="mt-4 max-w-3xl text-lg text-white/90">{data.event.description}</p>}
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-5xl gap-8 px-5 py-10 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <section>
          <h2 className="text-3xl font-black" style={{ color: primaryColor }}>Choose a Game</h2>
          <p className="mt-2 text-slate-700">Play any game in any order. Your best completed score in each game counts.</p>
          <div className="mt-6 grid gap-5 sm:grid-cols-2">
            {data.games.map((game, index) => {
              const playable = game.status === 'available'
              const completed = completedSlugs.has(game.slug)
              return (
                <article key={game.gameId} className="flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-bold uppercase tracking-wide" style={{ color: accentColor }}>Game {index + 1}</p>
                    {completed && <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-bold text-green-800">Completed</span>}
                  </div>
                  <h3 className="mt-1 text-2xl font-black" style={{ color: primaryColor }}>{game.title}</h3>
                  {game.description && <p className="mt-3 flex-1 text-slate-700">{game.description}</p>}
                  <p className="mt-4 text-sm font-semibold text-slate-500">{game.questionCount} questions · {game.totalPoints} points</p>
                  {playable ? (
                    <Link href={game.playUrl} className="mt-5 rounded-xl px-5 py-3 text-center text-lg font-bold text-white hover:opacity-90" style={{ backgroundColor: primaryColor }}>
                      {statusLabel(game.status)} →
                    </Link>
                  ) : (
                    <span className="mt-5 rounded-xl bg-slate-200 px-5 py-3 text-center font-bold text-slate-600">{statusLabel(game.status)}</span>
                  )}
                </article>
              )
            })}
          </div>
        </section>

        <aside>
          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <h2 className="text-2xl font-black" style={{ color: primaryColor }}>Leaderboard</h2>
            {!data.event.leaderboardEnabled ? (
              <p className="mt-3 text-slate-600">Leaderboard coming soon.</p>
            ) : data.leaderboard.length === 0 ? (
              <p className="mt-3 text-slate-600">Be the first player on the board.</p>
            ) : (
              <ol className="mt-4 space-y-3">
                {data.leaderboard.map(entry => (
                  <li key={`${entry.rank}-${entry.displayName}`} className="grid grid-cols-[2rem_1fr_auto] items-center gap-2 border-b border-slate-100 pb-3">
                    <span className="font-black" style={{ color: accentColor }}>{entry.rank}</span>
                    <span>
                      <span className="block font-bold" style={{ color: primaryColor }}>{entry.displayName}</span>
                      <span className="text-xs text-slate-500">{entry.gamesCompleted} of {data.games.length} games</span>
                    </span>
                    <span className="font-black" style={{ color: primaryColor }}>{entry.totalScore}</span>
                  </li>
                ))}
              </ol>
            )}
            <p className="mt-4 text-xs leading-relaxed text-slate-500">Only players who choose a Game Play User Name and opt in appear publicly. Contact details are never shown.</p>
          </div>
        </aside>
      </div>
    </main>
  )
}
