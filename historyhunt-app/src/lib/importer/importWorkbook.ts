import type {
  HuntInfo,
  ImportIssue,
  QuestionImportRow,
  ValidatedWorkbook,
  WorkbookSheets,
} from './types'

export type ImportWorkbookInput = {
  validated: ValidatedWorkbook
  parsedSheets: WorkbookSheets
  workbookName: string
  fileChecksum: string
  batchNumber?: string
  workbookVersion?: string
  importerVersion?: string
  gitCommit?: string
  createdBy?: string
  supabaseProjectRef?: string
  siteOrigin?: string
}

export type ImportWorkbookResult = {
  importBatchId: string
  batchNumber: string
  campaignId: string
  venueId: string
  gameId: string
  gameSlug: string
  qrSlug: string
  publicPlayUrl: string
  shareUrl: string
  questionsImported: number
  totalPoints: number
  warningsCount: number
}

type RpcImportPayload = {
  batch: {
    batch_number: string
    workbook_name: string
    workbook_version: string
    importer_version: string
    git_commit: string | null
    source_file_checksum: string
    supabase_project_ref: string | null
    created_by: string | null
    submitted_by: string | null
    submitted_email: string | null
    organization: string | null
    game_slug: string
    import_mode: 'draft' | 'scheduled' | 'update'
  }
  huntInfo: ReturnType<typeof normalizeHuntInfoForRpc>
  questions: ReturnType<typeof normalizeQuestionsForRpc>
  rawRows: {
    huntInfo: Record<string, unknown>[]
    questions: Record<string, unknown>[]
  }
  warnings: ImportIssue[]
  summary: ValidatedWorkbook['summary']
}

const DEFAULT_WORKBOOK_VERSION = 'Engineering Workbook v1.2'
const DEFAULT_IMPORTER_VERSION = 'RC2-importer-badge-slugs-0.1'
const DEFAULT_SITE_ORIGIN = 'https://america250proof.com'
const MIN_PLAUSIBLE_YEAR = 2000
const MAX_PLAUSIBLE_YEAR = 2100

export function makeImportBatchNumber(date = new Date()) {
  const year = date.getFullYear()
  const random = Math.floor(Math.random() * 900000) + 100000
  return `IMPORT-${year}-${random}`
}

function cleanText(value?: string | null) {
  const trimmed = String(value || '').trim()
  return trimmed.length > 0 ? trimmed : null
}

function normalizeDateTime(value?: string | Date | number | null) {
  if (value === null || value === undefined || value === '') return null

  const parsed = value instanceof Date ? value : new Date(value)

  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`Invalid date/time value in workbook: ${String(value)}`)
  }

  const year = parsed.getUTCFullYear()

  if (year < MIN_PLAUSIBLE_YEAR || year > MAX_PLAUSIBLE_YEAR) {
    throw new Error(
      `Implausible date/time value in workbook: ${String(value)} parsed as year ${year}. Check that Excel date cells were read as dates, not serial numbers.`
    )
  }

  return parsed.toISOString()
}

function canonicalPlayUrl(huntInfo: HuntInfo, siteOrigin: string) {
  if (huntInfo.publicPlayUrl) return huntInfo.publicPlayUrl
  const origin = siteOrigin.replace(/\/$/, '')
  return `${origin}/play/${huntInfo.qrSlug}`
}

function workbookVersionFromInputOrHuntInfo(input: ImportWorkbookInput, huntInfo: HuntInfo) {
  const inputVersion = cleanText(input.workbookVersion)

  if (inputVersion) return inputVersion

  const huntInfoRecord = huntInfo as HuntInfo & {
    workbookVersion?: string | null
  }

  return cleanText(huntInfoRecord.workbookVersion) || DEFAULT_WORKBOOK_VERSION
}

function normalizeHuntInfoForRpc(huntInfo: HuntInfo, totalPoints: number, questionCount: number, siteOrigin: string) {
  const publicPlayUrl = canonicalPlayUrl(huntInfo, siteOrigin)
  const shareUrl = huntInfo.shareUrl || publicPlayUrl

  return {
    game_slug: huntInfo.gameSlug,
    qr_slug: huntInfo.qrSlug,
    title: huntInfo.huntTitle,
    state: huntInfo.state,
    city: huntInfo.city,
    venue_name: huntInfo.venueName,
    campaign_name: huntInfo.campaignName,
    organization_name: cleanText(huntInfo.organizationName),
    contributor_name: cleanText(huntInfo.contributorName),
    contributor_email: cleanText(huntInfo.contributorEmail),
    description: cleanText(huntInfo.publicDescription),
    intended_audience: cleanText(huntInfo.intendedAudience),
    game_type: huntInfo.gameType,
    status: huntInfo.gameStatus,
    starts_at: normalizeDateTime(huntInfo.startDateTime),
    ends_at: normalizeDateTime(huntInfo.endDateTime),
    question_count: questionCount,
    total_points: totalPoints,
    public_play_url: publicPlayUrl,
    share_url: shareUrl,
    share_title: cleanText(huntInfo.shareTitle),
    share_text: cleanText(huntInfo.shareText),
    countdown_enabled: huntInfo.countdownEnabled,
    leaderboard_enabled: huntInfo.leaderboardEnabled,
    registration_required: huntInfo.registrationRequired,
    allow_anonymous_players: huntInfo.allowAnonymousPlayers,
    badge_enabled: huntInfo.badgeEnabled,
    completion_badge_slug: cleanText(huntInfo.completionBadgeSlug),
    perfect_score_badge_slug: cleanText(huntInfo.perfectScoreBadgeSlug),
    badge_download_enabled: huntInfo.badgeDownloadEnabled,
    badge_share_enabled: huntInfo.badgeSocialShareEnabled,
    results_cta_enabled: huntInfo.resultsCtaEnabled,
    results_cta_type: cleanText(huntInfo.resultsCtaType),
    results_cta_label: cleanText(huntInfo.resultsCtaLabel),
    results_cta_url: cleanText(huntInfo.resultsCtaUrl),
    results_cta_note: cleanText(huntInfo.resultsCtaNote),
  }
}

