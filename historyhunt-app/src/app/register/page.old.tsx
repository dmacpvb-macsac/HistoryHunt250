'use client'

import { Suspense } from 'react'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

function formatPhone(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 10)
  if (digits.length <= 3) return digits
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`
}

function stripPhone(value: string): string {
  return value.replace(/\D/g, '')
}

function RegisterForm() {
  const router = useRouter()
  const [form, setForm] = useState({
    first_name: '',
    phone_number: '',
    email: '',
    sms_opt_in: false,
    service_affiliation: false,
    terms_accepted: false,
    privacy_accepted: false,
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, phone_number: formatPhone(e.target.value) })
  }

  const handleSubmit = async () => {
    if (!form.first_name.trim()) {
      setError('Please enter your first name.')
      return
    }
    const digits = stripPhone(form.phone_number)
    if (digits.length !== 10) {
      setError('Please enter a valid 10-digit US phone number.')
      return
    }
    if (!form.terms_accepted || !form.privacy_accepted) {
      setError('Please accept the Terms of Use and Privacy Policy to continue.')
      return
    }

    setLoading(true)
    setError('')

    const { data, error: dbError } = await supabase
      .from('players')
      .insert([{
        first_name: form.first_name.trim(),
        phone_number: digits,
        email: form.email.trim() || null,
        sms_opt_in: form.sms_opt_in,
        service_affiliation: form.service_affiliation,
        terms_accepted: form.terms_accepted,
        privacy_accepted: form.privacy_accepted,
        source: 'qr',
      }])
      .select()
      .single()

    if (dbError) {
      setError(dbError.message)
      setLoading(false)
      return
    }

    localStorage.setItem('player_id', data.player_id)
    localStorage.setItem('player_name', data.first_name)
    router.push('/play/jacksonville-waterfront')
  }

  return (
    <main className="min-h-screen bg-blue-900 flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl p-8 w-full max-w-md shadow-xl">

        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-blue-900">Florida History Hunt™</h1>
          <p className="text-gray-500 text-sm mt-1">Presented by America 250 Proof™</p>
          <p className="text-gray-600 mt-3">Enter your info to start the challenge</p>
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
            className="w-full border border-gray-300 rounded-lg p-3 text-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="(555) 555-5555"
            type="tel"
            inputMode="numeric"
            value={form.phone_number}
            onChange={handlePhoneChange}
          />
          {stripPhone(form.phone_number).length > 0 && stripPhone(form.phone_number).length < 10 && (
            <p className="text-xs text-orange-500 mt-1">
              {10 - stripPhone(form.phone_number).length} more digits needed
            </p>
          )}
          {stripPhone(form.phone_number).length === 10 && (
            <p className="text-xs text-green-600 mt-1">✓ Looks good</p>
          )}
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Email <span className="text-gray-400 text-xs">(optional)</span>
          </label>
          <input
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
              onChange={e => setForm({ ...form, service_affiliation: e.target.checked })}
            />
            <span className="text-sm text-gray-600">
              I am a veteran or active duty military member{' '}
              <span className="text-gray-400">(optional)</span>
            </span>
          </label>

          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              className="mt-1 w-5 h-5 accent-blue-900"
              checked={form.sms_opt_in}
              onChange={e => setForm({ ...form, sms_opt_in: e.target.checked })}
            />
            <span className="text-sm text-gray-600">
              I agree to receive educational updates, event information, and
              History Hunt™ notifications via SMS or email.
            </span>
          </label>

          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              className="mt-1 w-5 h-5 accent-blue-900"
              checked={form.terms_accepted}
              onChange={e => setForm({ ...form, terms_accepted: e.target.checked })}
            />
            <span className="text-sm text-gray-600">
              I agree to the{' '}
              <a href="/legal/terms" target="_blank" className="text-blue-700 underline">
                Terms of Use
              </a>{' '}
              <span className="text-red-500">*</span>
            </span>
          </label>

          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              className="mt-1 w-5 h-5 accent-blue-900"
              checked={form.privacy_accepted}
              onChange={e => setForm({ ...form, privacy_accepted: e.target.checked })}
            />
            <span className="text-sm text-gray-600">
              I have read and accept the{' '}
              <a href="/legal/privacy" target="_blank" className="text-blue-700 underline">
                Privacy Policy
              </a>{' '}
              <span className="text-red-500">*</span>
            </span>
          </label>

        </div>

        <button
          onClick={handleSubmit}
          disabled={loading || !form.terms_accepted || !form.privacy_accepted}
          className="w-full bg-blue-900 hover:bg-blue-800 disabled:bg-gray-400 text-white rounded-xl p-4 text-xl font-bold transition-colors"
        >
          {loading ? 'Starting...' : 'Start the Hunt →'}
        </button>

        <p className="text-center text-xs text-gray-400 mt-4">
          No purchase necessary. See{' '}
          <a href="/legal/contest-rules" target="_blank" className="underline">
            Contest Rules
          </a>{' '}
          for details.
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