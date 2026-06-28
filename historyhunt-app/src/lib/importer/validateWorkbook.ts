import type {
  CorrectChoice,
  GameStatus,
  GameType,
  HuntInfo,
  ImportIssue,
  QuestionImportRow,
  ValidatedWorkbook,
  WorkbookSheets,
} from './types'

const HUNT_INFO_SHEET = 'Hunt Info'
const QUESTIONS_SHEET = 'Questions'

function value(row: Record<string, unknown>, ...names: string[]): string {
  for (const name of names) {
    const foundKey = Object.keys(row).find(
      key => normalizeHeader(key) === normalizeHeader(name)
    )

    if (foundKey) {
      const raw = row[foundKey]
      if (raw !== undefined && raw !== null) return String(raw).trim()
    }
  }

  return ''
}

function boolValue(row: Record<string, unknown>, defaultValue: boolean, ...names: string[]): boolean {
  const raw = value(row, ...names).toLowerCase()
  if (!raw) return defaultValue
  return ['yes', 'true', '1', 'y', 'enabled'].includes(raw)
}

function numberValue(row: Record<string, unknown>, defaultValue: number, ...names: string[]): number {
  const raw = value(row, ...names)
  if (!raw) return defaultValue
  const parsed = Number(raw)
  return Number.isFinite(parsed) ? parsed : defaultValue
}

function normalizeHeader(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
}

function slugSafe(input: string): boolean {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(input)
}