function normalizeQuestionsForRpc(questions: QuestionImportRow[]) {
  return questions.map((question, index) => ({
    source_row: index + 2,
    sort_order: question.sequenceNumber,
    lyric_prompt: cleanText(question.lyricLine),
    question_text: question.questionText,
    choice_a: question.choiceA,
    choice_b: question.choiceB,
    choice_c: question.choiceC || '',
    choice_d: question.choiceD || '',
    correct_answer: question.correctChoice,
    educational_fact: cleanText(question.educationalFact),
    category: cleanText(question.category),
    difficulty: cleanText(question.difficulty) || 'medium',
    points: question.points,
    is_bonus: question.bonusQuestion,
    active: true,
    lyric: cleanText(question.lyricLine),
    lyric_meaning: cleanText(question.explanation),
    youtube_prompt: cleanText(question.youtubeUrl),
    question_version: 1,
    metadata: {
      learningObjective: cleanText(question.learningObjective),
      gradeBand: cleanText(question.gradeBand),
      source1Url: cleanText(question.source1Url),
      source2Url: cleanText(question.source2Url),
      songTitle: cleanText(question.songTitle),
      artist: cleanText(question.artist),
      spotifyUrl: cleanText(question.spotifyUrl),
      imageUrl: cleanText(question.imageUrl),
      imageAltText: cleanText(question.imageAltText),
      videoUrl: cleanText(question.videoUrl),
      hintText: cleanText(question.hintText),
      accessibilityNotes: cleanText(question.accessibilityNotes),
    },
  }))
}

function buildRpcPayload(input: ImportWorkbookInput): RpcImportPayload {
  const { validated } = input
  const huntInfo = validated.huntInfo

  if (!huntInfo) {
    throw new Error('Cannot import workbook: Hunt Info is missing.')
  }

  if (!validated.summary.canImport || validated.errors.length > 0) {
    throw new Error('Cannot import workbook: validation errors must be fixed before import.')
  }

  const siteOrigin = input.siteOrigin || DEFAULT_SITE_ORIGIN
  const batchNumber = input.batchNumber || makeImportBatchNumber()
  const workbookVersion = workbookVersionFromInputOrHuntInfo(input, huntInfo)
  const importerVersion = input.importerVersion || DEFAULT_IMPORTER_VERSION
  const importMode = huntInfo.gameStatus === 'scheduled' ? 'scheduled' : 'draft'

  return {
    batch: {
      batch_number: batchNumber,
      workbook_name: input.workbookName,
      workbook_version: workbookVersion,
      importer_version: importerVersion,
      git_commit: cleanText(input.gitCommit),
      source_file_checksum: input.fileChecksum,
      supabase_project_ref: cleanText(input.supabaseProjectRef),
      created_by: cleanText(input.createdBy),
      submitted_by: cleanText(huntInfo.contributorName),
      submitted_email: cleanText(huntInfo.contributorEmail),
      organization: cleanText(huntInfo.organizationName),
      game_slug: huntInfo.gameSlug,
      import_mode: importMode,
    },
    huntInfo: normalizeHuntInfoForRpc(
      huntInfo,
      validated.summary.totalPoints,
      validated.summary.questionCount,
      siteOrigin
    ),
    questions: normalizeQuestionsForRpc(validated.questions),
    rawRows: {
      huntInfo: input.parsedSheets.huntInfo,
      questions: input.parsedSheets.questions,
    },
    warnings: validated.warnings,
    summary: validated.summary,
  }
}

function normalizeRpcResult(data: unknown, fallbackPayload: RpcImportPayload): ImportWorkbookResult {
  const result = Array.isArray(data) ? data[0] : data
  const record = (result || {}) as Record<string, unknown>

  return {
    importBatchId: String(record.import_batch_id || ''),
    batchNumber: String(record.batch_number || fallbackPayload.batch.batch_number),
    campaignId: String(record.campaign_id || ''),
    venueId: String(record.venue_id || ''),
    gameId: String(record.game_id || ''),
    gameSlug: String(record.game_slug || fallbackPayload.huntInfo.game_slug),
    qrSlug: String(record.qr_slug || fallbackPayload.huntInfo.qr_slug),
    publicPlayUrl: String(record.public_play_url || fallbackPayload.huntInfo.public_play_url),
    shareUrl: String(record.share_url || fallbackPayload.huntInfo.share_url),
    questionsImported: Number(record.questions_imported || fallbackPayload.questions.length),
    totalPoints: Number(record.total_points || fallbackPayload.huntInfo.total_points),
    warningsCount: Number(record.warnings_count || fallbackPayload.warnings.length),
  }
}

export async function importWorkbook(_input: ImportWorkbookInput): Promise<ImportWorkbookResult> {
  throw new Error(
    'Direct workbook RPC execution is disabled. Use the protected /api/admin/import route so the import runs server-side with the service-role client.'
  )
}

export function buildImportPreviewPayload(input: ImportWorkbookInput) {
  return buildRpcPayload(input)
}
