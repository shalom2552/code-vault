import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import request from 'supertest'
import fs from 'fs/promises'
import path from 'path'
import { makeApp } from '../helpers/make-app.js'
import { makeTmpDir, removeTmpDir } from '../helpers/tmp.js'

const COMPILE_TIMEOUT = 30000

describe('snippets /run', () => {
  let app, dataDir

  beforeAll(async () => {
    dataDir = await makeTmpDir()
    app = makeApp(dataDir)
  })

  afterAll(async () => {
    await removeTmpDir(dataDir)
  })

  async function createSnippet(language, files) {
    const res = await request(app)
      .post('/api/snippets')
      .send({ title: 'test', language, files })
    return res.body
  }

  // ---------------------------------------------------------------------------
  // C++
  // ---------------------------------------------------------------------------

  describe('C++', () => {
    it('compiles and runs, returns stdout', async () => {
      const s = await createSnippet('cpp', [{
        name: 'main.cpp',
        content: '#include <iostream>\nusing namespace std;\nint main(){ cout << "hello"; return 0; }',
      }])
      const res = await request(app).post(`/api/snippets/${s.id}/run`).send({})
      expect(res.body.exitCode).toBe(0)
      expect(res.body.stdout.trim()).toBe('hello')
    }, COMPILE_TIMEOUT)

    it('exits with code 0 on clean return', async () => {
      const s = await createSnippet('cpp', [{ name: 'main.cpp', content: 'int main(){ return 0; }' }])
      const res = await request(app).post(`/api/snippets/${s.id}/run`).send({})
      expect(res.body.exitCode).toBe(0)
    }, COMPILE_TIMEOUT)

    it('returns non-zero exit code on abnormal exit', async () => {
      const s = await createSnippet('cpp', [{ name: 'main.cpp', content: 'int main(){ return 42; }' }])
      const res = await request(app).post(`/api/snippets/${s.id}/run`).send({})
      expect(res.body.exitCode).toBe(42)
    }, COMPILE_TIMEOUT)

    it('returns compile error with exitCode 1 and stderr', async () => {
      const s = await createSnippet('cpp', [{ name: 'main.cpp', content: 'int main(){ INVALID }' }])
      const res = await request(app).post(`/api/snippets/${s.id}/run`).send({})
      expect(res.body.exitCode).toBe(1)
      expect(res.body.stderr).toBeTruthy()
      expect(res.body.stdout).toBe('')
    }, COMPILE_TIMEOUT)

    it('passes stdin to program', async () => {
      const s = await createSnippet('cpp', [{
        name: 'main.cpp',
        content: '#include <iostream>\nusing namespace std;\nint main(){ string s; cin >> s; cout << s; return 0; }',
      }])
      const res = await request(app).post(`/api/snippets/${s.id}/run`).send({ stdin: 'world' })
      expect(res.body.stdout.trim()).toBe('world')
      expect(res.body.exitCode).toBe(0)
    }, COMPILE_TIMEOUT)

    it('captures stderr from running program', async () => {
      const s = await createSnippet('cpp', [{
        name: 'main.cpp',
        content: '#include <iostream>\nusing namespace std;\nint main(){ cerr << "err"; return 0; }',
      }])
      const res = await request(app).post(`/api/snippets/${s.id}/run`).send({})
      expect(res.body.stderr.trim()).toBe('err')
      expect(res.body.exitCode).toBe(0)
    }, COMPILE_TIMEOUT)

    it('only compiles files in meta — orphaned .cpp files on disk are ignored', async () => {
      const s = await createSnippet('cpp', [{ name: 'main.cpp', content: 'int main(){ return 0; }' }])
      // Orphan with a duplicate main() — would cause linker error if compiled
      await fs.writeFile(path.join(dataDir, s.id, 'orphan.cpp'), 'int main(){ return 1; }')
      const res = await request(app).post(`/api/snippets/${s.id}/run`).send({})
      expect(res.body.exitCode).toBe(0)
    }, COMPILE_TIMEOUT)

    it('returns error when source file is missing from disk', async () => {
      const s = await createSnippet('cpp', [{ name: 'main.cpp', content: 'int main(){}' }])
      await fs.unlink(path.join(dataDir, s.id, 'main.cpp'))
      const res = await request(app).post(`/api/snippets/${s.id}/run`).send({})
      expect(res.body.exitCode).toBe(1)
    }, COMPILE_TIMEOUT)

    it('cleans up compiled binary after run', async () => {
      const s = await createSnippet('cpp', [{ name: 'main.cpp', content: 'int main(){}' }])
      await request(app).post(`/api/snippets/${s.id}/run`).send({})
      const exists = await fs.access(`/tmp/cppvault-${s.id}`).then(() => true).catch(() => false)
      expect(exists).toBe(false)
    }, COMPILE_TIMEOUT)
  })

  // ---------------------------------------------------------------------------
  // C
  // ---------------------------------------------------------------------------

  describe('C', () => {
    it('compiles and runs, returns stdout', async () => {
      const s = await createSnippet('c', [{
        name: 'main.c',
        content: '#include <stdio.h>\nint main(){ printf("hello"); return 0; }',
      }])
      const res = await request(app).post(`/api/snippets/${s.id}/run`).send({})
      expect(res.body.exitCode).toBe(0)
      expect(res.body.stdout.trim()).toBe('hello')
    }, COMPILE_TIMEOUT)

    it('returns compile error for invalid C', async () => {
      const s = await createSnippet('c', [{ name: 'main.c', content: 'int main(){ INVALID }' }])
      const res = await request(app).post(`/api/snippets/${s.id}/run`).send({})
      expect(res.body.exitCode).toBe(1)
      expect(res.body.stderr).toBeTruthy()
    }, COMPILE_TIMEOUT)

    it('passes stdin to program', async () => {
      const s = await createSnippet('c', [{
        name: 'main.c',
        content: '#include <stdio.h>\nint main(){ char s[64]; scanf("%s",s); printf("%s",s); return 0; }',
      }])
      const res = await request(app).post(`/api/snippets/${s.id}/run`).send({ stdin: 'world' })
      expect(res.body.stdout.trim()).toBe('world')
    }, COMPILE_TIMEOUT)
  })

  // ---------------------------------------------------------------------------
  // Python
  // ---------------------------------------------------------------------------

  describe('Python', () => {
    it('runs hello world, returns stdout', async () => {
      const s = await createSnippet('python', [{ name: 'main.py', content: 'print("hello")' }])
      const res = await request(app).post(`/api/snippets/${s.id}/run`).send({})
      expect(res.body.exitCode).toBe(0)
      expect(res.body.stdout.trim()).toBe('hello')
    }, COMPILE_TIMEOUT)

    it('returns non-zero exit code on sys.exit', async () => {
      const s = await createSnippet('python', [{ name: 'main.py', content: 'import sys; sys.exit(42)' }])
      const res = await request(app).post(`/api/snippets/${s.id}/run`).send({})
      expect(res.body.exitCode).toBe(42)
    }, COMPILE_TIMEOUT)

    it('returns syntax error with stderr', async () => {
      const s = await createSnippet('python', [{ name: 'main.py', content: 'def broken(' }])
      const res = await request(app).post(`/api/snippets/${s.id}/run`).send({})
      expect(res.body.exitCode).not.toBe(0)
      expect(res.body.stderr).toBeTruthy()
    }, COMPILE_TIMEOUT)

    it('passes stdin to program', async () => {
      const s = await createSnippet('python', [{ name: 'main.py', content: 'print(input())' }])
      const res = await request(app).post(`/api/snippets/${s.id}/run`).send({ stdin: 'world' })
      expect(res.body.stdout.trim()).toBe('world')
    }, COMPILE_TIMEOUT)
  })

  // ---------------------------------------------------------------------------
  // Error handling
  // ---------------------------------------------------------------------------

  describe('error handling', () => {
    it('returns 404 for nonexistent snippet', async () => {
      const res = await request(app)
        .post('/api/snippets/00000000-0000-0000-0000-000000000000/run')
        .send({})
      expect(res.status).toBe(404)
    })

    it('returns 400 for invalid id format', async () => {
      const res = await request(app).post('/api/snippets/bad.id/run').send({})
      expect(res.status).toBe(400)
    })
  })
})
