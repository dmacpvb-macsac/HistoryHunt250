import type { Question } from './question'

export type Venue = {
  venue_id: string
  slug: string
  name: string
  city: string | null
  state: string | null
  qr_slug: string
  active: boolean
  registration_enabled: boolean
  quiz_enabled: boolean
  reward_enabled: boolean
  campaign_id: string
}

export type Campaign = {
  campaign_id: string
  slug: string
  title: string
  active: boolean
}

export type Game = {
  game_id: string
  slug: string
  title: string
  description: string | null
  state: string | null
  city: string | null
  question_count: number
  total_points: number
  active: boolean
}

export type HuntContext = {
  qrSlug: string
  venue: Venue
  campaign: Campaign
  game: Game
  questions: Question[]
  permissions: {
    registrationRequired: boolean
    quizEnabled: boolean
    rewardsEnabled: boolean
  }
}