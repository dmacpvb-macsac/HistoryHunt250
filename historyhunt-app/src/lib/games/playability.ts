export type PlayabilityGame = {
  status: string | null
  active: boolean | null
  starts_at: string | null
  ends_at: string | null
}

export type PlayabilityVenue = {
  qr_slug: string | null
  active: boolean | null
  quiz_enabled: boolean | null
  start_at: string | null
  end_at: string | null
}

function firstValidDate(...values: Array<string | null | undefined>) {
  for (const value of values) {
    if (!value) continue

    const date = new Date(value)

    if (!Number.isNaN(date.getTime())) {
      return date
    }
  }

  return null
}

function formatDuration(ms: number) {
  const totalMinutes = Math.max(0, Math.ceil(ms / 60000))
  const days = Math.floor(totalMinutes / 1440)
  const hours = Math.floor((totalMinutes % 1440) / 60)
  const minutes = totalMinutes % 60

  if (days > 0) return `${days}d ${hours}h ${minutes}m`
  if (hours > 0) return `${hours}h ${minutes}m`
  return `${minutes}m`
}

export function evaluatePlayableNow(
  game: PlayabilityGame,
  venue: PlayabilityVenue | null,
  questionCount: number
) {
  if (!venue) {
    return {
      playableNow: false,
      reasonNotPlayable: 'No venue / QR slug linked to this campaign.',
    }
  }

  if (!venue.qr_slug) {
    return {
      playableNow: false,
      reasonNotPlayable: 'Venue has no QR slug.',
    }
  }

  if (venue.active === false) {
    return {
      playableNow: false,
      reasonNotPlayable: 'Venue is inactive.',
    }
  }

  if (venue.quiz_enabled === false) {
    return {
      playableNow: false,
      reasonNotPlayable: 'Venue quiz is disabled.',
    }
  }

  if (game.active === false) {
    return {
      playableNow: false,
      reasonNotPlayable: 'Game is inactive.',
    }
  }

  if (questionCount <= 0) {
    return {
      playableNow: false,
      reasonNotPlayable: 'No active questions imported.',
    }
  }

  const status = (game.status || '').toLowerCase()

  if (status === 'draft') {
    return {
      playableNow: false,
      reasonNotPlayable: 'Game status is draft.',
    }
  }

  if (status === 'completed') {
    return {
      playableNow: false,
      reasonNotPlayable: 'Game status is completed.',
    }
  }

  if (status === 'archived') {
    return {
      playableNow: false,
      reasonNotPlayable: 'Game status is archived.',
    }
  }

  const now = Date.now()
  const startDate = firstValidDate(game.starts_at, venue.start_at)
  const endDate = firstValidDate(game.ends_at, venue.end_at)

  if (startDate && startDate.getTime() > now) {
    return {
      playableNow: false,
      reasonNotPlayable: `Starts in ${formatDuration(startDate.getTime() - now)}.`,
    }
  }

  if (endDate && endDate.getTime() < now) {
    return {
      playableNow: false,
      reasonNotPlayable: 'Game ended.',
    }
  }

  if (status === 'scheduled') {
    return {
      playableNow: false,
      reasonNotPlayable: 'Game status is scheduled.',
    }
  }

  if (status === 'countdown') {
    return {
      playableNow: false,
      reasonNotPlayable: 'Game status is countdown.',
    }
  }

  if (status && status !== 'active') {
    return {
      playableNow: false,
      reasonNotPlayable: `Game status is ${status}.`,
    }
  }

  return {
    playableNow: true,
    reasonNotPlayable: '',
  }
}
