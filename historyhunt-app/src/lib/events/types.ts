export type EventGame = {
  gameId: string
  slug: string
  title: string
  description: string
  questionCount: number
  totalPoints: number
  displayOrder: number | null
  status: 'available' | 'upcoming' | 'ended' | 'unavailable'
  startsAt: string | null
  endsAt: string | null
  playUrl: string
}

export type EventLeaderboardEntry = {
  rank: number
  displayName: string
  totalScore: number
  gamesCompleted: number
  possiblePoints: number
}

export type EventHubResponse = {
  event: {
    campaignId: string
    slug: string
    title: string
    subtitle: string
    description: string
    eventType: string
    heroImageUrl: string
    logoImageUrl: string
    primaryColor: string
    secondaryColor: string
    accentColor: string
    leaderboardEnabled: boolean
  }
  games: EventGame[]
  leaderboard: EventLeaderboardEntry[]
}
