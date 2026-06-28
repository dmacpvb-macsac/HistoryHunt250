export type ImportMode = 'draft' | 'scheduled' | 'update'
export type ReviewStatus = 'submitted' | 'in_review' | 'changes_requested' | 'approved' | 'rejected' | 'published'
export type ImportStatus = 'pending' | 'validated' | 'imported' | 'failed' | 'rolled_back'
export type GameStatus = 'draft' | 'scheduled'
export type GameType = 'venue' | 'web' | 'event' | 'classroom' | 'community'
export type CorrectChoice = 'A' | 'B' | 'C' | 'D'

export type WorkbookSheets = {
  huntInfo: Record<string, unknown>[]
  questions: Record<string, unknown>[]
}

export type HuntInfo = {
  gameSlug: string
  qrSlug: string
  huntTitle: string
  state: string
  city: string
  venueName: string
  campaignName: string
  organizationName?: string
  contributorName?: string
  contributorEmail?: string
  publicDescription?: string
  intendedAudience?: string
  gameType: GameType
  gameStatus: GameStatus
  startDateTime?: string
  endDateTime?: string
  publicPlayUrl?: string
  shareUrl?: string
  shareTitle?: string
  shareText?: string
  countdownEnabled: boolean
  leaderboardEnabled: boolean
  registrationRequired: boolean
  badgeEnabled: boolean
  completedBadgeImageUrl?: string
  perfectScoreBadgeImageUrl?: string
  badgeDownloadEnabled: boolean
  badgeSocialShareEnabled: boolean
}

export type QuestionImportRow = {
  sequenceNumber: number
  questionText: string
  choiceA: string
  choiceB: string
  choiceC?: string
  choiceD?: string
  correctChoice: CorrectChoice
  points: number
  difficulty: string
  category: string
  educationalFact: string
  explanation?: string
  learningObjective?: string
  gradeBand?: string
  source1Url?: string
  source2Url?: string
  lyricLine?: string
  songTitle?: string
  artist?: string
  spotifyUrl?: string
  youtubeUrl?: string
  imageUrl?: string
  imageAltText?: string
  videoUrl?: string
  bonusQuestion: boolean
  hintText?: string
  accessibilityNotes?: string
}

export type ImportIssueLevel = 'error' | 'warning'

export type ImportIssue = {
  level: ImportIssueLevel
  sheetName: 'Hunt Info' | 'Questions' | 'Workbook'
  rowNumber?: number
  fieldName?: string
  code: string
  message: string
}

export type ValidatedWorkbook = {
  huntInfo?: HuntInfo
  questions: QuestionImportRow[]
  errors: ImportIssue[]
  warnings: ImportIssue[]
  summary: {
    questionCount: number
    totalPoints: number
    gameSlug?: string
    qrSlug?: string
    status?: GameStatus
    canImport: boolean
  }
}
