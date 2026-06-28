'use client'

import { useState } from 'react'
import * as XLSX from 'xlsx'
import { supabase } from '@/lib/supabase'
import { validateWorkbook } from '@/lib/importer/validateWorkbook'
import type { ImportIssue, ValidatedWorkbook, WorkbookSheets } from '@/lib/importer/types'

function rowsFromSheet(workbook: XLSX.WorkBook, sheetName: string): Record<string, unknown>[] {
  const sheet = workbook.Sheets[sheetName]
  if (!sheet) return []
  return XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' })
}

function makeBatchNumber() {
  const year = new Date().getFullYear()
  const random = Math.floor(Math.random() * 900000) + 100000
  return `IMPORT-${year}-${random}`
}

async function sha256(file: File) {
  const buffer = await file.arrayBuffer()
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer)
  return Array.from(new Uint8Array(hashBuffer))
    .map(byte => byte.toString(16).padStart(2, '0'))
    .join('')
}

function IssueList({ title, issues }: { title: string; issues: ImportIssue[] }) {
  if (issues.length === 0) return null

  return (
    <div className="mt-6 rounded-2xl border bg-white p-4 shadow-sm">
      <h2 className="text-xl font-bold text-blue-900">{title}</h2>
      <div className="mt-3 space-y-2">
        {issues.map((issue, index) => (
          <div
            key={`${issue.code}-${index}`}
            className={issue.level === 'error'
              ? 'rounded-xl border border-red-200 bg-red-50 p-3'
              : 'rounded-xl border border-yellow-200 bg-yellow-50 p-3'}
          >
            <p className="font-bold">
              {issue.sheetName}
              {issue.rowNumber ? ` row ${issue.rowNumber}` : ''}
              {issue.fieldName ? ` — ${issue.fieldName}` : ''}
            </p>
            <p className="text-sm text-gray-700">{issue.message}</p>
            <p className="mt-1 text-xs uppercase tracking-wide text-gray-500">{issue.code}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function AdminImportPage() {
  const [fileName, setFileName] = useState('')
  const [fileChecksum, setFileChecksum] = useState('')
  const [validated, setValidated] = useState<ValidatedWorkbook | null>(null)
  const [parsedSheets, setParsedSheets] = useState<WorkbookSheets | null>(null)
  const [createdBatchNumber, setCreatedBatchNumber] = useState('')
  const [working, setWorking] = useState(false)
  const [message, setMessage] = useState('')

  async function handleFile(file?: File) {
    if (!file) return

    setWorking(true)
    setMessage('')
    setValidated(null)
    setParsedSheets(null)
    setCreatedBatchNumber('')
    setFileName(file.name)

    try {
      const checksum = await sha256(file)
      setFileChecksum(checksum)

      const buffer = await file.arrayBuffer()
      const workbook = XLSX.read(buffer, { type: 'array' })

      const sheets: WorkbookSheets = {
        huntInfo: rowsFromSheet(workbook, 'Hunt Info'),
        questions: rowsFromSheet(workbook, 'Questions'),
      }

      const result = validateWorkbook(sheets)
      setParsedSheets(sheets)
      setValidated(result)
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unable to parse workbook.'
      setMessage(message)
    } finally {
      setWorking(false)
    }
  }

  async function createImportBatch() {
    if (!validated || !parsedSheets) return

    setWorking(true)
    setMessage('')
    setCreatedBatchNumber('')

    const batchNumber = makeBatchNumber()
    const hasErrors = validated.errors.length > 0

    try {
      const { data: batch, error: batchError } = await supabase
        .from('import_batches')
        .insert([{
          batch_number: batchNumber,
          workbook_name: fileName,
          workbook_version: 'RC2-MVP',
          source_file_checksum: fileChecksum,
          importer_version: 'RC2-importer-mvp-0.2',
          submitted_by: validated.huntInfo?.contributorName || null,
          submitted_email: validated.huntInfo?.contributorEmail || null,
          organization: validated.huntInfo?.organizationName || null,
          review_status: hasErrors ? 'changes_requested' : 'submitted',
          import_status: hasErrors ? 'failed' : 'validated',
          game_slug: validated.huntInfo?.gameSlug || null,
          notes: hasErrors
            ? 'Validation batch created with blocking errors. Fix workbook and re-upload before game import.'
            : 'Validation batch created successfully. Game data write remains intentionally disabled until preview/review is approved.',
        }])
        .select()
        .single()

      if (batchError) throw new Error(batchError.message)

      const huntInfoRows = parsedSheets.huntInfo.map((rawRow, index) => ({
        import_batch_id: batch.import_batch_id,
        sheet_name: 'Hunt Info',
        row_number: index + 2,
        row_data: {
          raw: rawRow,
          normalized: index === 0 ? validated.huntInfo || null : null,
        },
        status: hasErrors ? 'parsed_with_errors' : 'validated',
      }))

      const questionRows = parsedSheets.questions.map((rawRow, index) => ({
        import_batch_id: batch.import_batch_id,
        sheet_name: 'Questions',
        row_number: index + 2,
        row_data: {
          raw: rawRow,
          normalized: validated.questions[index] || null,
        },
        status: hasErrors ? 'parsed_with_errors' : 'validated',
      }))

      const rowPayload = [...huntInfoRows, ...questionRows]

      if (rowPayload.length > 0) {
        const { error: rowsError } = await supabase
          .from('import_batch_rows')
          .insert(rowPayload)

        if (rowsError) throw new Error(rowsError.message)
      }

      const errorPayload = validated.errors.map(error => ({
        import_batch_id: batch.import_batch_id,
        sheet_name: error.sheetName,
        row_number: error.rowNumber || null,
        field_name: error.fieldName || null,
        error_code: error.code,
        error_message: error.message,
      }))

      if (errorPayload.length > 0) {
        const { error: errorsError } = await supabase
          .from('import_errors')
          .insert(errorPayload)

        if (errorsError) throw new Error(errorsError.message)
      }

      const warningPayload = validated.warnings.map(warning => ({
        import_batch_id: batch.import_batch_id,
        sheet_name: warning.sheetName,
        row_number: warning.rowNumber || null,
        field_name: warning.fieldName || null,
        warning_code: warning.code,
        warning_message: warning.message,
      }))

      if (warningPayload.length > 0) {
        const { error: warningsError } = await supabase
          .from('import_warnings')
          .insert(warningPayload)

        if (warningsError) throw new Error(warningsError.message)
      }

      setCreatedBatchNumber(batchNumber)
      setMessage(hasErrors
        ? `Validation batch saved: ${batchNumber}. Blocking errors were recorded. Do not import this workbook until corrected.`
        : `Import batch created: ${batchNumber}. Rows, warnings, checksum, and provenance were saved. Game write step can now be added safely.`)
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unable to create import batch.'
      setMessage(message)
    } finally {
      setWorking(false)
    }
  }

  return (
    <main className="min-h-screen bg-slate-100 p-6">
      <div className="mx-auto max-w-5xl">
        <div className="rounded-3xl bg-white p-6 shadow-xl">
          <p className="text-sm font-bold uppercase tracking-wide text-red-600">
            History Hunt™ RC2 Admin
          </p>
          <h1 className="mt-2 text-3xl font-bold text-blue-900">
            Bulk Game Importer
          </h1>
          <p className="mt-3 text-gray-600">
            Upload a workbook, validate Hunt Info and Questions, preview issues, and create a permanent import batch with row-level audit history. This screen does not publish live gameplay.
          </p>

          <div className="mt-6 rounded-2xl border border-dashed border-blue-300 bg-blue-50 p-6">
            <label className="block text-lg font-bold text-blue-900">
              Upload XLSX Workbook
            </label>
            <input
              type="file"
              accept=".xlsx,.xls"
              disabled={working}
              onChange={event => handleFile(event.target.files?.[0])}
              className="mt-4 block w-full rounded-xl border bg-white p-3"
            />
            <p className="mt-2 text-sm text-gray-600">
              Required tabs for RC2 MVP: Hunt Info and Questions.
            </p>
          </div>

          {working && (
            <p className="mt-4 font-semibold text-blue-900">Working...</p>
          )}

          {message && (
            <div className="mt-6 rounded-xl border border-blue-200 bg-blue-50 p-4 font-semibold text-blue-900">
              {message}
              {createdBatchNumber && (
                <div className="mt-2 text-sm font-bold">Batch ID: {createdBatchNumber}</div>
              )}
            </div>
          )}
        </div>

        {validated && (
          <div className="mt-6 rounded-3xl bg-white p-6 shadow-xl">
            <h2 className="text-2xl font-bold text-blue-900">Preview Summary</h2>

            <div className="mt-4 grid gap-4 md:grid-cols-4">
              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-sm text-gray-500">Game Slug</p>
                <p className="font-bold">{validated.summary.gameSlug || '—'}</p>
              </div>
              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-sm text-gray-500">QR Slug</p>
                <p className="font-bold">{validated.summary.qrSlug || '—'}</p>
              </div>
              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-sm text-gray-500">Questions</p>
                <p className="font-bold">{validated.summary.questionCount}</p>
              </div>
              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-sm text-gray-500">Total Points</p>
                <p className="font-bold">{validated.summary.totalPoints}</p>
              </div>
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-3">
              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-sm text-gray-500">Status</p>
                <p className="font-bold">{validated.summary.status || '—'}</p>
              </div>
              <div className="rounded-xl bg-red-50 p-4">
                <p className="text-sm text-gray-500">Errors</p>
                <p className="font-bold text-red-700">{validated.errors.length}</p>
              </div>
              <div className="rounded-xl bg-yellow-50 p-4">
                <p className="text-sm text-gray-500">Warnings</p>
                <p className="font-bold text-yellow-700">{validated.warnings.length}</p>
              </div>
            </div>

            <div className="mt-6 rounded-xl bg-slate-50 p-4">
              <p className="font-bold text-blue-900">Gate Status</p>
              {validated.summary.canImport ? (
                <p className="mt-1 text-green-700">No blocking errors. Ready to save validation batch.</p>
              ) : (
                <p className="mt-1 text-red-700">Blocking errors found. You may still save the validation batch for audit history, but do not import game data.</p>
              )}
            </div>

            <button
              disabled={working}
              onClick={createImportBatch}
              className="mt-6 rounded-xl bg-blue-900 px-6 py-4 text-lg font-bold text-white disabled:cursor-not-allowed disabled:bg-gray-400"
            >
              Save Validation Batch
            </button>
          </div>
        )}

        {validated && <IssueList title="Blocking Errors" issues={validated.errors} />}
        {validated && <IssueList title="Warnings" issues={validated.warnings} />}

        {validated && validated.questions.length > 0 && (
          <div className="mt-6 overflow-x-auto rounded-3xl bg-white p-6 shadow-xl">
            <h2 className="text-2xl font-bold text-blue-900">Question Preview</h2>
            <table className="mt-4 min-w-full text-left text-sm">
              <thead>
                <tr className="border-b">
                  <th className="p-2">#</th>
                  <th className="p-2">Question</th>
                  <th className="p-2">Correct</th>
                  <th className="p-2">Points</th>
                  <th className="p-2">Category</th>
                </tr>
              </thead>
              <tbody>
                {validated.questions.map(question => (
                  <tr key={question.sequenceNumber} className="border-b align-top">
                    <td className="p-2 font-bold">{question.sequenceNumber}</td>
                    <td className="max-w-xl p-2">{question.questionText}</td>
                    <td className="p-2">{question.correctChoice}</td>
                    <td className="p-2">{question.points}</td>
                    <td className="p-2">{question.category || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  )
}
