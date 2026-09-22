import { createHash, randomBytes } from 'crypto'

import type { NextRequest, NextResponse } from 'next/server'

import { supabaseAdmin } from '@/lib/supabase/admin'

export const PLAYER_COOKIE_NAME = 'hh_player_token'
export const PLAYER_COOKIE_MAX_AGE = 60 * 60 * 24 * 365

export type PublicPlayer = {
  playerId: string
  displayName: string
}

export function normalizeDisplayName(value: unknown) {
  return String(value || '').trim().replace(/\s+/g, ' ')
}

export function validateDisplayName(value: unknown) {
  const displayName = normalizeDisplayName(value)

  if (displayName.length < 6 || displayName.length > 12) {
    throw new Error('Player name must be 6–12 characters.')
  }

  if (!/^[A-Za-z0-9][A-Za-z0-9 _-]*[A-Za-z0-9]$/.test(displayName)) {
    throw new Error(
      'Use only letters, numbers, spaces, underscores, or hyphens, and begin and end with a letter or number.'
    )
  }

  return displayName
}

export function generatePlayerAccessToken() {
  return randomBytes(32).toString('hex')
}

export function hashPlayerAccessToken(token: string) {
  return createHash('sha256').update(token).digest('hex')
}

export function setPlayerCookie(response: NextResponse, token: string) {
  response.cookies.set(PLAYER_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: PLAYER_COOKIE_MAX_AGE,
  })
}

export async function resolvePlayerFromCookie(
  request: NextRequest
): Promise<PublicPlayer | null> {
  const token = request.cookies.get(PLAYER_COOKIE_NAME)?.value || ''
  if (!token) return null

  const { data, error } = await supabaseAdmin
    .from('players')
    .select('player_id, display_name')
    .eq('player_access_token_hash', hashPlayerAccessToken(token))
    .maybeSingle()

  if (error || !data?.player_id || !data.display_name) return null

  return {
    playerId: String(data.player_id),
    displayName: String(data.display_name),
  }
}