function isUrl(input?: string): boolean {
  if (!input) return true
  try {
    const url = new URL(input)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

function addIssue(
  list: ImportIssue[],
  level: 'error' | 'warning',
  sheetName: 'Hunt Info' | 'Questions' | 'Workbook',
  code: string,
  message: string,
  rowNumber?: number,
  fieldName?: string
) {
  list.push({ level, sheetName, rowNumber, fieldName, code, message })
}

function parseHuntInfo(row: Record<string, unknown>): HuntInfo {
  return {
    gameSlug: value(row, 'Game Slug'),
    qrSlug: value(row, 'QR Slug', 'Play Slug'),
    huntTitle: value(row, 'Hunt Title', 'Game Title'),
    state: value(row, 'State'),
    city: value(row, 'City'),
    venueName: value(row, 'Venue Name'),
    campaignName: value(row, 'Campaign Name'),
    organizationName: value(row, 'Organization Name'),
    contributorName: value(row, 'Contributor Name', 'Submitted By'),
    contributorEmail: value(row, 'Contributor Email', 'Submitted Email'),
    publicDescription: value(row, 'Public Description', 'Description'),
    intendedAudience: value(row, 'Intended Audience'),
    gameType: (value(row, 'Game Type') || 'venue').toLowerCase() as GameType,
    gameStatus: (value(row, 'Game Status', 'Status') || 'draft').toLowerCase() as GameStatus,
    startDateTime: value(row, 'Start DateTime', 'Start Date Time', 'Starts At'),
    endDateTime: value(row, 'End DateTime', 'End Date Time', 'Ends At'),
    publicPlayUrl: value(row, 'Public Play URL'),
    shareUrl: value(row, 'Share URL'),
    shareTitle: value(row, 'Share Title'),
    shareText: value(row, 'Share Text'),
    countdownEnabled: boolValue(row, false, 'Countdown Enabled'),
    leaderboardEnabled: boolValue(row, false, 'Leaderboard Enabled'),
    registrationRequired: boolValue(row, true, 'Registration Required'),
    badgeEnabled: boolValue(row, true, 'Badge Enabled'),
    completedBadgeImageUrl: value(row, 'Completed Badge Image URL', 'Participant Badge URL'),
    perfectScoreBadgeImageUrl: value(row, 'Perfect Score Badge Image URL'),
    badgeDownloadEnabled: boolValue(row, true, 'Badge Download Enabled'),
    badgeSocialShareEnabled: boolValue(row, true, 'Badge Social Share Enabled'),
  }
}

function parseQuestion(row: Record<string, unknown>): QuestionImportRow {
  const correct = value(row, 'Correct Choice', 'Correct Answer').toUpperCase()

  return {
    sequenceNumber: numberValue(row, 0, 'Sequence Number', 'Sort Order'),
    questionText: value(row, 'Question Text'),
    choiceA: value(row, 'Choice A'),
    choiceB: value(row, 'Choice B'),
    choiceC: value(row, 'Choice C'),
    choiceD: value(row, 'Choice D'),
    correctChoice: correct as CorrectChoice,
    points: numberValue(row, 1, 'Points'),
    difficulty: value(row, 'Difficulty'),
    category: value(row, 'Category'),
    educationalFact: value(row, 'Educational Fact'),
    explanation: value(row, 'Explanation', 'Lyric Meaning'),
    learningObjective: value(row, 'Learning Objective'),
    gradeBand: value(row, 'Grade Band'),
    source1Url: value(row, 'Source 1 URL'),
    source2Url: value(row, 'Source 2 URL'),
    lyricLine: value(row, 'Lyric Line', 'Lyric'),
    songTitle: value(row, 'Song Title'),
    artist: value(row, 'Artist'),
    spotifyUrl: value(row, 'Spotify URL'),
    youtubeUrl: value(row, 'YouTube URL', 'YouTube Prompt'),
    imageUrl: value(row, 'Image URL'),
    imageAltText: value(row, 'Image Alt Text'),
    videoUrl: value(row, 'Video URL'),
    bonusQuestion: boolValue(row, false, 'Bonus Question', 'Is Bonus'),
    hintText: value(row, 'Hint Text'),
    accessibilityNotes: value(row, 'Accessibility Notes'),
  }
}

export function validateWorkbook(sheets: WorkbookSheets): ValidatedWorkbook {
  const errors: ImportIssue[] = []
  const warnings: ImportIssue[] = []

  const huntInfoRows = sheets.huntInfo || []
  const questionRows = sheets.questions || []

  if (huntInfoRows.length === 0) {
    addIssue(errors, 'error', 'Hunt Info', 'MISSING_HUNT_INFO', 'Hunt Info tab must contain at least one row.')
  }

  if (questionRows.length === 0) {
    addIssue(errors, 'error', 'Questions', 'MISSING_QUESTIONS', 'Questions tab must contain at least one row.')
  }

  const huntInfo = huntInfoRows[0] ? parseHuntInfo(huntInfoRows[0]) : undefined

  if (huntInfo) {
    const requiredHuntFields: Array<[keyof HuntInfo, string]> = [
      ['gameSlug', 'Game Slug'],
      ['qrSlug', 'QR Slug'],
      ['huntTitle', 'Hunt Title'],
      ['state', 'State'],
      ['city', 'City'],
      ['venueName', 'Venue Name'],
      ['campaignName', 'Campaign Name'],
    ]

    for (const [key, label] of requiredHuntFields) {
      if (!huntInfo[key]) {
        addIssue(errors, 'error', 'Hunt Info', 'REQUIRED_FIELD_MISSING', `${label} is required.`, 2, label)
      }
    }

    if (huntInfo.gameSlug && !slugSafe(huntInfo.gameSlug)) {
      addIssue(errors, 'error', 'Hunt Info', 'INVALID_GAME_SLUG', 'Game Slug must be URL-safe, for example america-250-behind-the-lyrics.', 2, 'Game Slug')
    }

    if (huntInfo.qrSlug && !slugSafe(huntInfo.qrSlug)) {
      addIssue(errors, 'error', 'Hunt Info', 'INVALID_QR_SLUG', 'QR Slug must be URL-safe, for example america-250-behind-the-lyrics.', 2, 'QR Slug')
    }

    const validStatuses: GameStatus[] = ['draft', 'scheduled']
    if (!validStatuses.includes(huntInfo.gameStatus)) {
      addIssue(errors, 'error', 'Hunt Info', 'INVALID_GAME_STATUS', 'Game Status must be Draft or Scheduled for importer use.', 2, 'Game Status')
    }

    const validTypes: GameType[] = ['venue', 'web', 'event', 'classroom', 'community']
    if (!validTypes.includes(huntInfo.gameType)) {
      addIssue(errors, 'error', 'Hunt Info', 'INVALID_GAME_TYPE', 'Game Type must be venue, web, event, classroom, or community.', 2, 'Game Type')
    }

    if (huntInfo.gameStatus === 'scheduled') {
      if (!huntInfo.startDateTime) {
        addIssue(errors, 'error', 'Hunt Info', 'MISSING_START_TIME', 'Scheduled games require Start DateTime.', 2, 'Start DateTime')
      }
      if (!huntInfo.endDateTime) {
        addIssue(errors, 'error', 'Hunt Info', 'MISSING_END_TIME', 'Scheduled games require End DateTime.', 2, 'End DateTime')
      }
    }

    if (huntInfo.startDateTime && huntInfo.endDateTime) {
      const start = Date.parse(huntInfo.startDateTime)
      const end = Date.parse(huntInfo.endDateTime)

      if (Number.isNaN(start)) {
        addIssue(errors, 'error', 'Hunt Info', 'INVALID_START_TIME', 'Start DateTime is not a valid date/time.', 2, 'Start DateTime')
      }
      if (Number.isNaN(end)) {
        addIssue(errors, 'error', 'Hunt Info', 'INVALID_END_TIME', 'End DateTime is not a valid date/time.', 2, 'End DateTime')
      }
      if (!Number.isNaN(start) && !Number.isNaN(end) && end <= start) {
        addIssue(errors, 'error', 'Hunt Info', 'INVALID_DATE_RANGE', 'End DateTime must be after Start DateTime.', 2, 'End DateTime')
      }
    }

    const urls: Array<[string | undefined, string]> = [
      [huntInfo.publicPlayUrl, 'Public Play URL'],
      [huntInfo.shareUrl, 'Share URL'],
      [huntInfo.completedBadgeImageUrl, 'Completed Badge Image URL'],
      [huntInfo.perfectScoreBadgeImageUrl, 'Perfect Score Badge Image URL'],
    ]

    for (const [url, label] of urls) {
      if (!isUrl(url)) {
        addIssue(errors, 'error', 'Hunt Info', 'INVALID_URL', `${label} must be a valid http or https URL.`, 2, label)
      }
    }

    if (huntInfo.badgeEnabled && !huntInfo.completedBadgeImageUrl) {
      addIssue(warnings, 'warning', 'Hunt Info', 'MISSING_COMPLETED_BADGE', 'Badge Enabled is true but Completed Badge Image URL is blank; app default may be used.', 2, 'Completed Badge Image URL')
    }

    if (!huntInfo.shareUrl && huntInfo.publicPlayUrl) {
      addIssue(warnings, 'warning', 'Hunt Info', 'MISSING_SHARE_URL', 'Share URL is blank; Public Play URL can be used as fallback.', 2, 'Share URL')
    }
  }

  const questions = questionRows.map(parseQuestion)
  const seenSequence = new Set<number>()

  questions.forEach((question, index) => {
    const rowNumber = index + 2

    if (!question.sequenceNumber) {
      addIssue(errors, 'error', 'Questions', 'MISSING_SEQUENCE', 'Sequence Number is required.', rowNumber, 'Sequence Number')
    } else if (seenSequence.has(question.sequenceNumber)) {
      addIssue(errors, 'error', 'Questions', 'DUPLICATE_SEQUENCE', `Sequence Number ${question.sequenceNumber} is duplicated.`, rowNumber, 'Sequence Number')
    }
    seenSequence.add(question.sequenceNumber)

    if (!question.questionText) {
      addIssue(errors, 'error', 'Questions', 'MISSING_QUESTION_TEXT', 'Question Text is required.', rowNumber, 'Question Text')
    }

    if (!question.choiceA || !question.choiceB) {
      addIssue(errors, 'error', 'Questions', 'TOO_FEW_CHOICES', 'At least Choice A and Choice B are required.', rowNumber, 'Choice A / Choice B')
    }

    if (!['A', 'B', 'C', 'D'].includes(question.correctChoice)) {
      addIssue(errors, 'error', 'Questions', 'INVALID_CORRECT_CHOICE', 'Correct Choice must be A, B, C, or D.', rowNumber, 'Correct Choice')
    } else {
      const choiceMap = {
        A: question.choiceA,
        B: question.choiceB,
        C: question.choiceC,
        D: question.choiceD,
      }

      if (!choiceMap[question.correctChoice]) {
        addIssue(errors, 'error', 'Questions', 'CORRECT_CHOICE_EMPTY', `Correct Choice ${question.correctChoice} points to a blank answer choice.`, rowNumber, 'Correct Choice')
      }
    }

    if (!question.educationalFact) {
      addIssue(errors, 'error', 'Questions', 'MISSING_EDUCATIONAL_FACT', 'Educational Fact is required.', rowNumber, 'Educational Fact')
    }

    if (question.points <= 0) {
      addIssue(errors, 'error', 'Questions', 'INVALID_POINTS', 'Points must be greater than zero.', rowNumber, 'Points')
    }

    if (!question.source1Url) {
      addIssue(warnings, 'warning', 'Questions', 'MISSING_SOURCE_1', 'Source 1 URL is recommended for auditability.', rowNumber, 'Source 1 URL')
    }

    if (question.source1Url && !isUrl(question.source1Url)) {
      addIssue(errors, 'error', 'Questions', 'INVALID_SOURCE_1_URL', 'Source 1 URL must be a valid http or https URL.', rowNumber, 'Source 1 URL')
    }

    if (question.source2Url && !isUrl(question.source2Url)) {
      addIssue(errors, 'error', 'Questions', 'INVALID_SOURCE_2_URL', 'Source 2 URL must be a valid http or https URL.', rowNumber, 'Source 2 URL')
    }

    if (question.imageUrl && !question.imageAltText) {
      addIssue(errors, 'error', 'Questions', 'MISSING_IMAGE_ALT_TEXT', 'Image Alt Text is required when Image URL exists.', rowNumber, 'Image Alt Text')
    }

    if (question.questionText.length > 240) {
      addIssue(warnings, 'warning', 'Questions', 'LONG_QUESTION_TEXT', 'Question Text is longer than 240 characters.', rowNumber, 'Question Text')
    }
  })

  const totalPoints = questions.reduce((sum, q) => sum + q.points, 0)

  return {
    huntInfo,
    questions,
    errors,
    warnings,
    summary: {
      questionCount: questions.length,
      totalPoints,
      gameSlug: huntInfo?.gameSlug,
      qrSlug: huntInfo?.qrSlug,
      status: huntInfo?.gameStatus,
      canImport: errors.length === 0,
    },
  }
}

export const REQUIRED_WORKBOOK_TABS = [HUNT_INFO_SHEET, QUESTIONS_SHEET]
