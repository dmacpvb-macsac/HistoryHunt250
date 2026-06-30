'use client'

import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'

function normalizePhoneDigits(value: string): string {
  let digits = value.replace(/\D/g, '')

  // Handles autofill values like +1 (555) 555-5555
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

  const [form, setForm] = useState({
    first_name: '',
    phone_number: '',
    email: '',
    sms_opt_in: false,
    service_affiliation: false,
  })

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const phoneDigits = normalizePhoneDigits(form.phone_number)
  const countryCode = '+1'
  const countryIso = 'US'
  const phoneE164 = phoneDigits.length === 10 ? `${countryCode}${phoneDigits}` : null

  const canStart =
    form.first_name.trim().length > 0 &&
    phoneDigits.length === 10 &&
    !loading

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, phone_number: formatPhone(e.target.value) })
  }

  const handleSubmit = async () => {
    if (!canStart) {
      setError('Please enter your first name and a valid 10-digit mobile number.')
      return
    }

    setLoading(true)
    setError('')

    const { data: existingPlayer, error: lookupError } = await supabase
      .from('players')
      .select('player_id, first_name')
      .eq('phone_number', phoneDigits)
      .maybeSingle()

    if (lookupError) {
      setError(lookupError.message)
      setLoading(false)
      return
    }

    let playerId = existingPlayer?.player_id
    let playerName = existingPlayer?.first_name || form.first_name.trim()

    if (playerId) {
      const { error: updateError } = await supabase
        .from('players')
        .update({
          first_name: form.first_name.trim(),
          country_code: countryCode,
          country_iso: countryIso,
          phone_e164: phoneE164,
          email: form.email.trim() || null,
          sms_opt_in: form.sms_opt_in,
          service_affiliation: form.service_affiliation,
          terms_accepted: true,
          privacy_accepted: true,
        })
        .eq('player_id', playerId)

      if (updateError) {
        setError(updateError.message)
        setLoading(false)
        return
      }

      playerName = form.first_name.trim()
    } else {
      const { data, error: dbError } = await supabase
        .from('players')
        .insert([{
          first_name: form.first_name.trim(),
          phone_number: phoneDigits,
          country_code: countryCode,
          country_iso: countryIso,
          phone_e164: phoneE164,
          email: form.email.trim() || null,
          sms_opt_in: form.sms_opt_in,
          service_affiliation: form.service_affiliation,
          terms_accepted: true,
          privacy_accepted: true,
          source: 'qr',
        }])
        .select()
        .single()

      if (dbError) {
        setError(dbError.message)
        setLoading(false)
        return
      }

      playerId = data.player_id
      playerName = data.first_name
    }

    localStorage.setItem('player_id', playerId)
    localStorage.setItem('player_name', playerName)
    localStorage.setItem('qr_slug', qrSlug)

    router.push(qrSlug ? `/play/${encodeURIComponent(qrSlug)}` : '/')
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

          <h1 className="text-2xl font-bold text-blue-900">
            History Hunt™
          </h1>

          <p className="text-gray-500 text-sm mt-1">
            Presented by America 250 Proof™
          </p>

          <p className="text-gray-600 mt-3">
            Enter your info to start the challenge.
          </p>
        </div>

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
          disabled={!canStart}
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