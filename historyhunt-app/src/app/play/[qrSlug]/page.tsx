'use client'

import { use, useEffect, useState } from 'react'
import { resolveGameFromQr } from '@/lib/gameLoader'

export default function PlayPage({
  params,
}: {
  params: Promise<{ qrSlug: string }>
}) {
  const { qrSlug } = use(params)

  const [loading, setLoading] = useState(true)
  const [info, setInfo] = useState<any>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    async function load() {
      try {
        const data = await resolveGameFromQr(qrSlug)
        setInfo(data)
      } catch (err: any) {
        setError(err.message || 'Unable to load game.')
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [qrSlug])

  if (loading) {
    return <main className="p-8">Loading History Hunt...</main>
  }

  if (error) {
    return (
      <main className="p-8">
        <h1 className="text-2xl font-bold text-red-600">{error}</h1>
      </main>
    )
  }

  return (
    <main className="p-8">
      <h1 className="text-3xl font-bold">QR Resolver Working</h1>

      <hr className="my-6" />

      <p><b>QR:</b> {info.qrSlug}</p>
      <p><b>Venue:</b> {info.venue.name}</p>
      <p><b>Campaign:</b> {info.campaign.title}</p>
      <p><b>Game:</b> {info.game.title}</p>
    </main>
  )
}