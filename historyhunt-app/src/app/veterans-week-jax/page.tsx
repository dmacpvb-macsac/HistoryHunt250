'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'

type Game = {
  title: string
  gameSlug: string
  publicPlayUrl?: string
  gameType?: string
}

const causes = [
  {
    key: 'wwp',
    title: 'Wounded Warrior Project & Carry Forward',
    details: 'Explore the history of service, wounded warriors and the people who carry their mission forward.',
    match: /wounded|warrior|carry[\s-]?forward|\bwwp\b/i,
  },
  {
    key: 'vub',
    title: 'Veterans United & Jacksonville Community',
    details: 'Learn about Jacksonville veterans, local service and the community around Veterans United.',
    match: /veterans?[\s-]?united|\bvub\b|veterans?[\s-]?brewery/i,
  },
  {
    key: 'local',
    title: 'Jacksonville Veterans & Military Heritage',
    details: 'Discover our local military heritage and the stories of those who served.',
    match: /veteran|military|navy|marine|coast[\s-]?guard|service[\s-]?member/i,
  },
]

const events = [
  { date: 'NOV 6', title: 'Veterans Week History Hunt launch' },
  { date: 'NOV 7', title: 'WWP Carry Forward 5K' },
  { date: 'NOV 9', title: 'Plantation Navy Appreciation Day' },
  { date: 'NOV 11', title: 'Jacksonville Veterans Day Parade' },
  { date: 'NOV 12', title: 'Foodies Care Vines & Steins · 4–7 PM' },
]

function categoryFor(game: Game) {
  const text = [game.title, game.gameSlug].join(' ')
  return causes.find(cause => cause.match.test(text))?.key
}

