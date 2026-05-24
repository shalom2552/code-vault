import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import request from 'supertest'
import fs from 'fs/promises'
import { makeApp } from '../helpers/make-app.js'
import { makeTmpDir, removeTmpDir } from '../helpers/tmp.js'

const COMPILE_TIMEOUT = 30000

describe('playground /run', () => {
  let app, dataDir

  beforeAll(async () => {
    dataDir = await makeTmpDir()
    app = makeApp(dataDir)
  })

  afterAll(async () => {
    await removeTmpDir(dataDir)
  })

  // ---------------------------------------------------------------------------
  // C++
  // ---------------------------------------------------------------------------

  describe('C++', () => {
    it('runs code and returns stdout', async () => {
      const res = await request(app)
        .post('/api/playground/run')
        .send({ code: 'int main(){ cout << "hello"; return 0; }', language: 'cpp' })
      expect(res.body.exitCode).toBe(0)
      expect(res.body.stdout.trim()).toBe('hello')
    }, COMPILE_TIMEOUT)

    it('pre-includes iostream (cout works without include)', async () => {
      const res = await request(app)
        .post('/api/playground/run')
        .send({ code: 'int main(){ cout << 99; return 0; }', language: 'cpp' })
      expect(res.body.exitCode).toBe(0)
      expect(res.body.stdout.trim()).toBe('99')
    }, COMPILE_TIMEOUT)

    it('pre-includes vector', async () => {
      const res = await request(app)
        .post('/api/playground/run')
        .send({ code: 'int main(){ vector<int> v={1,2,3}; cout << v.size(); return 0; }', language: 'cpp' })
      expect(res.body.exitCode).toBe(0)
      expect(res.body.stdout.trim()).toBe('3')
    }, COMPILE_TIMEOUT)

    it('pre-includes map', async () => {
      const res = await request(app)
        .post('/api/playground/run')
        .send({ code: 'int main(){ map<string,int> m; m["x"]=1; cout << m["x"]; return 0; }', language: 'cpp' })
      expect(res.body.exitCode).toBe(0)
      expect(res.body.stdout.trim()).toBe('1')
    }, COMPILE_TIMEOUT)

    it('passes stdin to program', async () => {
      const res = await request(app)
        .post('/api/playground/run')
        .send({ code: 'int main(){ string s; cin >> s; cout << s; return 0; }', stdin: 'input', language: 'cpp' })
      expect(res.body.stdout.trim()).toBe('input')
    }, COMPILE_TIMEOUT)

    it('returns compile error with exitCode 1 and stderr', async () => {
      const res = await request(app)
        .post('/api/playground/run')
        .send({ code: 'this is not cpp', language: 'cpp' })
      expect(res.body.exitCode).toBe(1)
      expect(res.body.stderr).toBeTruthy()
    }, COMPILE_TIMEOUT)

    it('compile error does not expose /tmp/playground-* path', async () => {
      const res = await request(app)
        .post('/api/playground/run')
        .send({ code: 'INVALID', language: 'cpp' })
      expect(res.body.stderr).not.toMatch(/\/tmp\/playground-/)
    }, COMPILE_TIMEOUT)

    it('compile error uses friendly filename in stderr', async () => {
      const res = await request(app)
        .post('/api/playground/run')
        .send({ code: 'INVALID', language: 'cpp' })
      expect(res.body.stderr).toContain('main.cpp')
    }, COMPILE_TIMEOUT)

    it('defaults to cpp when language is omitted', async () => {
      const res = await request(app)
        .post('/api/playground/run')
        .send({ code: 'int main(){ cout << "ok"; return 0; }' })
      expect(res.body.exitCode).toBe(0)
      expect(res.body.stdout).toContain('ok')
    }, COMPILE_TIMEOUT)

    it('cleans up temp directory after successful run', async () => {
      const before = (await fs.readdir('/tmp')).filter(f => f.startsWith('playground-'))
      await request(app)
        .post('/api/playground/run')
        .send({ code: 'int main(){ return 0; }', language: 'cpp' })
      const after = (await fs.readdir('/tmp')).filter(f => f.startsWith('playground-'))
      expect(after.length).toBe(before.length)
    }, COMPILE_TIMEOUT)

    it('cleans up temp directory after compile error', async () => {
      const before = (await fs.readdir('/tmp')).filter(f => f.startsWith('playground-'))
      await request(app)
        .post('/api/playground/run')
        .send({ code: 'INVALID', language: 'cpp' })
      const after = (await fs.readdir('/tmp')).filter(f => f.startsWith('playground-'))
      expect(after.length).toBe(before.length)
    }, COMPILE_TIMEOUT)
  })

  // ---------------------------------------------------------------------------
  // Python
  // ---------------------------------------------------------------------------

  describe('Python', () => {
    it('runs code and returns stdout', async () => {
      const res = await request(app)
        .post('/api/playground/run')
        .send({ code: 'print("hello")', language: 'python' })
      expect(res.body.exitCode).toBe(0)
      expect(res.body.stdout.trim()).toBe('hello')
    }, COMPILE_TIMEOUT)

    it('passes stdin to program', async () => {
      const res = await request(app)
        .post('/api/playground/run')
        .send({ code: 'print(input())', stdin: 'world', language: 'python' })
      expect(res.body.stdout.trim()).toBe('world')
    }, COMPILE_TIMEOUT)

    it('returns syntax error with non-zero exit', async () => {
      const res = await request(app)
        .post('/api/playground/run')
        .send({ code: 'def broken(', language: 'python' })
      expect(res.body.exitCode).not.toBe(0)
      expect(res.body.stderr).toBeTruthy()
    }, COMPILE_TIMEOUT)

    it('cleans up temp directory after run', async () => {
      const before = (await fs.readdir('/tmp')).filter(f => f.startsWith('playground-'))
      await request(app).post('/api/playground/run').send({ code: 'print(1)', language: 'python' })
      const after = (await fs.readdir('/tmp')).filter(f => f.startsWith('playground-'))
      expect(after.length).toBe(before.length)
    }, COMPILE_TIMEOUT)
  })

  // ---------------------------------------------------------------------------
  // C
  // ---------------------------------------------------------------------------

  describe('C', () => {
    it('runs code and returns stdout', async () => {
      const res = await request(app)
        .post('/api/playground/run')
        .send({ code: 'int main(){ printf("hello"); return 0; }', language: 'c' })
      expect(res.body.exitCode).toBe(0)
      expect(res.body.stdout.trim()).toBe('hello')
    }, COMPILE_TIMEOUT)

    it('pre-includes stdio.h (printf works without include)', async () => {
      const res = await request(app)
        .post('/api/playground/run')
        .send({ code: 'int main(){ printf("%d", 7); return 0; }', language: 'c' })
      expect(res.body.exitCode).toBe(0)
      expect(res.body.stdout.trim()).toBe('7')
    }, COMPILE_TIMEOUT)

    it('pre-includes stdlib.h', async () => {
      const res = await request(app)
        .post('/api/playground/run')
        .send({ code: 'int main(){ printf("%d", abs(-5)); return 0; }', language: 'c' })
      expect(res.body.exitCode).toBe(0)
      expect(res.body.stdout.trim()).toBe('5')
    }, COMPILE_TIMEOUT)

    it('passes stdin to program', async () => {
      const res = await request(app)
        .post('/api/playground/run')
        .send({ code: 'int main(){ char s[64]; scanf("%s",s); printf("%s",s); return 0; }', stdin: 'world', language: 'c' })
      expect(res.body.stdout.trim()).toBe('world')
    }, COMPILE_TIMEOUT)

    it('returns compile error with exitCode 1', async () => {
      const res = await request(app)
        .post('/api/playground/run')
        .send({ code: 'this is not c', language: 'c' })
      expect(res.body.exitCode).toBe(1)
      expect(res.body.stderr).toBeTruthy()
    }, COMPILE_TIMEOUT)

    it('compile error does not expose /tmp/playground-* path', async () => {
      const res = await request(app)
        .post('/api/playground/run')
        .send({ code: 'INVALID', language: 'c' })
      expect(res.body.stderr).not.toMatch(/\/tmp\/playground-/)
    }, COMPILE_TIMEOUT)

    it('compile error uses friendly filename in stderr', async () => {
      const res = await request(app)
        .post('/api/playground/run')
        .send({ code: 'INVALID', language: 'c' })
      expect(res.body.stderr).toContain('main.c')
    }, COMPILE_TIMEOUT)

    it('cleans up temp directory after run', async () => {
      const before = (await fs.readdir('/tmp')).filter(f => f.startsWith('playground-'))
      await request(app)
        .post('/api/playground/run')
        .send({ code: 'int main(){ return 0; }', language: 'c' })
      const after = (await fs.readdir('/tmp')).filter(f => f.startsWith('playground-'))
      expect(after.length).toBe(before.length)
    }, COMPILE_TIMEOUT)
  })

  // ---------------------------------------------------------------------------
  // Executor behavior (P3 responded guard, P14 stdin cap)
  // ---------------------------------------------------------------------------

  describe('executor behavior', () => {
    const EXECUTOR_TIMEOUT = 35000

    it('timeout returns exitCode 124 and Timeout message in stderr', async () => {
      const res = await request(app)
        .post('/api/playground/run')
        .send({ code: 'int main(){ for(;;){} }', language: 'cpp' })
      expect(res.body.exitCode).toBe(124)
      expect(res.body.stderr).toContain('Timeout')
    }, EXECUTOR_TIMEOUT)

    // After a timeout the responded guard (done flag in executor) prevents a second
    // res.json(). A follow-up request succeeding is the observable proxy for "no crash".
    it('server remains responsive after a timeout (responded guard prevents double-send)', async () => {
      await request(app)
        .post('/api/playground/run')
        .send({ code: 'int main(){ for(;;){} }', language: 'cpp' })
      const health = await request(app).get('/api/snippets')
      expect(health.status).toBe(200)
    }, EXECUTOR_TIMEOUT)

    // P14: executor caps stdin at MAX_STDIN_BYTES (64 KB) before writing to child.stdin
    it('stdin is capped at 64 KB — excess bytes are silently discarded', async () => {
      const res = await request(app)
        .post('/api/playground/run')
        .send({
          code: `
#include <iterator>
#include <vector>
int main() {
    vector<char> v(istreambuf_iterator<char>(cin), istreambuf_iterator<char>{});
    cout << v.size();
    return 0;
}
`,
          stdin: 'x'.repeat(70 * 1024),
          language: 'cpp',
        })
      expect(res.body.exitCode).toBe(0)
      expect(parseInt(res.body.stdout.trim(), 10)).toBe(64 * 1024)
    }, COMPILE_TIMEOUT)
  })
})
