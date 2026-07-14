'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

type RegistrationConfig = {
  qrSlug: string
  venueName: string
  campaignTitle: string
  gameTitle: string
  registrationRequired: boolean
  allowAnonymousPlayers: boolean
}

function normalizePhoneDigits(value: string): string {
  let digits = value.replace(/\D/g, '')

  if (digits.length === 11 && digits.startsWith('1')) {
    digits = digits.slice(1)
  }

  return digits.slice(0, 10)
}

function formatPhone(value: string): string {
  const digits = normalizePhoneDigits(value)

  if (digits.length <= 3) return digits
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`
}

function RegisterForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const qrSlug = searchParams.get('qrSlug') || searchParams.get('play') || ''

  const [config, setConfig] = useState<RegistrationConfig | null>(null)
  const [configLoading, setConfigLoading] = useState(true)
  const [form, setForm] = useState({
    first_name: '',
    phone_number: '',
    email: '',
    sms_opt_in: false,
    service_affiliation: false,
  })
  const [loading, setLoading] = useState(false)
  const [anonymousLoading, setAnonymousLoading] = useState(false)
  const [error, setError] = useState('')

  const phoneDigits = normalizePhoneDigits(form.phone_number)

  const canStart =
    form.first_name.trim().length > 0 &&
    phoneDigits.length === 10 &&
    !loading &&
    !anonymousLoading

  useEffect(() => {
    let cancelled = false

    async function loadConfig() {
      if (!qrSlug) {
        if (!cancelled) {
          setConfigLoading(false)
          setError('Missing game link. Please scan the QR code again.')
        }
        return
      }

      try {
        const response = await fetch(`/api/register?qrSlug=${encodeURIComponent(qrSlug)}`, {
          cache: 'no-store',
        })

        const payload = await response.json().catch(() => ({}))

        if (!response.ok) {
          throw new Error(payload.error || 'Unable to load registration settings.')
        }

        if (!cancelled) {
          setConfig(payload.config || null)
          setConfigLoading(false)
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Unable to load registration settings.')
          setConfigLoading(false)
        }
      }
    }

    loadConfig()

    return () => {
      cancelled = true
    }
  }, [qrSlug])

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, phone_number: formatPhone(e.target.value) })
  }

  const goToGame = () => {
    router.push(qrSlug ? `/play/${encodeURIComponent(qrSlug)}` : '/')
  }

  const handleSubmit = async () => {
    if (!canStart) {
      setError('Please enter your first name and a valid 10-digit mobile number.')
      return
    }

    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          mode: 'registered',
          qrSlug,
          firstName: form.first_name,
          phoneNumber: phoneDigits,
          email: form.email,
          smsOptIn: form.sms_opt_in,
          serviceAffiliation: form.service_affiliation,
        }),
      })

      const payload = await response.json().catch(() => ({}))

      if (!response.ok) {
        throw new Error(payload.error || 'Unable to register player.')
      }

      localStorage.setItem('player_id', payload.player.playerId)
      localStorage.setItem('player_name', payload.player.firstName)
      localStorage.setItem('qr_slug', qrSlug)
      sessionStorage.removeItem(`anonymous_player:${qrSlug}`)

      goToGame()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to register player.')
      setLoading(false)
    }
  }

  const handleAnonymous = async () => {
    setAnonymousLoading(true)
    setError('')

    try {
      const response = await fetch('/api/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          mode: 'anonymous',
          qrSlug,
        }),
      })

      const payload = await response.json().catch(() => ({}))

      if (!response.ok) {
        throw new Error(payload.error || 'Anonymous play is not available for this game.')
      }

      localStorage.removeItem('player_id')
      localStorage.removeItem('player_name')
      localStorage.setItem('qr_slug', qrSlug)
      sessionStorage.setItem(`anonymous_player:${qrSlug}`, 'true')

      goToGame()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Anonymous play is not available for this game.')
      setAnonymousLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-blue-900 flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl p-8 w-full max-w-md shadow-xl">
        <div className="text-center mb-6">
          <img
            src="/history-hunt-logo.png"
            alt="History Hunt"
            className="w-40 mx-auto mb-4"
          />

          <p className="text-gray-500 text-sm mt-1">
            Presented by America 250 Proof™
          </p>

          {config?.gameTitle ? (
            <p className="text-gray-700 font-semibold mt-3">
              {config.gameTitle}
            </p>
          ) : null}

          <p className="text-gray-600 mt-3">
            Choose anonymous play, or register to save your game history.
          </p>
        </div>

        {config?.allowAnonymousPlayers && (
          <div className="mb-5">
            <button
              onClick={handleAnonymous}
              disabled={anonymousLoading || loading || configLoading}
              className="w-full bg-blue-900 hover:bg-blue-800 disabled:bg-gray-400 text-white rounded-xl p-4 text-lg font-bold transition-colors"
            >
              {anonymousLoading ? 'Starting Anonymous Play...' : 'Play Anonymously'}
            </button>

            <p className="text-center text-xs text-gray-500 mt-2">
              No game history is captured in anonymous mode.
            </p>

            <div className="flex items-center gap-3 mt-5">
              <div className="h-px bg-gray-200 flex-1" />
              <span className="text-xs uppercase tracking-wide text-gray-400 font-semibold">
                Or register
              </span>
              <div className="h-px bg-gray-200 flex-1" />
            </div>
          </div>
        )}

        {configLoading && (
          <div className="bg-blue-50 border border-blue-200 text-blue-700 rounded-lg p-3 mb-4 text-sm">
            Loading registration settings...
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 rounded-lg p-3 mb-4 text-sm">
            {error}
          </div>
        )}

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            First Name <span className="text-red-500">*</span>
          </label>

          <input
            name="given-name"
            autoComplete="given-name"
            className="w-full border border-gray-300 rounded-lg p-3 text-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Your first name"
            value={form.first_name}
            onChange={e => setForm({ ...form, first_name: e.target.value })}
          />
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Mobile Number <span className="text-red-500">*</span>
          </label>

          <input
            name="tel"
            autoComplete="tel"
            className="w-full border border-gray-300 rounded-lg p-3 text-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="(555) 555-5555"
            type="tel"
            inputMode="tel"
            value={form.phone_number}
            onChange={handlePhoneChange}
          />

          {phoneDigits.length > 0 && phoneDigits.length < 10 && (
            <p className="text-xs text-orange-500 mt-1">
              {10 - phoneDigits.length} more digits needed
            </p>
          )}

          {phoneDigits.length === 10 && (
            <p className="text-xs text-green-600 mt-1">
              ✓ Looks good
            </p>
          )}
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Email <span className="text-gray-400 text-xs">(optional)</span>
          </label>

          <input
            name="email"
            autoComplete="email"
            className="w-full border border-gray-300 rounded-lg p-3 text-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="your@email.com"
            type="email"
            value={form.email}
            onChange={e => setForm({ ...form, email: e.target.value })}
          />
        </div>

        <div className="space-y-3 mb-6">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              className="mt-1 w-5 h-5 accent-blue-900"
              checked={form.service_affiliation}
              onChange={e =>
                setForm({ ...form, service_affiliation: e.target.checked })
              }
            />

            <span className="text-sm text-gray-600">
              I am a veteran, active-duty service member, military family member,
              or first responder.
              <span className="text-gray-400"> (optional)</span>
            </span>
          </label>

          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              className="mt-1 w-5 h-5 accent-blue-900"
              checked={form.sms_opt_in}
              onChange={e =>
                setForm({ ...form, sms_opt_in: e.target.checked })
              }
            />

            <span className="text-sm text-gray-600">
              I agree to receive educational updates, event information, and
              History Hunt™ notifications via SMS or email.
            </span>
          </label>
        </div>

        <button
          onClick={handleSubmit}
          disabled={!canStart || configLoading}
          className="w-full bg-blue-900 hover:bg-blue-800 disabled:bg-gray-400 text-white rounded-xl p-4 text-xl font-bold transition-colors"
        >
          {loading ? 'Starting...' : 'Agree & Play →'}
        </button>

        <p className="text-center text-xs text-gray-400 mt-4 leading-relaxed">
          By selecting Agree & Play, you agree to the{' '}
          <a href="/legal/terms" target="_blank" className="underline">
            Terms of Use
          </a>
          {' '}and acknowledge the{' '}
          <a href="/legal/privacy" target="_blank" className="underline">
            Privacy Policy
          </a>
          . No purchase necessary. See{' '}
          <a href="/legal/contest-rules" target="_blank" className="underline">
            Contest Rules
          </a>
          .
        </p>
      </div>
    </main>
  )
}

export default function Register() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-blue-900 flex items-center justify-center text-white text-xl">Loading...</div>}>
      <RegisterForm />
    </Suspense>
  )
}
