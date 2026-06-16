import express from 'express'
import fs from 'fs/promises'
import path from 'path'
import { randomUUID } from 'crypto'
import rateLimit from 'express-rate-limit'
import { getLanguage, isValidLanguage, DEFAULT_LANGUAGE } from './languages.js'
import { compileCode, runCode } from './executor.js'
import * as log from './log.js'

const validId = (id) => /^[a-z0-9_-]+$/.test(id)

function makeSlug(title) {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 40)
    || 'snippet'
  const hash = randomUUID().replace(/-/g, '').slice(0, 8)
  return `${slug}_${hash}`
}

// P16: reject dot-prefix names (.env, .bashrc)
const validFilename = (n) => /^[a-zA-Z0-9][a-zA-Z0-9_.-]*$/.test(n) && !n.includes('..')

// P11: rate limit compile+exec endpoints — 10 req/min per IP; skip in test (VITEST env)
const runLimiter = rateLimit({ windowMs: 60_000, max: 60, standardHeaders: true, legacyHeaders: false, skip: () => !!process.env.VITEST })

// P15: tags element-level validation
function validateTags(tags) {
  if (!Array.isArray(tags)) return 'Tags must be an array'
  if (tags.length > 20) return 'Too many tags (max 20)'
  if (tags.some(t => typeof t !== 'string' || t.length > 50)) return 'Invalid tag (max 50 chars each)'
  return null
}

const ALLOWED_FLAGS = new Set([
  // C / C++
  '-O0', '-O1', '-O2', '-O3',
  '-Wall', '-Wextra', '-Werror',
  '-std=c++17', '-std=c++20', '-std=c++23',
  '-std=c11', '-std=c99',
  '-lm', '-lpthread',
  '-g', '-DDEBUG',
  // Go
  '-race', '-v',
  // Rust
  '--edition 2021', '--edition 2024', '-O',
  // Java
  '-Xlint',
])

function validateCompilerFlags(flags) {
  if (!Array.isArray(flags)) return 'compilerFlags must be an array'
  const invalid = flags.filter(f => !ALLOWED_FLAGS.has(f))
  if (invalid.length) return `Disallowed flags: ${invalid.join(', ')}`
  return null
}

const MAX_RUN_OUTPUT = 2000

