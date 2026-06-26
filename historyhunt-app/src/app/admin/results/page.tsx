'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

type PlayerInfo = {
  first_name: string
  phone_number: string | null
  email: string | null
  sms_opt_in: boolean
  service_affiliation: boolean
}

type GameInfo = {
  title: string
  slug: string
}

type VenueInfo = {
  name: string
  slug: string
  qr_slug: string
}

type ResultRow = {
  session_id: string
  score: number
  total_points: number
  completed: boolean
  completed_at: string | null
  created_at: string | null
  players: PlayerInfo[] | PlayerInfo | null
  games: GameInfo[] | GameInfo | null
  venues: VenueInfo[] | VenueInfo | null
}

function one<T>(value: T[] | T | null): T | null {
  if (!value) return null
  return Array.isArray(value) ? value[0] || null : value
}

export default function AdminResultsPage() {
  const [rows, setRows] = useState<ResultRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function loadResults() {
      const { data, error } = await supabase
        .from('sessions')
        .select(`
          session_id,
          score,
          total_points,
          completed,
          completed_at,
          created_at,
          players (
            first_name,
            phone_number,
            email,
            sms_opt_in,
            service_affiliation
          ),
          games (
            title,
            slug
          ),
          venues (
            name,
            slug,
            qr_slug
          )
        `)
        .order('created_at', { ascending: false })

      if (error) {
        setError(error.message)
      } else {
        setRows((data || []) as unknown as ResultRow[])
      }

      setLoading(false)
    }

    loadResults()
  }, [])

  if (loading) {
    return <main className="p-8">Loading results...</main>
  }

  if (error) {
    return (
      <main className="p-8">
        <h1 className="text-2xl font-bold text-red-600">Admin Results Error</h1>
        <p className="mt-4">{error}</p>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-slate-100 p-6">
      <div className="max-w-7xl mx-auto bg-white rounded-2xl shadow-xl p-6">
        <h1 className="text-3xl font-bold text-blue-900">
          History Hunt Admin Results
        </h1>

        <p className="text-gray-600 mt-2">
          Simple MVP results dashboard for Freedom Fest testing.
        </p>

        <div className="mt-6 overflow-x-auto">
          <table className="min-w-full border border-gray-200 text-sm">
            <thead className="bg-blue-900 text-white">
              <tr>
                <th className="p-3 text-left">Player</th>
                <th className="p-3 text-left">Phone</th>
                <th className="p-3 text-left">Email</th>
                <th className="p-3 text-left">Score</th>
                <th className="p-3 text-left">Completed</th>
                <th className="p-3 text-left">Service</th>
                <th className="p-3 text-left">SMS</th>
                <th className="p-3 text-left">Venue</th>
                <th className="p-3 text-left">Game</th>
                <th className="p-3 text-left">Completed At</th>
              </tr>
            </thead>

            <tbody>
              {rows.map(row => {
                const player = one(row.players)
                const game = one(row.games)
                const venue = one(row.venues)

                return (
                  <tr key={row.session_id} className="border-t">
                    <td className="p-3 font-semibold">
                      {player?.first_name || 'Unknown'}
                    </td>

                    <td className="p-3">
                      {player?.phone_number || '-'}
                    </td>

                    <td className="p-3">
                      {player?.email || '-'}
                    </td>

                    <td className="p-3 font-bold">
                      {row.score} / {row.total_points}
                    </td>

                    <td className="p-3">
                      {row.completed ? '✅ Yes' : '⏳ No'}
                    </td>

                    <td className="p-3">
                      {player?.service_affiliation ? '✅ Yes' : '-'}
                    </td>

                    <td className="p-3">
                      {player?.sms_opt_in ? '✅ Yes' : '-'}
                    </td>

                    <td className="p-3">
                      {venue?.name || '-'}
                    </td>

                    <td className="p-3">
                      {game?.title || '-'}
                    </td>

                    <td className="p-3">
                      {row.completed_at
                        ? new Date(row.completed_at).toLocaleString()
                        : '-'}
                    </td>
                  </tr>
                )
              })}

              {rows.length === 0 && (
                <tr>
                  <td className="p-6 text-center text-gray-500" colSpan={10}>
                    No sessions yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  )
}