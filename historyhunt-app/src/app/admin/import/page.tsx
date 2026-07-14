'use client'

import { useState } from 'react'
import * as XLSX from 'xlsx'
import { validateWorkbook } from '@/lib/importer/validateWorkbook'
import type { ImportIssue, ValidatedWorkbook, WorkbookSheets } from '@/lib/importer/types'
import type { ImportWorkbookInput, ImportWorkbookResult } from '@/lib/importer/importWorkbook'

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

type ImportNotice =
  | {
      kind: 'info'
      title: string
      message: string
    }
  | {
      kind: 'success'
      title: string
      result: ImportWorkbookResult
    }
  | {
      kind: 'error'
      title: string
      message: string
      statusCode?: number
      detail?: string
    }

function valueToString(value: unknown) {
  if (typeof value === 'string') return value
  if (value === null || value === undefined) return ''

  try {
    return JSON.stringify(value)
  } catch {
    return String(value)
  }
}

async function readResponseBody(response: Response): Promise<Record<string, unknown>> {
  const text = await response.text()
  if (!text.trim()) return {}

  try {
    return JSON.parse(text) as Record<string, unknown>
  } catch {
    return { error: text }
  }
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

function ImportNoticePanel({ notice }: { notice: ImportNotice | null }) {
  if (!notice) return null

  if (notice.kind === 'success') {
    const { result } = notice

    return (
      <div className="mt-6 rounded-2xl border border-green-300 bg-green-50 p-5 text-green-950 shadow-sm">
        <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-wide text-green-700">Import Complete</p>
            <h2 className="mt-1 text-2xl font-bold">{notice.title}</h2>
          </div>
          <div className="rounded-full bg-green-700 px-4 py-2 text-sm font-bold text-white">
            200 OK
          </div>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-3">
          <div className="rounded-xl bg-white p-4">
            <p className="text-sm text-green-700">Batch Number</p>
            <p className="break-all font-bold">{result.batchNumber}</p>
          </div>
          <div className="rounded-xl bg-white p-4">
            <p className="text-sm text-green-700">Game Slug</p>
            <p className="break-all font-bold">{result.gameSlug}</p>
          </div>
          <div className="rounded-xl bg-white p-4">
            <p className="text-sm text-green-700">QR Slug</p>
            <p className="break-all font-bold">{result.qrSlug}</p>
          </div>
          <div className="rounded-xl bg-white p-4">
            <p className="text-sm text-green-700">Questions Imported</p>
            <p className="font-bold">{result.questionsImported}</p>
          </div>
          <div className="rounded-xl bg-white p-4">
            <p className="text-sm text-green-700">Total Points</p>
            <p className="font-bold">{result.totalPoints}</p>
          </div>
          <div className="rounded-xl bg-white p-4">
            <p className="text-sm text-green-700">Warnings</p>
            <p className="font-bold">{result.warningsCount}</p>
          </div>
        </div>

        {result.publicPlayUrl && (
          <div className="mt-5 rounded-xl bg-white p-4">
            <p className="font-bold">Playable URL</p>
            <a
              href={result.publicPlayUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1 block break-all underline"
            >
              {result.publicPlayUrl}
            </a>
          </div>
        )}

        <div className="mt-5 grid gap-2 text-sm md:grid-cols-3">
          <div>
            <span className="font-bold">Campaign ID:</span>
            <br />
            <span className="break-all">{result.campaignId}</span>
          </div>
          <div>
            <span className="font-bold">Venue ID:</span>
            <br />
            <span className="break-all">{result.venueId}</span>
          </div>
          <div>
            <span className="font-bold">Game ID:</span>
            <br />
            <span className="break-all">{result.gameId}</span>
          </div>
        </div>

        <p className="mt-5 rounded-xl border border-green-200 bg-white p-3 text-sm font-semibold text-green-900">
          Do not run the importer again unless you are intentionally testing a re-import of this workbook.
        </p>
      </div>
    )
  }

  if (notice.kind === 'error') {
    return (
      <div className="mt-6 rounded-2xl border border-red-300 bg-red-50 p-5 text-red-950 shadow-sm">
        <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-wide text-red-700">Import Failed</p>
            <h2 className="mt-1 text-2xl font-bold">{notice.title}</h2>
          </div>
          {notice.statusCode && (
            <div className="rounded-full bg-red-700 px-4 py-2 text-sm font-bold text-white">
              HTTP {notice.statusCode}
            </div>
          )}
        </div>

        <p className="mt-4 font-semibold">{notice.message}</p>

        {notice.detail && (
          <pre className="mt-4 overflow-x-auto rounded-xl bg-white p-4 text-sm text-red-950">
            {notice.detail}
          </pre>
        )}

        <p className="mt-4 rounded-xl border border-red-200 bg-white p-3 text-sm font-semibold text-red-900">
          No success was confirmed. Do not click again until this error is reviewed.
        </p>
      </div>
    )
  }

  return (
    <div className="mt-6 rounded-2xl border border-blue-200 bg-blue-50 p-5 text-blue-950 shadow-sm">
      <p className="text-sm font-bold uppercase tracking-wide text-blue-700">Admin Notice</p>
      <h2 className="mt-1 text-xl font-bold">{notice.title}</h2>
      <p className="mt-2 font-semibold">{notice.message}</p>
    </div>
  )
}

export default function AdminImportPage() {
  const [fileName, setFileName] = useState('')
  const [fileChecksum, setFileChecksum] = useState('')
  const [validated, setValidated] = useState<ValidatedWorkbook | null>(null)
  const [parsedSheets, setParsedSheets] = useState<WorkbookSheets | null>(null)
  const [working, setWorking] = useState(false)
  const [notice, setNotice] = useState<ImportNotice | null>(null)
  const [adminToken, setAdminToken] = useState('')

  async function handleFile(file?: File) {
    if (!file) return

    setWorking(true)
    setNotice(null)
    setValidated(null)
    setParsedSheets(null)
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
      setNotice({
        kind: 'error',
        title: 'Workbook Parse Failed',
        message,
      })
    } finally {
      setWorking(false)
    }
  }

  async function createImportBatch() {
    if (!validated || !parsedSheets) {
      setNotice({
        kind: 'error',
        title: 'Import Not Ready',
        message: 'Upload and validate an Engineering Workbook before running the atomic game import.',
      })
      return
    }

    setWorking(true)
    setNotice(null)

    if (!adminToken.trim()) {
      setNotice({
        kind: 'error',
        title: 'Import Not Ready',
        message: 'Enter the admin import token before running the atomic game import.',
      })
      setWorking(false)
      return
    }

    if (!validated.summary.canImport || validated.errors.length > 0) {
      setNotice({
        kind: 'error',
        title: 'Workbook Has Blocking Errors',
        message: 'Fix the workbook errors shown below before running the atomic game import.',
      })
      setWorking(false)
      return
    }

    const batchNumber = makeBatchNumber()

    const requestBody: ImportWorkbookInput = {
      validated,
      parsedSheets,
      workbookName: fileName,
      fileChecksum,
      batchNumber,
      workbookVersion: 'Engineering Workbook v1',
      importerVersion: 'RC1.4-importer-0.1',
      createdBy: 'admin/import',
      siteOrigin: 'https://play.historyhuntgames.com',
    }

    try {
      const response = await fetch('/api/admin/import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-import-token': adminToken.trim(),
        },
        body: JSON.stringify(requestBody),
      })

      const responseBody = await readResponseBody(response)

      if (!response.ok) {
        const serverError = valueToString(responseBody.error)
        const serverMessage = valueToString(responseBody.message)
        const serverDetails = valueToString(responseBody.details)

        setNotice({
          kind: 'error',
          title: 'Atomic Game Import Failed',
          message: serverError || serverMessage || `Import failed with status ${response.status}.`,
          statusCode: response.status,
          detail: serverDetails,
        })
        return
      }

      const result = responseBody as unknown as ImportWorkbookResult

      if (!result.batchNumber || !result.gameSlug) {
        setNotice({
          kind: 'error',
          title: 'Invalid Import Response',
          message: 'The server returned 200 OK, but the import response did not include the expected batch number and game slug.',
          detail: JSON.stringify(responseBody, null, 2),
        })
        return
      }

      setNotice({
        kind: 'success',
        title: 'Successful Import',
        result,
      })
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unable to run atomic game import.'
      setNotice({
        kind: 'error',
        title: 'Atomic Game Import Failed',
        message,
      })
    } finally {
      setWorking(false)
    }
  }

  return (
    <main className="min-h-screen bg-slate-100 p-6">
      <div className="mx-auto max-w-5xl">
        <div className="rounded-3xl bg-white p-6 shadow-xl">
          <p className="text-sm font-bold uppercase tracking-wide text-red-600">
            History Hunt™ RC1.4 Admin
          </p>
          <h1 className="mt-2 text-3xl font-bold text-blue-900">
            Bulk Game Importer
          </h1>
          <p className="mt-3 text-gray-600">
            Upload an Engineering Workbook, validate Hunt Info and Questions, preview issues, and run the atomic game import.
          </p>

          <div className="mt-6 rounded-2xl border border-orange-200 bg-orange-50 p-4">
            <label className="block text-sm font-bold uppercase tracking-wide text-orange-900">
              Admin Import Token
            </label>
            <input
              type="password"
              value={adminToken}
              disabled={working}
              onChange={event => setAdminToken(event.target.value)}
              className="mt-2 block w-full rounded-xl border bg-white p-3"
              placeholder="Enter Dev-Test import token"
              autoComplete="off"
            />
            <p className="mt-2 text-sm text-orange-900">
              Required for server-side imports. This keeps the service-role importer route from being open to the public.
            </p>
          </div>

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
              Required tabs for RC1.4: Hunt Info and Questions.
            </p>
          </div>

          {working && (
            <p className="mt-4 font-semibold text-blue-900">Working...</p>
          )}

          <ImportNoticePanel notice={notice} />
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
                <p className="mt-1 text-green-700">No blocking errors. Ready to run atomic game import.</p>
              ) : (
                <p className="mt-1 text-red-700">Blocking errors found. Fix the workbook before importing game data.</p>
              )}
            </div>

            <button
              disabled={working || !validated.summary.canImport || !adminToken.trim()}
              onClick={createImportBatch}
              className="mt-6 rounded-xl bg-blue-900 px-6 py-4 text-lg font-bold text-white disabled:cursor-not-allowed disabled:bg-gray-400"
            >
              {working ? 'Working...' : 'Run Atomic Game Import'}
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
