import { NextRequest, NextResponse } from 'next/server'

import { supabaseAdmin } from '@/lib/supabase/admin'

export const runtime = 'nodejs'

type RegisterBody = {
  mode?: 'registered' | 'anonymous'
  qrSlug?: string
  firstName?: string
  first_name?: string
  phoneNumber?: string
  phone_number?: string
  email?: string
  smsOptIn?: boolean
  sms_opt_in?: boolean
  serviceAffiliation?: boolean
  service_affiliation?: boolean
}

function normalizePhoneDigits(value: unknown) {
  let digits = String(value || '').replace(/\D/g, '')

  if (digits.length === 11 && digits.startsWith('1')) {
    digits = digits.slice(1)
  }

  return digits.slice(0, 10)
}

function normalizeFirstName(value: unknown) {
  return String(value || '')
    .trim()
    .replace(/\s+/g, ' ')
    .slice(0, 50)
}

function normalizeEmail(value: unknown) {
  const email = String(value || '').trim().toLowerCase().slice(0, 254)

  if (!email) return null

  const looksLikeEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  if (!looksLikeEmail) {
    throw new Error('Please enter a valid email address or leave email blank.')
  }

  return email
}

function normalizeCampaign(value: unknown) {
  if (Array.isArray(value)) return value[0] || null
  return value || null
}

async function loadRegistrationConfig(qrSlug: string) {
  if (!qrSlug) {
    throw new Error('Missing QR slug.')
  }

  const { data: venueRaw, error: venueError } = await supabaseAdmin
    .from('venues')
    .select(`
      venue_id,
      name,
      qr_slug,
      active,
      registration_enabled,
      campaign_id,
      campaigns (
        campaign_id,
        title,
        active
      )
    `)
    .eq('qr_slug', qrSlug)
    .eq('active', true)
    .maybeSingle()

  if (venueError || !venueRaw) {
    throw new Error('This History Hunt is not currently available.')
  }

  const venue = venueRaw as Record<string, unknown>
  const campaign = normalizeCampaign(venue.campaigns) as Record<string, unknown> | null

  const { data: game, error: gameError } = await supabaseAdmin
    .from('games')
    .select(`
      game_id,
      title,
      status,
      active,
      registration_required,
      allow_anonymous_players,
      starts_at,
      ends_at
    `)
    .eq('campaign_id', venue.campaign_id)
    .eq('active', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (gameError || !game) {
    throw new Error('This History Hunt is not currently available.')
  }

  const gameRecord = game as Record<string, unknown>

  return {
    qrSlug,
    venueId: String(venue.venue_id || ''),
    venueName: String(venue.name || ''),
    campaignId: campaign?.campaign_id ? String(campaign.campaign_id) : '',
    campaignTitle: campaign?.title ? String(campaign.title) : '',
    gameId: String(gameRecord.game_id || ''),
    gameTitle: String(gameRecord.title || ''),
    registrationRequired: Boolean(gameRecord.registration_required) || Boolean(venue.registration_enabled),
    allowAnonymousPlayers: gameRecord.allow_anonymous_players !== false,
  }
}

async function upsertRegisteredPlayer(body: RegisterBody) {
  const firstName = normalizeFirstName(body.firstName ?? body.first_name)
  const phoneDigits = normalizePhoneDigits(body.phoneNumber ?? body.phone_number)
  const email = normalizeEmail(body.email)
  const smsOptIn = Boolean(body.smsOptIn ?? body.sms_opt_in)
  const serviceAffiliation = Boolean(body.serviceAffiliation ?? body.service_affiliation)

  if (!firstName) {
    throw new Error('Please enter your first name.')
  }

  if (phoneDigits.length !== 10) {
    throw new Error('Please enter a valid 10-digit mobile number.')
  }

  const countryCode = '+1'
  const countryIso = 'US'
  const phoneE164 = `${countryCode}${phoneDigits}`

  const { data: existingPlayers, error: lookupError } = await supabaseAdmin
    .from('players')
    .select('player_id')
    .eq('phone_number', phoneDigits)
    .order('created_at', { ascending: true })
    .limit(1)

  if (lookupError) {
    throw new Error(lookupError.message || 'Unable to look up player.')
  }

  const existingPlayer = Array.isArray(existingPlayers) ? existingPlayers[0] : null

  if (existingPlayer?.player_id) {
    const playerId = String(existingPlayer.player_id)

    const { error: updateError } = await supabaseAdmin
      .from('players')
      .update({
        first_name: firstName,
        country_code: countryCode,
        country_iso: countryIso,
        phone_e164: phoneE164,
        email,
        sms_opt_in: smsOptIn,
        service_affiliation: serviceAffiliation,
        terms_accepted: true,
        privacy_accepted: true,
      })
      .eq('player_id', playerId)

    if (updateError) {
      throw new Error(updateError.message || 'Unable to update player.')
    }

    return {
      playerId,
      firstName,
    }
  }

  const { data: newPlayer, error: insertError } = await supabaseAdmin
    .from('players')
    .insert({
      first_name: firstName,
      phone_number: phoneDigits,
      country_code: countryCode,
      country_iso: countryIso,
      phone_e164: phoneE164,
      email,
      sms_opt_in: smsOptIn,
      service_affiliation: serviceAffiliation,
      terms_accepted: true,
      privacy_accepted: true,
      source: 'qr',
    })
    .select('player_id, first_name')
    .single()

  if (insertError || !newPlayer) {
    throw new Error(insertError?.message || 'Unable to register player.')
  }

  return {
    playerId: String(newPlayer.player_id),
    firstName: String(newPlayer.first_name || firstName),
  }
}

export async function GET(request: NextRequest) {
  try {
    const qrSlug = request.nextUrl.searchParams.get('qrSlug') || ''
    const config = await loadRegistrationConfig(qrSlug)

    return NextResponse.json({
      config,
    })
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Unable to load registration settings.',
      },
      { status: 400 }
    )
  }
}

export async function POST(request: NextRequest) {
  let body: RegisterBody = {}

  try {
    body = await request.json()
  } catch {
    body = {}
  }

  try {
    const qrSlug = String(body.qrSlug || '').trim()
    const mode = body.mode || 'registered'
    const config = await loadRegistrationConfig(qrSlug)

    if (mode === 'anonymous') {
      if (config.registrationRequired && !config.allowAnonymousPlayers) {
        return NextResponse.json(
          {
            error: 'Registration is required for this History Hunt.',
            config,
          },
          { status: 403 }
        )
      }

      return NextResponse.json({
        mode: 'anonymous',
        config,
      })
    }

    const player = await upsertRegisteredPlayer(body)

    return NextResponse.json({
      mode: 'registered',
      player,
      config,
    })
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Unable to register player.',
      },
      { status: 400 }
    )
  }
}
