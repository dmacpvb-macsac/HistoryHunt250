import { NextRequest, NextResponse } from 'next/server'

import { supabaseAdmin } from '@/lib/supabase/admin'

export const runtime = 'nodejs'

const ALLOWED_STATUSES = new Set([
  'draft',
  'scheduled',
  'countdown',
  'active',
  'completed',
  'archived',
])

function isAuthorized(request: NextRequest) {
  const expectedToken = process.env.ADMIN_IMPORT_TOKEN

  if (!expectedToken) return false

  const providedToken =
    request.headers.get('x-admin-token') ||
    request.headers.get('x-admin-import-token')

  return Boolean(providedToken) && providedToken === expectedToken
}

function normalizeOptionalDate(value: unknown) {
  if (value === null || value === undefined || value === '') return null
  if (typeof value !== 'string') throw new Error('Date value must be a string.')

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid date value: ${value}`)
  }

  return date.toISOString()
}

export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json(
      { error: 'Unauthorized.' },
      { status: 401 }
    )
  }

  let body: {
    gameId?: string
    action?: string
    status?: string
    value?: boolean
    startsAt?: string | null
    endsAt?: string | null
  }

  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON body.' },
      { status: 400 }
    )
  }

  const gameId = body.gameId
  const action = body.action

  if (!gameId || !action) {
    return NextResponse.json(
      { error: 'gameId and action are required.' },
      { status: 400 }
    )
  }

  const { data: game, error: gameError } = await supabaseAdmin
    .from('games')
    .select('game_id, campaign_id, slug')
    .eq('game_id', gameId)
    .maybeSingle()

  if (gameError) {
    return NextResponse.json(
      { error: gameError.message },
      { status: 500 }
    )
  }

  if (!game) {
    return NextResponse.json(
      { error: 'Game not found.' },
      { status: 404 }
    )
  }

  const now = new Date().toISOString()
  const commonGameFields = {
    updated_at: now,
    updated_by: 'admin-games-dashboard',
  }

  let gameUpdate: Record<string, unknown> | null = null
  let venueUpdate: Record<string, unknown> | null = null

  try {
    switch (action) {
      case 'activate':
        gameUpdate = {
          ...commonGameFields,
          status: 'active',
          active: true,
          starts_at: null,
          ends_at: null,
          archived_at: null,
        }
        venueUpdate = {
          active: true,
          quiz_enabled: true,
          start_at: null,
          end_at: null,
        }
        break

      case 'set-status': {
        const status = body.status
        if (!status || !ALLOWED_STATUSES.has(status)) {
          return NextResponse.json(
            { error: 'Invalid status.' },
            { status: 400 }
          )
        }

        gameUpdate = {
          ...commonGameFields,
          status,
        }

        if (status === 'active') {
          gameUpdate.active = true
          gameUpdate.archived_at = null
        }

        if (status === 'draft' || status === 'completed' || status === 'archived') {
          gameUpdate.active = false
        }

        if (status === 'archived') {
          gameUpdate.archived_at = now
        }

        break
      }

      case 'toggle-registration-required':
        gameUpdate = {
          ...commonGameFields,
          registration_required: Boolean(body.value),
        }
        break

      case 'toggle-allow-anonymous-players':
        gameUpdate = {
          ...commonGameFields,
          allow_anonymous_players: Boolean(body.value),
        }
        break

      case 'clear-dates':
        gameUpdate = {
          ...commonGameFields,
          starts_at: null,
          ends_at: null,
        }
        venueUpdate = {
          start_at: null,
          end_at: null,
        }
        break

      case 'set-dates': {
        const startsAt = normalizeOptionalDate(body.startsAt)
        const endsAt = normalizeOptionalDate(body.endsAt)

        if (startsAt && endsAt && new Date(endsAt).getTime() <= new Date(startsAt).getTime()) {
          return NextResponse.json(
            { error: 'End date/time must be after start date/time.' },
            { status: 400 }
          )
        }

        gameUpdate = {
          ...commonGameFields,
          starts_at: startsAt,
          ends_at: endsAt,
        }
        venueUpdate = {
          start_at: startsAt,
          end_at: endsAt,
        }
        break
      }

      default:
        return NextResponse.json(
          { error: `Unsupported action: ${action}` },
          { status: 400 }
        )
    }
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Invalid update request.' },
      { status: 400 }
    )
  }

  if (gameUpdate) {
    const { error: updateGameError } = await supabaseAdmin
      .from('games')
      .update(gameUpdate)
      .eq('game_id', gameId)

    if (updateGameError) {
      return NextResponse.json(
        { error: updateGameError.message },
        { status: 500 }
      )
    }
  }

  if (venueUpdate && game.campaign_id) {
    const { error: updateVenueError } = await supabaseAdmin
      .from('venues')
      .update(venueUpdate)
      .eq('campaign_id', game.campaign_id)

    if (updateVenueError) {
      return NextResponse.json(
        { error: updateVenueError.message },
        { status: 500 }
      )
    }
  }

  return NextResponse.json({
    ok: true,
    gameId,
    action,
    updatedAt: now,
  })
}
