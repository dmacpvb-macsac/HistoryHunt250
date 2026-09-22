'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

type RegistrationConfig = {
  campaignTitle: string
  gameTitle: string
  eventEnabled: boolean
  eventLogoImageUrl: string
  eventPrimaryColor: string
}

type CurrentPlayer = {
  playerId: string
  displayName: string
}

function RegisterForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const qrSlug = searchParams.get('qrSlug') || searchParams.get('play') || ''
  const changeUsername = searchParams.get('change') === '1'
  const [config, setConfig] = useState<RegistrationConfig | null>(null)
  const [currentPlayer, setCurrentPlayer] = useState<CurrentPlayer | null>(null)
  const [displayName, setDisplayName] = useState('')
  const [loading, setLoading] = useState(false)
  const [configLoading, setConfigLoading] = useState(true)
  const [error, setError] = useState('')

  const trimmedName = displayName.trim().replace(/\s+/g, ' ')
  const canStart = trimmedName.length >= 6 && trimmedName.length <= 12 && !loading
    && (!changeUsername || Boolean(currentPlayer))
  const logo = config?.eventEnabled && config.eventLogoImageUrl
    ? config.eventLogoImageUrl
    : '/history-hunt-logo.png'

  useEffect(() => {
    let cancelled = false

    async function loadConfig() {
      if (!qrSlug) {
        setError('Missing game link. Please choose a game again.')
        setConfigLoading(false)
        return
      }

      try {
        const response = await fetch(`/api/register?qrSlug=${encodeURIComponent(qrSlug)}`, {
          cache: 'no-store',
        })
        const payload = await response.json().catch(() => ({}))
        if (!response.ok) throw new Error(payload.error || 'Unable to load game.')
        if (cancelled) return

        setConfig(payload.config || null)
        if (payload.player?.playerId && !changeUsername) {
          sessionStorage.setItem(`start_after_username:${qrSlug}`, 'true')
          router.replace(`/play/${encodeURIComponent(qrSlug)}`)
          return
        }
        if (payload.player?.playerId && changeUsername) {
          setCurrentPlayer(payload.player)
          setDisplayName(String(payload.player.displayName || ''))
        } else if (changeUsername) {
          setError('We could not recognize this player on this device. Return to the game and choose a player name.')
        }
        setConfigLoading(false)
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Unable to load game.')
          setConfigLoading(false)
        }
      }
    }

    loadConfig()
    return () => { cancelled = true }
  }, [changeUsername, qrSlug, router])

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (!canStart) {
      setError('Player name must be 6–12 characters.')
      return
    }

    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/register', {
        method: changeUsername ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          qrSlug,
          displayName: trimmedName,
          legacyPlayerId: changeUsername ? '' : localStorage.getItem('player_id') || '',
        }),
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(payload.error || 'Unable to save your player name.')

      if (!changeUsername) {
        localStorage.removeItem('player_id')
        localStorage.removeItem('player_name')
        localStorage.removeItem('player_display_name')
      }
      sessionStorage.setItem(`start_after_username:${qrSlug}`, 'true')
      router.replace(`/play/${encodeURIComponent(qrSlug)}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save your player name.')
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl p-6 sm:p-8 w-full max-w-md shadow-xl">
        <div className="text-center mb-6">
          <img
            src={logo}
            alt={config?.campaignTitle ? `${config.campaignTitle} logo` : 'History Hunt'}
            className="w-36 sm:w-44 mx-auto mb-4"
          />
          <p className="text-sm font-bold uppercase tracking-wider text-blue-700">
            No account required
          </p>
          <h1 className="text-3xl font-extrabold text-blue-950 mt-2">
            {changeUsername ? 'Change Your Player Name' : 'Choose Your Player Name'}
          </h1>
          {config?.gameTitle ? (
            <p className="text-gray-600 font-semibold mt-3">{config.gameTitle}</p>
          ) : null}
        </div>

        {configLoading ? (
          <div className="bg-blue-50 text-blue-800 rounded-xl p-3 mb-4 text-sm">Loading game…</div>
        ) : null}
        {error ? (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 mb-4 text-sm">{error}</div>
        ) : null}

        <form onSubmit={handleSubmit}>
          <label htmlFor="displayName" className="block text-sm font-bold text-gray-800 mb-2">
            Player Name
          </label>
          <input
            id="displayName"
            name="nickname"
            autoComplete="nickname"
            autoCapitalize="words"
            maxLength={12}
            className="w-full border-2 border-gray-300 rounded-xl p-4 text-xl focus:outline-none focus:ring-2 focus:ring-blue-700"
            placeholder="Example: Monty86"
            value={displayName}
            onChange={event => setDisplayName(event.target.value)}
            disabled={loading || configLoading}
          />
          <div className="flex justify-between mt-2 text-xs text-gray-500">
            <span>6–12 characters; must be unique</span>
            <span>{trimmedName.length}/12</span>
          </div>

          <button
            type="submit"
            disabled={!canStart || configLoading}
            style={{ backgroundColor: config?.eventPrimaryColor || '#172554' }}
            className="w-full mt-6 disabled:opacity-50 text-white rounded-xl p-4 text-xl font-bold"
          >
            {loading
              ? (changeUsername ? 'Updating…' : 'Starting…')
              : (changeUsername ? 'Save and Play →' : 'Play Now →')}
          </button>
        </form>

        <p className="text-xs text-gray-600 mt-5 leading-relaxed">
          We do not collect your name, phone number, email address, or other contact information.
          We do not sell personal data. We use a cookie to remember your player name, progress,
          scores, and badges on this device. Your player name and scores may appear on public
          leaderboards. Do not include personal information in your player name.
        </p>
        <p className="text-center text-xs text-gray-500 mt-4">
          By playing, you agree to the{' '}
          <a href="/legal/terms" target="_blank" className="underline">Terms of Use</a>
          {' '}and acknowledge the{' '}
          <a href="/legal/privacy" target="_blank" className="underline">Privacy Policy</a>.
        </p>
      </div>
    </main>
  )
}

export default function Register() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-100 flex items-center justify-center text-blue-950 text-xl">Loading…</div>}>
      <RegisterForm />
    </Suspense>
  )
}
