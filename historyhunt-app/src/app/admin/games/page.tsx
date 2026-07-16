'use client'

import { useMemo, useState } from 'react'

type AdminGameRow = {
  gameId: string
  title: string
  gameSlug: string
  qrSlug: string
  publicPlayUrl: string
  status: string
  active: boolean
  campaignTitle: string
  campaignSlug: string
  venueName: string
  registrationRequired: boolean
  allowAnonymousPlayers: boolean
  startsAt: string | null
  endsAt: string | null
  questionCount: number
  totalPoints: number
  createdAt: string | null
  updatedAt: string | null
  latestImportBatchNumber: string
  workbookName: string
  workbookVersion: string
  importerVersion: string
  reviewStatus: string
  importStatus: string
  hasQuestions: boolean
  hasBadgeConfig: boolean
  hasShareUrl: boolean
  playableNow: boolean
  reasonNotPlayable: string
}

type AdminGamesResponse = {
  generatedAt: string
  summary: {
    gameCount: number
    playableCount: number
    activeCount: number
    draftCount: number
    scheduledCount: number
    archivedCount: number
  }
  games: AdminGameRow[]
}

const STATUS_OPTIONS = [
  'draft',
  'scheduled',
  'countdown',
  'active',
  'completed',
  'archived',
]

function formatDate(value: string | null) {
  if (!value) return '—'

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value

  return date.toLocaleString()
}

function toDateTimeLocal(value: string | null) {
  if (!value) return ''

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''

  const offsetMs = date.getTimezoneOffset() * 60 * 1000
  const local = new Date(date.getTime() - offsetMs)

  return local.toISOString().slice(0, 16)
}

function yesNo(value: boolean) {
  return value ? 'Yes' : 'No'
}

function statusClass(status: string) {
  const normalized = status.toLowerCase()

  if (normalized === 'active') return 'bg-green-100 text-green-800 border-green-200'
  if (normalized === 'scheduled' || normalized === 'countdown') return 'bg-yellow-100 text-yellow-800 border-yellow-200'
  if (normalized === 'draft') return 'bg-gray-100 text-gray-800 border-gray-200'
  if (normalized === 'completed') return 'bg-blue-100 text-blue-800 border-blue-200'
  if (normalized === 'archived') return 'bg-red-100 text-red-800 border-red-200'

  return 'bg-gray-100 text-gray-800 border-gray-200'
}

function healthClass(value: boolean) {
  return value
    ? 'bg-green-100 text-green-800 border-green-200'
    : 'bg-red-100 text-red-800 border-red-200'
}

