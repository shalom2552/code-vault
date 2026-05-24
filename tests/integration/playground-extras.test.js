import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { execSync } from 'child_process'
import fs from 'fs/promises'
import request from 'supertest'
import { makeApp } from '../helpers/make-app.js'
import { makeTmpDir, removeTmpDir } from '../helpers/tmp.js'

function hasBin(name) {
  try { execSync(`which ${name}`, { stdio: 'ignore' }); return true } catch { return false }
}

// Alpine uses /bin/sh (ash), not bash — server runner for 'bash' language uses /bin/sh
const hasSh = hasBin('sh')
const hasGo = hasBin('go')
const hasRustc = hasBin('rustc')

const COMPILE_TIMEOUT = 30000

describe('playground /run — extra languages', () => {
  let app, dataDir

  beforeAll(async () => {
    dataDir = await makeTmpDir()
    app = makeApp(dataDir)
  })

  afterAll(async () => {
    await removeTmpDir(dataDir)
  })

  // JavaScript and Go playground are disabled: ulimit -v 131072 (128 MB) is too small
  // for their runtimes. Node.js and Go binaries require > 128 MB virtual memory to
  // initialize, causing them to hang (JS) or crash with exit 2 (Go) under the cap.

  describe('Bash (via /bin/sh)', () => {
    it.skipIf(!hasSh)('runs code and returns stdout', async () => {
      const res = await request(app)
        .post('/api/playground/run')
        .send({ code: 'echo hello', language: 'bash' })
      expect(res.body.exitCode).toBe(0)
      expect(res.body.stdout.trim()).toBe('hello')
    })

    it.skipIf(!hasSh)('returns non-zero exit code', async () => {
      const res = await request(app)
        .post('/api/playground/run')
        .send({ code: 'exit 5', language: 'bash' })
      expect(res.body.exitCode).toBe(5)
    })

    it.skipIf(!hasSh)('captures stderr', async () => {
      const res = await request(app)
        .post('/api/playground/run')
        .send({ code: 'echo err >&2', language: 'bash' })
      expect(res.body.stderr.trim()).toBe('err')
    })

    it.skipIf(!hasSh)('cleans up temp directory after run', async () => {
      const before = (await fs.readdir('/tmp')).filter(f => f.startsWith('playground-'))
      await request(app)
        .post('/api/playground/run')
        .send({ code: 'echo 1', language: 'bash' })
      const after = (await fs.readdir('/tmp')).filter(f => f.startsWith('playground-'))
      expect(after.length).toBe(before.length)
    })
  })

  describe('Go', () => {
    // Note: 'go build' compile step works. Running the binary fails under ulimit -v 131072.
    it.skipIf(!hasGo)('returns compile error for invalid Go', async () => {
      const res = await request(app)
        .post('/api/playground/run')
        .send({ code: 'this is not go', language: 'go' })
      expect(res.body.exitCode).toBe(1)
      expect(res.body.stderr).toBeTruthy()
    }, COMPILE_TIMEOUT)
  })

  describe('Rust', () => {
    it.skipIf(!hasRustc)('compiles and runs, returns stdout', async () => {
      const res = await request(app)
        .post('/api/playground/run')
        .send({
          code: 'fn main() { println!("hello"); }',
          language: 'rust',
        })
      expect(res.body.exitCode).toBe(0)
      expect(res.body.stdout.trim()).toBe('hello')
    }, COMPILE_TIMEOUT)

    it.skipIf(!hasRustc)('returns compile error for invalid Rust', async () => {
      const res = await request(app)
        .post('/api/playground/run')
        .send({ code: 'this is not rust', language: 'rust' })
      expect(res.body.exitCode).toBe(1)
      expect(res.body.stderr).toBeTruthy()
    }, COMPILE_TIMEOUT)

    it.skipIf(!hasRustc)('cleans up temp directory after run', async () => {
      const before = (await fs.readdir('/tmp')).filter(f => f.startsWith('playground-'))
      await request(app)
        .post('/api/playground/run')
        .send({ code: 'fn main() {}', language: 'rust' })
      const after = (await fs.readdir('/tmp')).filter(f => f.startsWith('playground-'))
      expect(after.length).toBe(before.length)
    }, COMPILE_TIMEOUT)
  })
})
