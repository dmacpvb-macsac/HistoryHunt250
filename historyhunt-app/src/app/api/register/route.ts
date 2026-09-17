import { NextRequest, NextResponse } from 'next/server'

import { supabaseAdmin } from '@/lib/supabase/admin'

export const runtime = 'nodejs'

type RegisterBody = {
  mode?: 'registered' | 'anonymous'
  qrSlug?: string
  firstName?: string
  first_name?: string
  displayName?: string
  display_name?: string
  phoneNumber?: string
  phone_number?: string
  email?: string
  smsOptIn?: boolean
  sms_opt_in?: boolean
  leaderboardOptIn?: boolean
  leaderboard_opt_in?: boolean
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

function normalizeDisplayName(value: unknown) {
  return String(value || '')
    .trim()
    .replace(/\s+/g, ' ')
    .slice(0, 24)
}

function validateDisplayName(displayName: string) {
  if (!displayName) return
  if (!/^[A-Za-z0-9][A-Za-z0-9 _-]{1,22}[A-Za-z0-9]$/.test(displayName)) {
    throw new Error('Game Play User Name must be 3–24 characters and use only letters, numbers, spaces, underscores, or hyphens.')
  }
}

function registrationWriteError(
  error: { code?: string; message?: string } | null,
  fallback: string
) {
  if (error?.code === '23505' && String(error.message || '').includes('display_name')) {
    return new Error('That Game Play User Name is already taken. Please choose another.')
  }
  return new Error(error?.message || fallback)
}

function normalizeCampaign(value: unknown) {
  if (Array.isArray(value)) return value[0] || null
  return value || null
}

async function loadRegistrationConfig(qrSlug: string) {
  if (!qrSlug) {
    throw new Error('Missing QR slug.')
  }

  const { data: game, error: gameError } = await supabaseAdmin
    .from('games')
    .select(`
      game_id,
      campaign_id,
      title,
      game_type,
      status,
      active,
      registration_required,
      allow_anonymous_players,
      starts_at,
      ends_at
    `)
    .eq('slug', qrSlug)
    .eq('active', true)
    .maybeSingle()

  if (gameError || !game) {
    throw new Error('This History Hunt is not currently available.')
  }

  const gameRecord = game as Record<string, unknown>
  const isVenueGame = String(gameRecord.game_type || '').toLowerCase() === 'venue'

  const venueQuery = supabaseAdmin
    .from('venues')
    .select('venue_id, name, qr_slug, active, registration_enabled, campaign_id')
    .eq('active', true)

  const { data: venueRaw, error: venueError } = isVenueGame
    ? await venueQuery.eq('qr_slug', qrSlug).maybeSingle()
    : await venueQuery.eq('slug', 'web-games').maybeSingle()

  if (venueError || !venueRaw) {
    throw new Error('This History Hunt is not currently available.')
  }

  const venue = venueRaw as Record<string, unknown>
  const campaignId = String(gameRecord.campaign_id || '')
  let campaign: Record<string, unknown> | null = null
  if (campaignId) {
    const { data } = await supabaseAdmin
      .from('campaigns')
      .select('campaign_id, title, active, event_enabled, event_leaderboard_enabled, event_logo_image_url, event_primary_color')
      .eq('campaign_id', campaignId)
      .maybeSingle()
    campaign = normalizeCampaign(data) as Record<string, unknown> | null
  }

  return {
    qrSlug,
    venueId: String(venue.venue_id || ''),
    venueName: String(venue.name || ''),
    campaignId,
    campaignTitle: campaign?.title ? String(campaign.title) : '',
    eventEnabled: Boolean(campaign?.event_enabled),
    eventLogoImageUrl: campaign?.event_logo_image_url ? String(campaign.event_logo_image_url) : '',
    eventPrimaryColor: campaign?.event_primary_color ? String(campaign.event_primary_color) : '',
    gameId: String(gameRecord.game_id || ''),
    gameTitle: String(gameRecord.title || ''),
    registrationRequired: Boolean(gameRecord.registration_required) || Boolean(venue.registration_enabled),
    allowAnonymousPlayers: gameRecord.allow_anonymous_players !== false,
    eventLeaderboardEnabled: Boolean(campaign?.event_enabled) && Boolean(campaign?.event_leaderboard_enabled),
  }
}

async function saveEventLeaderboardPreference(
  campaignId: string,
  playerId: string,
  leaderboardOptIn: boolean
) {
  if (!campaignId) return

  const { error } = await supabaseAdmin
    .from('event_player_preferences')
    .upsert({
      campaign_id: campaignId,
      player_id: playerId,
      leaderboard_opt_in: leaderboardOptIn,
      leaderboard_opt_in_at: leaderboardOptIn ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'campaign_id,player_id' })

  if (error) throw new Error(error.message || 'Unable to save leaderboard preference.')
}

async function upsertRegisteredPlayer(
  body: RegisterBody,
  campaignId: string,
  eventLeaderboardEnabled: boolean
) {
  const firstName = normalizeFirstName(body.firstName ?? body.first_name)
  const requestedDisplayName = normalizeDisplayName(body.displayName ?? body.display_name)
  const phoneDigits = normalizePhoneDigits(body.phoneNumber ?? body.phone_number)
  const email = normalizeEmail(body.email)
  const smsOptIn = Boolean(body.smsOptIn ?? body.sms_opt_in)
  const leaderboardOptIn = eventLeaderboardEnabled && Boolean(body.leaderboardOptIn ?? body.leaderboard_opt_in)
  const serviceAffiliation = Boolean(body.serviceAffiliation ?? body.service_affiliation)

  if (!firstName) {
    throw new Error('Please enter your first name.')
  }

  if (phoneDigits.length !== 10) {
    throw new Error('Please enter a valid 10-digit mobile number.')
  }

  validateDisplayName(requestedDisplayName)

  const countryCode = '+1'
  const countryIso = 'US'
  const phoneE164 = `${countryCode}${phoneDigits}`

  const { data: existingPlayers, error: lookupError } = await supabaseAdmin
    .from('players')
    .select('player_id, display_name')
    .eq('phone_number', phoneDigits)
    .order('created_at', { ascending: true })
    .limit(1)

  if (lookupError) {
    throw new Error(lookupError.message || 'Unable to look up player.')
  }

  const existingPlayer = Array.isArray(existingPlayers) ? existingPlayers[0] : null

  if (existingPlayer?.player_id) {
    const playerId = String(existingPlayer.player_id)
    const existingDisplayName = String(existingPlayer.display_name || '')
    const displayName = existingDisplayName || requestedDisplayName

    if (leaderboardOptIn && !displayName) {
      throw new Error('Please choose a Game Play User Name or leave the leaderboard option unchecked.')
    }

    const { error: updateError } = await supabaseAdmin
      .from('players')
      .update({
        first_name: firstName,
        ...(existingDisplayName ? {} : { display_name: requestedDisplayName || null }),
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
      throw registrationWriteError(updateError, 'Unable to update player.')
    }

    await saveEventLeaderboardPreference(
      campaignId,
      playerId,
      leaderboardOptIn
    )

    return {
      playerId,
      firstName,
      displayName,
    }
  }

  if (leaderboardOptIn && !requestedDisplayName) {
    throw new Error('Please choose a Game Play User Name or leave the leaderboard option unchecked.')
  }

  const { data: newPlayer, error: insertError } = await supabaseAdmin
    .from('players')
    .insert({
      first_name: firstName,
      display_name: requestedDisplayName || null,
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
    .select('player_id, first_name, display_name')
    .single()

  if (insertError || !newPlayer) {
    throw registrationWriteError(insertError, 'Unable to register player.')
  }

  await saveEventLeaderboardPreference(
    campaignId,
    String(newPlayer.player_id),
    leaderboardOptIn
  )

  return {
    playerId: String(newPlayer.player_id),
    firstName: String(newPlayer.first_name || firstName),
    displayName: String(newPlayer.display_name || requestedDisplayName),
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

    const player = await upsertRegisteredPlayer(
      body,
      config.campaignId,
      config.eventLeaderboardEnabled
    )

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
