import express from 'express'
import fs from 'fs/promises'
import path from 'path'
import { randomUUID } from 'crypto'
import { exec, spawn } from 'child_process'
import { getLanguage, isValidLanguage, DEFAULT_LANGUAGE } from './languages.js'

const validId = (id) => /^[a-zA-Z0-9-]+$/.test(id)
const validFilename = (n) => /^[a-zA-Z0-9_.-]+$/.test(n) && !n.includes('..')

export default function snippetRoutes(DATA_DIR) {
  const router = express.Router()
  const dir = (id) => path.join(DATA_DIR, id)

  fs.mkdir(DATA_DIR, { recursive: true }).catch(() => {})

  router.get('/snippets', async (req, res) => {
    try {
      const entries = await fs.readdir(DATA_DIR)
      const snippets = await Promise.all(entries.map(async (id) => {
        try {
          return JSON.parse(await fs.readFile(path.join(DATA_DIR, id, 'meta.json'), 'utf-8'))
        } catch { return null }
      }))
      res.json(snippets.filter(Boolean).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)))
    } catch { res.json([]) }
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
    } catch { res.status(404).json({ error: 'Not found' }) }
  })

  router.post('/snippets', async (req, res) => {
    const { title, tags, notes, files } = req.body
    if (!files?.length) return res.status(400).json({ error: 'No files' })
    const id = randomUUID()
    const now = new Date().toISOString()
    const language = isValidLanguage(req.body.language) ? req.body.language : DEFAULT_LANGUAGE
    const meta = { id, title: title || 'Untitled', tags: tags || [], notes: notes || '', language, files: files.map(f => f.name), createdAt: now, updatedAt: now }
    await fs.mkdir(dir(id), { recursive: true })
    await fs.writeFile(path.join(dir(id), 'meta.json'), JSON.stringify(meta, null, 2))
    await Promise.all(files.filter(f => validFilename(f.name)).map(f => fs.writeFile(path.join(dir(id), f.name), f.content || '')))
    res.status(201).json(meta)
  })

  router.put('/snippets/:id', async (req, res) => {
    const { id } = req.params
    if (!validId(id)) return res.status(400).json({ error: 'Invalid id' })
    const { title, tags, notes, files } = req.body
    try {
      const meta = JSON.parse(await fs.readFile(path.join(dir(id), 'meta.json'), 'utf-8'))
      const language = req.body.language && getLanguage(req.body.language) ? req.body.language : (meta.language ?? DEFAULT_LANGUAGE)
      const updated = { ...meta, title: title ?? meta.title, tags: tags ?? meta.tags, notes: notes ?? meta.notes, language, files: files ? files.map(f => f.name) : meta.files, updatedAt: new Date().toISOString() }
      await fs.writeFile(path.join(dir(id), 'meta.json'), JSON.stringify(updated, null, 2))
      if (files) {
        await Promise.all(files.filter(f => validFilename(f.name)).map(f => fs.writeFile(path.join(dir(id), f.name), f.content || '')))
        const newNames = new Set(files.map(f => f.name))
        const removed = meta.files.filter(n => !newNames.has(n))
        await Promise.all(removed.map(n => fs.unlink(path.join(dir(id), n)).catch(() => {})))
      }
      res.json(updated)
    } catch { res.status(404).json({ error: 'Not found' }) }
  })

  router.delete('/snippets/:id', async (req, res) => {
    const { id } = req.params
    if (!validId(id)) return res.status(400).json({ error: 'Invalid id' })
    try {
      await fs.access(dir(id))
      await fs.rm(dir(id), { recursive: true, force: true })
      res.json({ ok: true })
    } catch { res.status(404).json({ error: 'Not found' }) }
  })

  router.post('/snippets/:id/run', async (req, res) => {
    const { id } = req.params
    if (!validId(id)) return res.status(400).json({ error: 'Invalid id' })
    const { stdin = '' } = req.body
    const snippetDir = dir(id)
    const outBin = `/tmp/cppvault-${id}`

    let srcFiles, lang
    try {
      const meta = JSON.parse(await fs.readFile(path.join(snippetDir, 'meta.json'), 'utf-8'))
      lang = getLanguage(meta.language ?? DEFAULT_LANGUAGE)
      srcFiles = meta.files.filter(f => f.endsWith(lang.ext)).map(f => path.join(snippetDir, f))
    } catch { return res.status(404).json({ error: 'Snippet not found' }) }

    if (!srcFiles.length) return res.json({ stdout: '', stderr: `No ${lang.ext} files found`, exitCode: 1 })

    const runProgram = () => {
      const [cmd, ...args] = lang.runner(outBin, srcFiles)
      const child = spawn(cmd, args)
      let stdout = '', runErr = ''
      child.stdout.on('data', d => stdout += d)
      child.stderr.on('data', d => runErr += d)
      child.stdin.on('error', () => {})
      if (stdin) child.stdin.write(stdin)
      child.stdin.end()

      const timer = setTimeout(() => {
        child.kill()
        res.json({ stdout, stderr: 'Timeout (10s)', exitCode: 124 })
      }, 10000)

      child.on('close', (code) => {
        clearTimeout(timer)
        fs.unlink(outBin).catch(() => {})
        res.json({ stdout, stderr: runErr, exitCode: code })
      })
    }

    if (lang.compile) {
      exec(lang.compile(srcFiles, outBin), { timeout: 15000 }, (err, _, stderr) => {
        if (err) return res.json({ stdout: '', stderr, exitCode: 1 })
        runProgram()
      })
    } else {
      runProgram()
    }
  })

  router.post('/playground/run', async (req, res) => {
    const { code = '', stdin = '', language: langId } = req.body
    const lang = getLanguage(langId)
    const id = randomUUID()
    const tmpDir = `/tmp/playground-${id}`
    const srcFile = `${tmpDir}/${lang.srcFile}`
    const outBin = `${tmpDir}/out`

    try {
      await fs.mkdir(tmpDir, { recursive: true })
      await fs.writeFile(srcFile, lang.playgroundWrap(code))
    } catch (e) {
      return res.json({ stdout: '', stderr: e.message, exitCode: 1 })
    }

    const runPlayground = () => {
      const [cmd, ...args] = lang.runner(outBin, [srcFile])
      const child = spawn(cmd, args)
      let stdout = '', runErr = ''
      child.stdout.on('data', d => stdout += d)
      child.stderr.on('data', d => runErr += d)
      child.stdin.on('error', () => {})
      if (stdin) child.stdin.write(stdin)
      child.stdin.end()

      const timer = setTimeout(() => {
        child.kill()
        fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {})
        res.json({ stdout, stderr: 'Timeout (10s)', exitCode: 124 })
      }, 10000)

      child.on('close', (code) => {
        clearTimeout(timer)
        fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {})
        res.json({ stdout, stderr: runErr, exitCode: code })
      })
    }

    if (lang.compile) {
      exec(lang.compile([srcFile], outBin), { timeout: 15000 }, (err, _, stderr) => {
        if (err) {
          fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {})
          const cleaned = stderr.replace(/\/tmp\/playground-[^/]+\/[^:]+/g, lang.srcFile)
          return res.json({ stdout: '', stderr: cleaned, exitCode: 1 })
        }
        runPlayground()
      })
    } else {
      runPlayground()
    }
  })

  return router
}