function Pill({
  children,
  className = '',
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-1 text-xs font-semibold ${className}`}>
      {children}
    </span>
  )
}

export default function AdminGamesPage() {
  const [adminToken, setAdminToken] = useState('')
  const [results, setResults] = useState<AdminGamesResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [updatingGameId, setUpdatingGameId] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [dateInputs, setDateInputs] = useState<Record<string, { startsAt: string; endsAt: string }>>({})

  const sortedGames = useMemo(() => {
    if (!results) return []

    return [...results.games].sort((a, b) => {
      const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0
      const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0
      return bTime - aTime
    })
  }, [results])

  async function loadGames() {
    setLoading(true)
    setError('')
    setMessage('')
    setResults(null)

    if (!adminToken.trim()) {
      setError('Enter the admin token before loading games.')
      setLoading(false)
      return
    }

    try {
      const response = await fetch('/api/admin/games', {
        headers: {
          'x-admin-token': adminToken.trim(),
        },
      })

      const payload = await response.json()

      if (!response.ok) {
        throw new Error(payload.error || `Request failed with HTTP ${response.status}`)
      }

      setResults(payload)

      const nextDateInputs: Record<string, { startsAt: string; endsAt: string }> = {}
      for (const game of payload.games as AdminGameRow[]) {
        nextDateInputs[game.gameId] = {
          startsAt: toDateTimeLocal(game.startsAt),
          endsAt: toDateTimeLocal(game.endsAt),
        }
      }
      setDateInputs(nextDateInputs)
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load games.')
    } finally {
      setLoading(false)
    }
  }

  async function updateGame(
    game: AdminGameRow,
    action: string,
    extraBody: Record<string, unknown> = {}
  ) {
    if (!adminToken.trim()) {
      setError('Enter the admin token before updating games.')
      return
    }

    setUpdatingGameId(game.gameId)
    setError('')
    setMessage('')

    try {
      const response = await fetch('/api/admin/games/update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-token': adminToken.trim(),
        },
        body: JSON.stringify({
          gameId: game.gameId,
          action,
          ...extraBody,
        }),
      })

      const payload = await response.json()

      if (!response.ok) {
        throw new Error(payload.error || `Update failed with HTTP ${response.status}`)
      }

      setMessage(`Updated ${game.title || game.gameSlug}.`)
      await loadGames()
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : 'Unable to update game.')
    } finally {
      setUpdatingGameId('')
    }
  }

  function setDateInput(gameId: string, field: 'startsAt' | 'endsAt', value: string) {
    setDateInputs(current => ({
      ...current,
      [gameId]: {
        startsAt: current[gameId]?.startsAt || '',
        endsAt: current[gameId]?.endsAt || '',
        [field]: value,
      },
    }))
  }

  async function copyUrl(url: string) {
    if (!url) return

    try {
      await navigator.clipboard.writeText(url)
      setMessage('Public play URL copied.')
    } catch {
      setError('Unable to copy URL from this browser.')
    }
  }

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6">
          <p className="text-sm font-semibold uppercase tracking-wide text-blue-700">
            History Hunt™ Admin
          </p>
          <h1 className="mt-2 text-3xl font-bold text-gray-900">
            Games Dashboard
          </h1>
          <p className="mt-2 max-w-3xl text-gray-600">
            Review imported games, check playability, and control status, registration,
            anonymous play, and availability windows without using SQL.
          </p>
        </div>

        <section className="mb-6 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <label className="block text-sm font-semibold text-gray-700" htmlFor="admin-token">
            Admin token
          </label>
          <div className="mt-2 flex flex-col gap-3 sm:flex-row">
            <input
              id="admin-token"
              type="password"
              value={adminToken}
              onChange={event => setAdminToken(event.target.value)}
              placeholder="Enter admin token"
              className="min-w-0 flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
            />
            <button
              type="button"
              onClick={loadGames}
              disabled={loading}
              className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-blue-300"
            >
              {loading ? 'Loading…' : 'Load games'}
            </button>
          </div>

          {error ? (
            <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
              {error}
            </div>
          ) : null}

          {message ? (
            <div className="mt-4 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800">
              {message}
            </div>
          ) : null}
        </section>

        {results ? (
          <>
            <section className="mb-6 grid gap-4 md:grid-cols-5">
              <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                <p className="text-sm text-gray-500">Games</p>
                <p className="mt-1 text-2xl font-bold text-gray-900">{results.summary.gameCount}</p>
              </div>
              <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                <p className="text-sm text-gray-500">Playable Now</p>
                <p className="mt-1 text-2xl font-bold text-gray-900">{results.summary.playableCount}</p>
              </div>
              <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                <p className="text-sm text-gray-500">Active</p>
                <p className="mt-1 text-2xl font-bold text-gray-900">{results.summary.activeCount}</p>
              </div>
              <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                <p className="text-sm text-gray-500">Draft</p>
                <p className="mt-1 text-2xl font-bold text-gray-900">{results.summary.draftCount}</p>
              </div>
              <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                <p className="text-sm text-gray-500">Scheduled</p>
                <p className="mt-1 text-2xl font-bold text-gray-900">{results.summary.scheduledCount}</p>
              </div>
            </section>

            <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
              <div className="border-b border-gray-200 p-4">
                <h2 className="text-lg font-semibold text-gray-900">
                  Imported Games
                </h2>
                <p className="mt-1 text-sm text-gray-500">
                  Generated at {formatDate(results.generatedAt)}
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700">Game</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700">Status</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700">Health</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700">Registration</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700">Availability</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700">Import Trace</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700">Actions</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-gray-200 bg-white">
                    {sortedGames.map(game => {
                      const dates = dateInputs[game.gameId] || { startsAt: '', endsAt: '' }
                      const updating = updatingGameId === game.gameId

                      return (
                        <tr key={game.gameId} className="align-top">
                          <td className="max-w-sm px-4 py-4">
                            <div className="font-semibold text-gray-900">
                              {game.title || 'Untitled game'}
                            </div>
                            <div className="mt-1 text-xs text-gray-500">
                              Game slug: <span className="font-mono">{game.gameSlug || '—'}</span>
                            </div>
                            <div className="mt-1 text-xs text-gray-500">
                              QR slug: <span className="font-mono">{game.qrSlug || '—'}</span>
                            </div>
                            <div className="mt-2 text-xs text-gray-600">
                              Campaign: {game.campaignTitle || game.campaignSlug || '—'}
                            </div>
                            <div className="text-xs text-gray-600">
                              Venue: {game.venueName || '—'}
                            </div>
                            <div className="mt-2 flex flex-wrap gap-2">
                              {game.publicPlayUrl ? (
                                <>
                                  <a
                                    href={game.publicPlayUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="rounded-md border border-blue-200 bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-100"
                                  >
                                    Open play URL
                                  </a>
                                  <button
                                    type="button"
                                    onClick={() => copyUrl(game.publicPlayUrl)}
                                    className="rounded-md border border-gray-200 bg-white px-2 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                                  >
                                    Copy URL
                                  </button>
                                </>
                              ) : (
                                <span className="text-xs text-red-600">No public play URL</span>
                              )}
                            </div>
                            <div className="mt-2 text-xs text-gray-500">
                              Created: {formatDate(game.createdAt)}
                            </div>
                            <div className="text-xs text-gray-500">
                              Updated: {formatDate(game.updatedAt)}
                            </div>
                          </td>

                          <td className="px-4 py-4">
                            <div className="flex flex-col gap-2">
                              <Pill className={statusClass(game.status)}>
                                {game.status || '—'}
                              </Pill>
                              <Pill className={game.active ? 'bg-green-100 text-green-800 border-green-200' : 'bg-gray-100 text-gray-800 border-gray-200'}>
                                Active: {yesNo(game.active)}
                              </Pill>
                              <div className="flex flex-wrap gap-1 pt-2">
                                {STATUS_OPTIONS.map(status => (
                                  <button
                                    key={status}
                                    type="button"
                                    disabled={updating}
                                    onClick={() => updateGame(game, 'set-status', { status })}
                                    className="rounded border border-gray-200 bg-white px-2 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                                  >
                                    {status}
                                  </button>
                                ))}
                              </div>
                              <button
                                type="button"
                                disabled={updating}
                                onClick={() => updateGame(game, 'activate')}
                                className="rounded bg-green-700 px-2 py-1 text-xs font-semibold text-white hover:bg-green-800 disabled:opacity-50"
                              >
                                Activate now
                              </button>
                            </div>
                          </td>

                          <td className="px-4 py-4">
                            <div className="flex flex-col gap-2">
                              <Pill className={healthClass(game.playableNow)}>
                                Playable: {yesNo(game.playableNow)}
                              </Pill>
                              {game.reasonNotPlayable ? (
                                <p className="max-w-xs text-xs text-red-700">
                                  {game.reasonNotPlayable}
                                </p>
                              ) : (
                                <p className="text-xs text-green-700">
                                  Ready to play.
                                </p>
                              )}
                              <Pill className={healthClass(game.hasQuestions)}>
                                Questions: {yesNo(game.hasQuestions)}
                              </Pill>
                              <div className="text-xs text-gray-600">
                                {game.questionCount} questions / {game.totalPoints} points
                              </div>
                              <Pill className={game.hasBadgeConfig ? 'bg-green-100 text-green-800 border-green-200' : 'bg-gray-100 text-gray-800 border-gray-200'}>
                                Badge config: {yesNo(game.hasBadgeConfig)}
                              </Pill>
                              <Pill className={game.hasShareUrl ? 'bg-green-100 text-green-800 border-green-200' : 'bg-gray-100 text-gray-800 border-gray-200'}>
                                Share URL: {yesNo(game.hasShareUrl)}
                              </Pill>
                            </div>
                          </td>

                          <td className="px-4 py-4">
                            <div className="flex flex-col gap-2">
                              <Pill className={game.registrationRequired ? 'bg-yellow-100 text-yellow-800 border-yellow-200' : 'bg-gray-100 text-gray-800 border-gray-200'}>
                                Registration required: {yesNo(game.registrationRequired)}
                              </Pill>
                              <Pill className={game.allowAnonymousPlayers ? 'bg-green-100 text-green-800 border-green-200' : 'bg-red-100 text-red-800 border-red-200'}>
                                Anonymous allowed: {yesNo(game.allowAnonymousPlayers)}
                              </Pill>
                              <button
                                type="button"
                                disabled={updating}
                                onClick={() => updateGame(game, 'toggle-registration-required', {
                                  value: !game.registrationRequired,
                                })}
                                className="rounded border border-gray-200 bg-white px-2 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                              >
                                Toggle registration
                              </button>
                              <button
                                type="button"
                                disabled={updating}
                                onClick={() => updateGame(game, 'toggle-allow-anonymous-players', {
                                  value: !game.allowAnonymousPlayers,
                                })}
                                className="rounded border border-gray-200 bg-white px-2 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                              >
                                Toggle anonymous
                              </button>
                            </div>
                          </td>

                          <td className="min-w-72 px-4 py-4">
                            <div className="space-y-2">
                              <div>
                                <label className="block text-xs font-semibold text-gray-600">
                                  Start date/time
                                </label>
                                <input
                                  type="datetime-local"
                                  value={dates.startsAt}
                                  onChange={event => setDateInput(game.gameId, 'startsAt', event.target.value)}
                                  className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-xs text-gray-900"
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-semibold text-gray-600">
                                  End date/time
                                </label>
                                <input
                                  type="datetime-local"
                                  value={dates.endsAt}
                                  onChange={event => setDateInput(game.gameId, 'endsAt', event.target.value)}
                                  className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-xs text-gray-900"
                                />
                              </div>
                              <div className="flex flex-wrap gap-2">
                                <button
                                  type="button"
                                  disabled={updating}
                                  onClick={() => updateGame(game, 'set-dates', {
                                    startsAt: dates.startsAt || null,
                                    endsAt: dates.endsAt || null,
                                  })}
                                  className="rounded bg-blue-700 px-2 py-1 text-xs font-semibold text-white hover:bg-blue-800 disabled:opacity-50"
                                >
                                  Set dates
                                </button>
                                <button
                                  type="button"
                                  disabled={updating}
                                  onClick={() => updateGame(game, 'clear-dates')}
                                  className="rounded border border-gray-200 bg-white px-2 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                                >
                                  Clear dates
                                </button>
                              </div>
                              <div className="text-xs text-gray-500">
                                Current start: {formatDate(game.startsAt)}
                              </div>
                              <div className="text-xs text-gray-500">
                                Current end: {formatDate(game.endsAt)}
                              </div>
                            </div>
                          </td>

                          <td className="max-w-xs px-4 py-4 text-xs text-gray-600">
                            <div>
                              Batch: <span className="font-mono">{game.latestImportBatchNumber || '—'}</span>
                            </div>
                            <div>
                              Workbook: {game.workbookName || '—'}
                            </div>
                            <div>
                              Workbook version: {game.workbookVersion || '—'}
                            </div>
                            <div>
                              Importer version: {game.importerVersion || '—'}
                            </div>
                            <div>
                              Review status: {game.reviewStatus || '—'}
                            </div>
                            <div>
                              Import status: {game.importStatus || '—'}
                            </div>
                          </td>

                          <td className="px-4 py-4 text-xs text-gray-600">
                            {updating ? 'Updating…' : 'Ready'}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        ) : null}
      </div>
    </main>
  )
}
