import { NextRequest, NextResponse } from 'next/server'

import {
  generatePlayerAccessToken,
  hashPlayerAccessToken,
  resolvePlayerFromCookie,
  setPlayerCookie,
  validateDisplayName,
} from '@/lib/playerIdentity'
import { supabaseAdmin } from '@/lib/supabase/admin'

export const runtime = 'nodejs'

type RegisterBody = { qrSlug?: string; displayName?: string; legacyPlayerId?: string }

async function loadRegistrationConfig(qrSlug: string) {
  if (!qrSlug) throw new Error('Missing game link. Please choose a game again.')

  const { data: game, error } = await supabaseAdmin
    .from('games')
    .select('game_id, campaign_id, title, active')
    .eq('slug', qrSlug)
    .eq('active', true)
    .maybeSingle()

  if (error || !game) throw new Error('This History Hunt is not currently available.')

  let campaign: Record<string, unknown> | null = null
  if (game.campaign_id) {
    const { data } = await supabaseAdmin
      .from('campaigns')
      .select('title, event_enabled, event_logo_image_url, event_primary_color')
      .eq('campaign_id', game.campaign_id)
      .maybeSingle()
    campaign = data as Record<string, unknown> | null
  }

  return {
    qrSlug,
    campaignTitle: campaign?.title ? String(campaign.title) : '',
    eventEnabled: Boolean(campaign?.event_enabled),
    eventLogoImageUrl: campaign?.event_logo_image_url ? String(campaign.event_logo_image_url) : '',
    eventPrimaryColor: campaign?.event_primary_color ? String(campaign.event_primary_color) : '',
    gameTitle: String(game.title || ''),
  }
}

function registrationWriteError(error: { code?: string; message?: string } | null) {
  if (error?.code === '23505') {
    return new Error('That player name is already taken. Please choose another.')
  }
  return new Error(error?.message || 'Unable to save your player name.')
}

export async function GET(request: NextRequest) {
  try {
    const qrSlug = request.nextUrl.searchParams.get('qrSlug') || ''
    const [config, player] = await Promise.all([
      loadRegistrationConfig(qrSlug),
      resolvePlayerFromCookie(request),
    ])
    return NextResponse.json({ config, player })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unable to load game.' },
      { status: 400 }
    )
  }
}

export async function POST(request: NextRequest) {
  let body: RegisterBody = {}
  try { body = await request.json() } catch { body = {} }

  try {
    const qrSlug = String(body.qrSlug || '').trim()
    const config = await loadRegistrationConfig(qrSlug)
    const currentPlayer = await resolvePlayerFromCookie(request)
    if (currentPlayer) return NextResponse.json({ player: currentPlayer, config })

    const displayName = validateDisplayName(body.displayName)
    const token = generatePlayerAccessToken()
    const tokenHash = hashPlayerAccessToken(token)
    let playerId = ''

    // One-time bridge from the former localStorage ID keeps existing scores.
    const legacyPlayerId = String(body.legacyPlayerId || '').trim()
    if (legacyPlayerId) {
      const { data: legacyPlayer } = await supabaseAdmin
        .from('players')
        .select('player_id, display_name, player_access_token_hash')
        .eq('player_id', legacyPlayerId)
        .maybeSingle()

      const namesMatch =
        String(legacyPlayer?.display_name || '').toLocaleLowerCase() ===
        displayName.toLocaleLowerCase()

      if (legacyPlayer?.player_id && !legacyPlayer.player_access_token_hash && namesMatch) {
        const { data, error } = await supabaseAdmin
          .from('players')
          .update({
            player_access_token_hash: tokenHash,
            first_name: null,
            phone_number: null,
            phone_e164: null,
            email: null,
            country_code: null,
            country_iso: null,
            sms_opt_in: null,
            service_affiliation: null,
            terms_accepted: null,
            privacy_accepted: null,
          })
          .eq('player_id', legacyPlayerId)
          .is('player_access_token_hash', null)
          .select('player_id')
          .maybeSingle()

        if (error) throw registrationWriteError(error)
        playerId = data?.player_id ? String(data.player_id) : ''
      }
    }

    if (!playerId) {
      const { data, error } = await supabaseAdmin
        .from('players')
        .insert({
          display_name: displayName,
          player_access_token_hash: tokenHash,
        })
        .select('player_id')
        .single()

      if (error || !data) throw registrationWriteError(error)
      playerId = String(data.player_id)
    }

    const response = NextResponse.json({ player: { playerId, displayName }, config })
    setPlayerCookie(response, token)
    return response
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unable to save your player name.' },
      { status: 400 }
    )
  }
}

export async function PATCH(request: NextRequest) {
  let body: RegisterBody = {}
  try { body = await request.json() } catch { body = {} }

  try {
    const qrSlug = String(body.qrSlug || '').trim()
    const config = await loadRegistrationConfig(qrSlug)
    const currentPlayer = await resolvePlayerFromCookie(request)

    if (!currentPlayer) {
      return NextResponse.json(
        { error: 'We could not recognize this player on this device. Choose a player name to continue.' },
        { status: 401 }
      )
    }

    const displayName = validateDisplayName(body.displayName)
    const { data, error } = await supabaseAdmin
      .from('players')
      .update({ display_name: displayName })
      .eq('player_id', currentPlayer.playerId)
      .select('player_id, display_name')
      .single()

    if (error || !data) throw registrationWriteError(error)

    return NextResponse.json({
      player: {
        playerId: String(data.player_id),
        displayName: String(data.display_name),
      },
      config,
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unable to update your player name.' },
      { status: 400 }
    )
  }
}