export default function VeteransWeekJaxPage() {
  const [games, setGames] = useState<Game[]>([])
  const [loading, setLoading] = useState(true)
  const [loadFailed, setLoadFailed] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function fetchGames() {
      try {
        const response = await fetch('/api/games/current', { cache: 'no-store' })
        if (!response.ok) throw new Error('Game directory unavailable')
        const data = await response.json()
        if (!cancelled) {
          setGames(Array.isArray(data.games) ? (data.games as Game[]).filter(game => Boolean(game.gameSlug)) : [])
        }
      } catch {
        if (!cancelled) setLoadFailed(true)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchGames()
    return () => { cancelled = true }
  }, [])

  const featured = useMemo(
    () => causes.map(cause => ({
      ...cause,
      games: games.filter(game => categoryFor(game) === cause.key),
    })),
    [games]
  )
  const anyFeatured = featured.some(cause => cause.games.length > 0)

  return (
    <main className="min-h-screen bg-slate-100 text-slate-900">
      <header className="bg-gradient-to-br from-slate-950 via-blue-950 to-red-950 px-5 py-12 text-white sm:py-20">
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-wrap items-center justify-between gap-5">
            <Link href="/" className="flex items-center gap-3 rounded-xl bg-white/10 px-4 py-2 font-bold hover:bg-white/20">
              <img src="/history-hunt-logo.png" alt="" className="h-9 w-9 object-contain" />
              History Hunt Games™
            </Link>
            <span className="text-sm font-semibold uppercase tracking-widest text-amber-200">
              Jacksonville · November 6–12, 2026
            </span>
          </div>
          <p className="mt-12 text-sm font-black uppercase tracking-[0.22em] text-amber-300">
            America 250 Proof™ · Mac &amp; Sac Enterprises
          </p>
          <h1 className="mt-4 max-w-5xl text-4xl font-black leading-tight sm:text-6xl">
            Our Veterans Deserve <span className="text-amber-300">More Than One Day.</span>
          </h1>
          <p className="mt-6 max-w-3xl text-lg leading-relaxed text-slate-200">
            A week of gratitude, community traditions, interactive history and giving back.
            Discover a veteran-themed History Hunt, celebrate Jacksonville and support the causes that serve our community.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a href="#veteran-hunts" className="rounded-xl bg-red-700 px-6 py-4 font-bold text-white hover:bg-red-600">
              Play the Veterans Hunts ↓
            </a>
            <a href="#support" className="rounded-xl border border-white/50 px-6 py-4 font-bold text-white hover:bg-white/10">
              Ways to Give Back
            </a>
          </div>
          <p className="mt-7 text-sm text-slate-300">
            In collaboration with BUZZ Media. No purchase or donation is required to play.
          </p>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-5 py-12">
        <h2 className="text-3xl font-black text-blue-950">A Week of Appreciation</h2>
        <p className="mt-2 max-w-3xl text-slate-600">
          Events organized by Jacksonville nonprofits, residents, volunteers and civic partners.
        </p>
        <div className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {events.map(event => (
            <article key={event.date} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="font-black tracking-widest text-red-700">{event.date}</p>
              <p className="mt-2 font-semibold text-blue-950">{event.title}</p>
            </article>
          ))}
        </div>
        <p className="mt-4 text-sm text-slate-600">
          Navy Appreciation Day is a special community-hosted appreciation tradition at The Plantation at Ponte Vedra Beach,
          not an open public registration event.
        </p>
      </section>

      <section id="veteran-hunts" className="bg-white px-5 py-14">
        <div className="mx-auto max-w-6xl">
          <p className="text-sm font-black uppercase tracking-widest text-red-700">History Hunt™</p>
          <h2 className="mt-2 text-3xl font-black text-blue-950 sm:text-4xl">Veterans History Hunt Collection</h2>
          <p className="mt-3 max-w-3xl text-slate-600">
            Each game is drawn from the live History Hunt catalog. Games from earlier events are displayed
            only when they are currently active and playable.
          </p>
          {loading && <p role="status" className="mt-7 text-slate-600">Checking active games…</p>}
          {loadFailed && (
            <p role="status" className="mt-7 rounded-xl border border-amber-200 bg-amber-50 p-5 text-amber-950">
              We could not load the current games right now. Browse the{' '}
              <a href="https://historyhuntgames.com/games.html" className="font-bold underline">full game catalog</a>.
            </p>
          )}
          {!loading && !loadFailed && !anyFeatured && (
            <div className="mt-7 rounded-2xl border border-slate-200 bg-slate-50 p-6">
              <p className="font-bold text-blue-950">No currently active veterans games were returned.</p>
              <p className="mt-2 text-slate-600">Previous event games may be paused. We do not reopen historic games automatically.</p>
              <a className="mt-4 inline-block font-bold text-red-700 underline" href="https://historyhuntgames.com/games.html">
                Explore the full History Hunt catalog →
              </a>
            </div>
          )}
          {!loading && !loadFailed && featured.map(cause => (
            cause.games.length > 0 && (
              <section key={cause.key} className="mt-10">
                <h3 className="text-2xl font-black text-blue-950">{cause.title}</h3>
                <p className="mt-2 text-slate-600">{cause.details}</p>
                <div className="mt-5 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {cause.games.map(game => (
                    <article key={game.gameSlug} className="flex flex-col rounded-2xl border border-slate-200 bg-slate-50 p-6">
                      <p className="text-xs font-black uppercase tracking-wider text-red-700">Play Now · History Hunt™</p>
                      <h4 className="mt-3 flex-1 text-xl font-black text-blue-950">{game.title}</h4>
                      <a
                        className="mt-6 rounded-xl bg-blue-950 px-5 py-3 text-center font-bold text-white hover:bg-blue-800"
                        href={game.publicPlayUrl || '/play/' + encodeURIComponent(game.gameSlug)}
                      >
                        Start This Hunt →
                      </a>
                    </article>
                  ))}
                </div>
              </section>
            )
          ))}
          <p className="mt-8 text-sm text-slate-500">
            Hunt availability changes by event schedule. Games are educational activities; donations are optional and independent.
          </p>
        </div>
      </section>

      <section id="support" className="bg-blue-950 px-5 py-14 text-white">
        <div className="mx-auto max-w-6xl">
          <p className="text-sm font-black uppercase tracking-widest text-amber-300">Turn Gratitude Into Action</p>
          <h2 className="mt-2 text-3xl font-black sm:text-4xl">Support the Mission</h2>
          <p className="mt-3 max-w-3xl text-slate-200">
            These links take you directly to the organization. History Hunt and Mac &amp; Sac do not collect donations through this page.
          </p>
          <div className="mt-8 grid gap-5 md:grid-cols-2">
            <article className="rounded-2xl border border-white/20 bg-white/10 p-6">
              <h3 className="text-2xl font-bold text-amber-200">Wounded Warrior Project</h3>
              <p className="mt-3 text-slate-200">Support wounded warriors and their families, including the Carry Forward community.</p>
              <a href="https://www.woundedwarriorproject.org/donate" target="_blank" rel="noopener noreferrer" className="mt-5 inline-block rounded-xl bg-red-700 px-5 py-3 font-bold text-white hover:bg-red-600">
                Donate directly to WWP ↗
              </a>
            </article>
            <article className="rounded-2xl border border-white/20 bg-white/10 p-6">
              <h3 className="text-2xl font-bold text-amber-200">Foodies Care · Vines &amp; Steins</h3>
              <p className="mt-3 text-slate-200">Join a November 12 community fundraiser supporting local nonprofit causes.</p>
              <a href="https://foodiescare.org/event/vines-steins/" target="_blank" rel="noopener noreferrer" className="mt-5 inline-block rounded-xl bg-red-700 px-5 py-3 font-bold text-white hover:bg-red-600">
                Event information ↗
              </a>
            </article>
          </div>
          <p className="mt-6 text-xs leading-relaxed text-slate-300">
            Inclusion of nonprofit organizations and local events does not imply their endorsement of these games.
            No contribution is required to participate in History Hunt.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-14 text-center">
        <h2 className="text-3xl font-black text-blue-950">The Jacksonville Veterans Week Soundtrack</h2>
        <p className="mx-auto mt-3 max-w-2xl text-slate-600">
          Our Veterans Week soundtrack brings together America 250 Proof™ and an expanding collection
          of patriotic songs and Jacksonville artists. Listen here or open the playlist in Spotify.
        </p>
        <div className="mx-auto mt-7 w-full max-w-3xl overflow-hidden rounded-2xl bg-white p-3 shadow-lg">
          <iframe
            title="America 250 Proof Veterans Week Spotify playlist"
            src="https://open.spotify.com/embed/playlist/25oVRMdBoJYCEWvrf7QGns"
            width="100%"
            height="352"
            allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
            loading="lazy"
            className="rounded-xl"
          />
        </div>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <a
            className="inline-block rounded-xl bg-green-700 px-6 py-4 font-bold text-white hover:bg-green-600"
            href="https://open.spotify.com/playlist/25oVRMdBoJYCEWvrf7QGns"
            target="_blank"
            rel="noopener noreferrer"
          >
            Listen on Spotify ↗
          </a>
          <a
            className="inline-block rounded-xl bg-blue-950 px-6 py-4 font-bold text-white hover:bg-blue-800"
            href="https://america250proof.com/"
            target="_blank"
            rel="noopener noreferrer"
          >
            Explore America 250 Proof™ →
          </a>
        </div>
      </section>

      <footer className="bg-slate-950 px-5 py-8 text-center text-sm text-slate-300">
        <p>America 250 Proof™ · Mac &amp; Sac Enterprises LLC · In collaboration with BUZZ Media</p>
        <nav className="mt-3 flex flex-wrap justify-center gap-x-5 gap-y-2" aria-label="Related Veterans Week websites">
          <a className="underline hover:text-white" href="https://macandsac.com/initiatives/veterans-week-2026/" target="_blank" rel="noopener noreferrer">
            Mac &amp; Sac Veterans Week
          </a>
          <a className="underline hover:text-white" href="https://america250proof.com/" target="_blank" rel="noopener noreferrer">
            America 250 Proof™
          </a>
          <a className="underline hover:text-white" href="https://open.spotify.com/playlist/25oVRMdBoJYCEWvrf7QGns" target="_blank" rel="noopener noreferrer">
            Spotify Soundtrack
          </a>
        </nav>
        <p className="mt-3">Our Veterans Deserve More Than One Day.</p>
      </footer>
    </main>
  )
}
