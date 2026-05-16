import express from 'express'
import fs from 'fs/promises'
import path from 'path'
import { randomUUID } from 'crypto'
import { exec, spawn } from 'child_process'

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
    const meta = { id, title: title || 'Untitled', tags: tags || [], notes: notes || '', files: files.map(f => f.name), createdAt: now, updatedAt: now }
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
      const updated = { ...meta, title: title ?? meta.title, tags: tags ?? meta.tags, notes: notes ?? meta.notes, files: files ? files.map(f => f.name) : meta.files, updatedAt: new Date().toISOString() }
      await fs.writeFile(path.join(dir(id), 'meta.json'), JSON.stringify(updated, null, 2))
      if (files) await Promise.all(files.filter(f => validFilename(f.name)).map(f => fs.writeFile(path.join(dir(id), f.name), f.content || '')))
      res.json(updated)
    } catch { res.status(404).json({ error: 'Not found' }) }
  })

  router.delete('/snippets/:id', async (req, res) => {
    const { id } = req.params
    if (!validId(id)) return res.status(400).json({ error: 'Invalid id' })
    try {
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

    let cppFiles
    try {
      const all = await fs.readdir(snippetDir)
      cppFiles = all.filter(f => f.endsWith('.cpp')).map(f => path.join(snippetDir, f))
    } catch { return res.status(404).json({ error: 'Snippet not found' }) }

    if (!cppFiles.length) return res.json({ stdout: '', stderr: 'No .cpp files found', exitCode: 1 })

    exec(`g++ ${cppFiles.join(' ')} -o ${outBin}`, { timeout: 15000 }, (err, _, stderr) => {
      if (err) return res.json({ stdout: '', stderr, exitCode: 1 })

      const child = spawn(outBin, [], { timeout: 10000 })
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
    })
  })

  router.post('/playground/run', async (req, res) => {
    const { code = '', stdin = '' } = req.body
    const id = randomUUID()
    const tmpDir = `/tmp/playground-${id}`
    const srcFile = `${tmpDir}/main.cpp`
    const outBin = `${tmpDir}/out`

    try {
      await fs.mkdir(tmpDir, { recursive: true })
      await fs.writeFile(srcFile, code)
    } catch (e) {
      return res.json({ stdout: '', stderr: e.message, exitCode: 1 })
    }

    exec(`g++ ${srcFile} -o ${outBin}`, { timeout: 15000 }, (err, _, stderr) => {
      if (err) {
        fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {})
        const cleaned = stderr.replace(/\/tmp\/playground-[^/]+\/main\.cpp/g, 'main.cpp')
        return res.json({ stdout: '', stderr: cleaned, exitCode: 1 })
      }

      const child = spawn(outBin, [], { timeout: 10000 })
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
    })
  })

  return router
}
