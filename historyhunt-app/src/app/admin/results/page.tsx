'use client'

import { useMemo, useState } from 'react'

type AdminPlayerResult = {
  playerId: string
  firstName: string
  phoneNumber: string
  email: string
  smsOptIn: boolean
  serviceAffiliation: boolean
  sessionsStarted: number
  sessionsCompleted: number
  bestScore: number
  totalPoints: number
  latestStartedAt: string | null
  latestCompletedAt: string | null
  gamesPlayed: string[]
  responsesRecorded: number
  correctResponses: number
}

type AdminResultsResponse = {
  generatedAt: string
  summary: {
    playerCount: number
    sessionsStarted: number
    sessionsCompleted: number
    responsesRecorded: number
    smsOptInCount: number
    serviceAffiliationCount: number
  }
  players: AdminPlayerResult[]
}

function formatDate(value: string | null) {
  if (!value) return '—'

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value

  return date.toLocaleString()
}

function yesNo(value: boolean) {
  return value ? 'Yes' : 'No'
}

function csvEscape(value: unknown) {
  const text = value === null || value === undefined ? '' : String(value)

  if (/[",\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`
  }

  return text
}

export default function AdminResultsPage() {
  const [adminToken, setAdminToken] = useState('')
  const [results, setResults] = useState<AdminResultsResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const csvText = useMemo(() => {
    if (!results) return ''

    const headers = [
      'First Name',
      'Phone Number',
      'Email',
      'Service Checkbox',
      'SMS/Email Opt-In Checkbox',
      'Sessions Started',
      'Sessions Completed',
      'Best Score',
      'Total Points',
      'Latest Started At',
      'Latest Completed At',
      'Responses Recorded',
      'Correct Responses',
      'Games Played',
      'Player ID',
    ]

    const rows = results.players.map(player => [
      player.firstName,
      player.phoneNumber,
      player.email,
      yesNo(player.serviceAffiliation),
      yesNo(player.smsOptIn),
      player.sessionsStarted,
      player.sessionsCompleted,
      player.bestScore,
      player.totalPoints,
      player.latestStartedAt || '',
      player.latestCompletedAt || '',
      player.responsesRecorded,
      player.correctResponses,
      player.gamesPlayed.join('; '),
      player.playerId,
    ])

    return [headers, ...rows]
      .map(row => row.map(csvEscape).join(','))
      .join('\n')
  }, [results])

  async function loadResults() {
    setLoading(true)
    setError('')
    setResults(null)

    if (!adminToken.trim()) {
      setError('Enter the admin token before loading player results.')
      setLoading(false)
      return
    }

    try {
      const response = await fetch('/api/admin/results', {
        method: 'GET',
        headers: {
          'x-admin-token': adminToken.trim(),
        },
        cache: 'no-store',
      })

      const body = await response.json().catch(() => ({})) as Partial<AdminResultsResponse> & {
        error?: string
      }

      if (!response.ok) {
        throw new Error(body.error || `Unable to load results. Status ${response.status}.`)
      }

      if (!body.summary || !Array.isArray(body.players)) {
        throw new Error('Results API returned an invalid response.')
      }

      setResults(body as AdminResultsResponse)
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unable to load admin results.'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  function downloadCsv() {
    if (!csvText) return

    const blob = new Blob([csvText], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `history-hunt-admin-results-${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
  }

  return (
    <main className="min-h-screen bg-slate-100 p-6">
      <div className="mx-auto max-w-7xl">
        <div className="rounded-3xl bg-white p-6 shadow-xl">
          <p className="text-sm font-bold uppercase tracking-wide text-red-600">
            History Hunt™ Admin
          </p>
          <h1 className="mt-2 text-3xl font-bold text-blue-900">
            Player Results Dashboard
          </h1>
          <p className="mt-3 text-gray-600">
            Secure admin view for player count, contact fields, checkbox answers, sessions, scores, and response totals.
          </p>

          <div className="mt-6 rounded-2xl border border-orange-200 bg-orange-50 p-4">
            <label className="block text-sm font-bold uppercase tracking-wide text-orange-900">
              Admin Token
            </label>
            <div className="mt-2 flex flex-col gap-3 md:flex-row">
              <input
                type="password"
                value={adminToken}
                disabled={loading}
                onChange={event => setAdminToken(event.target.value)}
                className="block w-full rounded-xl border bg-white p-3"
                placeholder="Enter Dev-Test admin token"
                autoComplete="off"
              />
              <button
                type="button"
                disabled={loading || !adminToken.trim()}
                onClick={loadResults}
                className="rounded-xl bg-blue-900 px-6 py-3 font-bold text-white disabled:cursor-not-allowed disabled:bg-gray-400"
              >
                {loading ? 'Loading...' : 'Load Results'}
              </button>
            </div>
            <p className="mt-2 text-sm text-orange-900">
              Results are loaded through a protected server route using the server-side Supabase client.
            </p>
          </div>

          {error && (
            <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 font-semibold text-red-700">
              {error}
            </div>
          )}
        </div>

        {results && (
          <>
            <div className="mt-6 grid gap-4 md:grid-cols-3 lg:grid-cols-6">
              <div className="rounded-2xl bg-white p-4 shadow">
                <p className="text-sm text-gray-500">Players</p>
                <p className="text-3xl font-bold text-blue-900">{results.summary.playerCount}</p>
              </div>
              <div className="rounded-2xl bg-white p-4 shadow">
                <p className="text-sm text-gray-500">Sessions Started</p>
                <p className="text-3xl font-bold text-blue-900">{results.summary.sessionsStarted}</p>
              </div>
              <div className="rounded-2xl bg-white p-4 shadow">
                <p className="text-sm text-gray-500">Sessions Completed</p>
                <p className="text-3xl font-bold text-blue-900">{results.summary.sessionsCompleted}</p>
              </div>
              <div className="rounded-2xl bg-white p-4 shadow">
                <p className="text-sm text-gray-500">Responses</p>
                <p className="text-3xl font-bold text-blue-900">{results.summary.responsesRecorded}</p>
              </div>
              <div className="rounded-2xl bg-white p-4 shadow">
                <p className="text-sm text-gray-500">Service Checkbox</p>
                <p className="text-3xl font-bold text-blue-900">{results.summary.serviceAffiliationCount}</p>
              </div>
              <div className="rounded-2xl bg-white p-4 shadow">
                <p className="text-sm text-gray-500">SMS/Email Opt-In</p>
                <p className="text-3xl font-bold text-blue-900">{results.summary.smsOptInCount}</p>
              </div>
            </div>

            <div className="mt-6 rounded-3xl bg-white p-6 shadow-xl">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-blue-900">Players</h2>
                  <p className="text-sm text-gray-500">
                    Generated {formatDate(results.generatedAt)}
                  </p>
                </div>
                <button
                  type="button"
                  disabled={!csvText}
                  onClick={downloadCsv}
                  className="rounded-xl bg-green-700 px-5 py-3 font-bold text-white disabled:cursor-not-allowed disabled:bg-gray-400"
                >
                  Download CSV
                </button>
              </div>

              <div className="mt-6 overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead>
                    <tr className="border-b bg-slate-50 text-xs uppercase tracking-wide text-gray-500">
                      <th className="p-3">Name</th>
                      <th className="p-3">Phone</th>
                      <th className="p-3">Email</th>
                      <th className="p-3">Service</th>
                      <th className="p-3">Opt-In</th>
                      <th className="p-3">Started</th>
                      <th className="p-3">Completed</th>
                      <th className="p-3">Best</th>
                      <th className="p-3">Responses</th>
                      <th className="p-3">Correct</th>
                      <th className="p-3">Latest Started</th>
                      <th className="p-3">Latest Completed</th>
                      <th className="p-3">Games</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.players.length === 0 && (
                      <tr>
                        <td className="p-4 text-gray-500" colSpan={13}>
                          No players found in this environment.
                        </td>
                      </tr>
                    )}

                    {results.players.map(player => (
                      <tr key={player.playerId} className="border-b align-top hover:bg-slate-50">
                        <td className="p-3 font-bold text-blue-900">{player.firstName || '—'}</td>
                        <td className="p-3">{player.phoneNumber || '—'}</td>
                        <td className="p-3">{player.email || '—'}</td>
                        <td className="p-3">{yesNo(player.serviceAffiliation)}</td>
                        <td className="p-3">{yesNo(player.smsOptIn)}</td>
                        <td className="p-3">{player.sessionsStarted}</td>
                        <td className="p-3">{player.sessionsCompleted}</td>
                        <td className="p-3">
                          {player.bestScore}/{player.totalPoints}
                        </td>
                        <td className="p-3">{player.responsesRecorded}</td>
                        <td className="p-3">{player.correctResponses}</td>
                        <td className="p-3 whitespace-nowrap">{formatDate(player.latestStartedAt)}</td>
                        <td className="p-3 whitespace-nowrap">{formatDate(player.latestCompletedAt)}</td>
                        <td className="max-w-xs p-3">
                          {player.gamesPlayed.length > 0 ? player.gamesPlayed.join(', ') : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </main>
  )
}