export default function snippetRoutes(DATA_DIR) {
  const router = express.Router()
  const dir = (id) => path.join(DATA_DIR, id)

  // P20: log DATA_DIR creation failure instead of swallowing
  fs.mkdir(DATA_DIR, { recursive: true }).catch(e => log.error('DATA_DIR mkdir failed', e))

  router.get('/health', (_req, res) => res.json({ status: 'ok' }))

  router.get('/snippets', async (req, res) => {
    try {
      const entries = await fs.readdir(DATA_DIR)
      const q = req.query.q?.toLowerCase().trim()

      const snippets = await Promise.all(entries.map(async (id) => {
        try {
          const meta = JSON.parse(await fs.readFile(path.join(DATA_DIR, id, 'meta.json'), 'utf-8'))
          if (!q) return meta

          const inMeta =
            meta.title?.toLowerCase().includes(q) ||
            meta.notes?.toLowerCase().includes(q) ||
            meta.tags?.some(t => t.toLowerCase().includes(q))
          if (inMeta) return meta

          for (const fname of (meta.files ?? [])) {
            try {
              const content = await fs.readFile(path.join(DATA_DIR, id, fname), 'utf-8')
              if (content.toLowerCase().includes(q)) return meta
            } catch {}
          }
          return null
        } catch { return null }
      }))

      // P8: null-safe updatedAt; pinned items sort first
      const filtered = snippets.filter(Boolean)
      filtered.sort((a, b) => {
        if (a.pinned && !b.pinned) return -1
        if (!a.pinned && b.pinned) return 1
        return (b.updatedAt ?? '').localeCompare(a.updatedAt ?? '')
      })
      res.json(filtered)
    } catch (e) {
      log.error('[routes] GET /snippets failed', e)
      res.json([])
    }
  })

  router.get('/snippets/:id', async (req, res) => {
    const { id } = req.params
    if (!validId(id)) return res.status(400).json({ error: 'Invalid id' })
    try {
      const meta = JSON.parse(await fs.readFile(path.join(dir(id), 'meta.json'), 'utf-8'))
      const files = await Promise.all(meta.files.map(async (name) => ({
        name,
        content: await fs.readFile(path.join(dir(id), name), 'utf-8').catch(() => ''),
      })))
      res.json({ ...meta, files })
    } catch (e) {
      log.error('[routes] GET /snippets/:id failed', { id }, e)
      res.status(404).json({ error: 'Not found' })
    }
  })

  router.get('/export', async (req, res) => {
    try {
      const entries = await fs.readdir(DATA_DIR)
      const snippets = await Promise.all(entries.map(async (id) => {
        try {
          const meta = JSON.parse(await fs.readFile(path.join(DATA_DIR, id, 'meta.json'), 'utf-8'))
          const files = await Promise.all((meta.files ?? []).map(async (name) => ({
            name,
            content: await fs.readFile(path.join(DATA_DIR, id, name), 'utf-8').catch(() => ''),
          })))
          return { ...meta, files }
        } catch { return null }
      }))
      res.json(snippets.filter(Boolean))
    } catch (e) {
      log.error('[routes] GET /export failed', e)
      res.status(500).json({ error: 'Export failed' })
    }
  })

  router.post('/snippets', async (req, res) => {
    const { title, tags, notes, files } = req.body

    // P23: server-side title validation
    if (!title || typeof title !== 'string' || !title.trim()) {
      return res.status(400).json({ error: 'Title required' })
    }
    if (title.trim().length > 100) return res.status(400).json({ error: 'Title too long (max 100)' })
    if (notes && notes.length > 5000) return res.status(400).json({ error: 'Notes too long (max 5000)' })
    if (!files?.length) return res.status(400).json({ error: 'No files' })

    // P15: tags validation
    if (tags !== undefined) {
      const tagErr = validateTags(tags)
      if (tagErr) return res.status(400).json({ error: tagErr })
    }

    if (req.body.compilerFlags !== undefined) {
      const flagErr = validateCompilerFlags(req.body.compilerFlags)
      if (flagErr) return res.status(400).json({ error: flagErr })
    }

    const id = makeSlug(title.trim())
    const now = new Date().toISOString()
    const language = isValidLanguage(req.body.language) ? req.body.language : DEFAULT_LANGUAGE
    const validFiles = files.filter(f => validFilename(f.name))

    // P4: try/catch; on failure delete partial dir to avoid orphaned directories
    try {
      await fs.mkdir(dir(id), { recursive: true })
      // P7: write source files before meta — partial failure won't corrupt meta
      await Promise.all(validFiles.map(f => fs.writeFile(path.join(dir(id), f.name), f.content || '')))
      const meta = {
        id,
        title: title.trim(),
        tags: tags ?? [],
        notes: notes || '',
        language,
        files: validFiles.map(f => f.name),
        pinned: req.body.pinned === true,
        compilerFlags: req.body.compilerFlags ?? [],
        createdAt: now,
        updatedAt: now,
      }
      await fs.writeFile(path.join(dir(id), 'meta.json'), JSON.stringify(meta, null, 2))
      res.status(201).json(meta)
    } catch (e) {
      log.error('[routes] POST /snippets failed', e)
      fs.rm(dir(id), { recursive: true, force: true }).catch(() => {})  // P4: rollback
      res.status(500).json({ error: 'Failed to create snippet' })
    }
  })

  router.put('/snippets/:id', async (req, res) => {
    const { id } = req.params
    if (!validId(id)) return res.status(400).json({ error: 'Invalid id' })
    const { title, tags, notes, files } = req.body

    // P23: title validation — only when title is explicitly being updated
    if (title !== undefined && (!title || typeof title !== 'string' || !title.trim())) {
      return res.status(400).json({ error: 'Title required' })
    }
    if (title !== undefined && title.trim().length > 100) return res.status(400).json({ error: 'Title too long (max 100)' })
    if (notes !== undefined && notes.length > 5000) return res.status(400).json({ error: 'Notes too long (max 5000)' })

    // P15: tags validation — only when tags are explicitly being updated
    if (tags !== undefined) {
      const tagErr = validateTags(tags)
      if (tagErr) return res.status(400).json({ error: tagErr })
    }

    if (req.body.compilerFlags !== undefined) {
      const flagErr = validateCompilerFlags(req.body.compilerFlags)
      if (flagErr) return res.status(400).json({ error: flagErr })
    }

    try {
      const meta = JSON.parse(await fs.readFile(path.join(dir(id), 'meta.json'), 'utf-8'))
      const language = req.body.language && getLanguage(req.body.language) ? req.body.language : (meta.language ?? DEFAULT_LANGUAGE)

      // P7: write source files before meta — meta only reflects what's actually on disk
      const validFiles = files ? files.filter(f => validFilename(f.name)) : null
      if (validFiles) {
        await Promise.all(validFiles.map(f => fs.writeFile(path.join(dir(id), f.name), f.content || '')))
        const newNames = new Set(validFiles.map(f => f.name))
        const removed = meta.files.filter(n => !newNames.has(n))
        await Promise.all(removed.map(n => fs.unlink(path.join(dir(id), n)).catch(() => {})))
      }

      const updated = {
        ...meta,
        title: title !== undefined ? title.trim() : meta.title,
        tags: tags ?? meta.tags,
        notes: notes ?? meta.notes,
        language,
        files: validFiles ? validFiles.map(f => f.name) : meta.files,
        pinned: req.body.pinned !== undefined ? req.body.pinned === true : (meta.pinned ?? false),
        compilerFlags: req.body.compilerFlags !== undefined ? req.body.compilerFlags : (meta.compilerFlags ?? []),
        updatedAt: new Date().toISOString(),
      }
      await fs.writeFile(path.join(dir(id), 'meta.json'), JSON.stringify(updated, null, 2))
      res.json(updated)
    } catch (e) {
      log.error('[routes] PUT /snippets/:id failed', { id }, e)
      res.status(404).json({ error: 'Not found' })
    }
  })

  router.patch('/snippets/:id/pin', async (req, res) => {
    const { id } = req.params
    if (!validId(id)) return res.status(400).json({ error: 'Invalid id' })
    try {
      const metaPath = path.join(dir(id), 'meta.json')
      const meta = JSON.parse(await fs.readFile(metaPath, 'utf-8'))
      meta.pinned = !meta.pinned
      meta.updatedAt = new Date().toISOString()
      await fs.writeFile(metaPath, JSON.stringify(meta, null, 2))
      res.json({ pinned: meta.pinned })
    } catch (e) {
      log.error('[routes] PATCH /snippets/:id/pin failed', { id }, e)
      res.status(404).json({ error: 'Not found' })
    }
  })

  router.delete('/snippets/:id', async (req, res) => {
    const { id } = req.params
    if (!validId(id)) return res.status(400).json({ error: 'Invalid id' })
    try {
      await fs.access(dir(id))
      await fs.rm(dir(id), { recursive: true, force: true })
      res.json({ ok: true })
    } catch (e) {
      log.error('[routes] DELETE /snippets/:id failed', { id }, e)
      res.status(404).json({ error: 'Not found' })
    }
  })

  router.post('/snippets/:id/run', runLimiter, async (req, res) => {
    const { id } = req.params
    if (!validId(id)) return res.status(400).json({ error: 'Invalid id' })
    const { stdin = '' } = req.body
    const snippetDir = dir(id)
    const outBin = `/tmp/cppvault-${id}`

    let meta, srcFiles, lang, metaPath
    try {
      metaPath = path.join(snippetDir, 'meta.json')
      meta = JSON.parse(await fs.readFile(metaPath, 'utf-8'))
      lang = getLanguage(meta.language ?? DEFAULT_LANGUAGE)
      // P2: re-validate every filename loaded from meta.json — defense against tampered storage
      srcFiles = meta.files
        .filter(f => validFilename(f) && f.endsWith(lang.ext))
        .map(f => path.join(snippetDir, f))
    } catch (e) {
      log.error('[routes] POST /snippets/:id/run load failed', { id }, e)
      return res.status(404).json({ error: 'Snippet not found' })
    }

    if (!lang.runner) return res.status(405).json({ error: 'This language is not executable' })
    if (!srcFiles.length) return res.json({ stdout: '', stderr: `No ${lang.ext} files found`, exitCode: 1 })

    // P2: compile via spawn with argv array — no shell
    // P13: sanitize snippetDir prefix from compiler error output
    if (lang.compile) {
      const compilerFlags = (meta.compilerFlags ?? []).filter(f => ALLOWED_FLAGS.has(f))
      const { err, stderr } = await compileCode(lang.compile(srcFiles, outBin, compilerFlags))
      if (err) {
        const cleaned = stderr.replaceAll(snippetDir + '/', '')
        return res.json({ stdout: '', stderr: cleaned, exitCode: 1 })
      }
    }

    // executor handles P3 (done guard), P5 (error handler), P10 (process group kill),
    // P14 (stdin cap), P17 (cleanup on timeout)
    let result
    try {
      result = await runCode({
        lang,
        srcFiles,
        outBin,
        stdin,
        cleanup: () => fs.unlink(outBin).catch(() => {}),
      })
    } catch (e) {
      log.error('[routes] POST /snippets/:id/run exec failed', { id }, e)
      return res.status(500).json({ error: 'Execution failed' })
    }

    // store run in meta; keep last 5; fire-and-forget
    const entry = {
      stdout: result.stdout.slice(0, MAX_RUN_OUTPUT),
      stderr: result.stderr.slice(0, MAX_RUN_OUTPUT),
      exitCode: result.exitCode,
      timestamp: new Date().toISOString(),
    }
    const runs = [entry, ...(meta.runs ?? [])].slice(0, 5)
    fs.writeFile(metaPath, JSON.stringify({ ...meta, runs }, null, 2)).catch(() => {})

    res.json(result)
  })

  router.post('/playground/run', runLimiter, async (req, res) => {
    const { code = '', stdin = '', language: langId } = req.body
    const lang = getLanguage(langId)
    if (!lang.runner) return res.status(405).json({ error: 'This language is not executable' })
    const id = randomUUID()
    const tmpDir = `/tmp/playground-${id}`
    const srcFile = `${tmpDir}/${lang.srcFile}`
    const outBin = `${tmpDir}/out`

    try {
      await fs.mkdir(tmpDir, { recursive: true })
      await fs.writeFile(srcFile, lang.playgroundWrap(code))
    } catch (e) {
      log.error('[routes] POST /playground/run setup failed', e)
      return res.json({ stdout: '', stderr: e.message, exitCode: 1 })
    }

    const cleanup = () => fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {})

    // P2: compile via spawn with argv array — no shell
    if (lang.compile) {
      const { err, stderr } = await compileCode(lang.compile([srcFile], outBin))
      if (err) {
        await cleanup()
        const cleaned = stderr.replace(/\/tmp\/playground-[^/]+\/[^:]+/g, lang.srcFile)
        return res.json({ stdout: '', stderr: cleaned, exitCode: 1 })
      }
    }

    // executor handles P3, P5, P10, P14, P17 (tmpDir cleanup covers binary too)
    try {
      const result = await runCode({ lang, srcFiles: [srcFile], outBin, stdin, cleanup })
      res.json(result)
    } catch (e) {
      log.error('[routes] POST /playground/run exec failed', e)
      res.status(500).json({ error: 'Execution failed' })
    }
  })

  return router
}
