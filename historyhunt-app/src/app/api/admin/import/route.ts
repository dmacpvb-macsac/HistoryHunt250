import { NextRequest, NextResponse } from 'next/server'

import { buildImportPreviewPayload } from '@/lib/importer/importWorkbook'
import type {
  ImportWorkbookInput,
  ImportWorkbookResult,
} from '@/lib/importer/importWorkbook'
import { supabaseAdmin } from '@/lib/supabase/admin'

export const runtime = 'nodejs'

function normalizeRpcResult(data: unknown, fallbackPayload: ReturnType<typeof buildImportPreviewPayload>): ImportWorkbookResult {
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

function isAuthorized(request: NextRequest) {
  const expectedToken = process.env.ADMIN_IMPORT_TOKEN

  if (!expectedToken) {
    return false
  }

  const providedToken = request.headers.get('x-admin-import-token')

  return Boolean(providedToken) && providedToken === expectedToken
}

export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json(
      { error: 'Unauthorized.' },
      { status: 401 }
    )
  }

  let input: ImportWorkbookInput

  try {
    input = await request.json()
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON request body.' },
      { status: 400 }
    )
  }

  try {
    const payload = buildImportPreviewPayload(input)

    const { data, error } = await supabaseAdmin.rpc('import_engineering_workbook', {
      payload,
    })

    if (error) {
      const missingRpc =
        error.message?.includes('import_engineering_workbook') ||
        error.code === 'PGRST202'

      return NextResponse.json(
        {
          error: missingRpc
            ? 'Database RPC import_engineering_workbook is not installed.'
            : error.message || 'Import failed.',
        },
        { status: 500 }
      )
    }

    return NextResponse.json(normalizeRpcResult(data, payload))
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unable to run atomic game import.'

    return NextResponse.json(
      { error: message },
      { status: 400 }
    )
  }
}
