import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import request from 'supertest'
import fs from 'fs/promises'
import path from 'path'
import { randomUUID } from 'crypto'
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

  // ---------------------------------------------------------------------------
  // Executor behavior (P3 responded guard, P10 process-group kill, P13 path
  // sanitization, P14 stdin cap)
  // ---------------------------------------------------------------------------

  describe('executor behavior', () => {
    const EXECUTOR_TIMEOUT = 25000

    it('timeout returns exitCode 124 and Timeout message in stderr', async () => {
      const s = await createSnippet('cpp', [{
        name: 'main.cpp',
        content: 'int main(){ for(;;){} }',
      }])
      const res = await request(app).post(`/api/snippets/${s.id}/run`).send({})
      expect(res.body.exitCode).toBe(124)
      expect(res.body.stderr).toContain('Timeout')
    }, EXECUTOR_TIMEOUT)

    // After a timeout the responded guard (done flag) prevents a second res.json().
    // If the guard were missing, Express 5 would throw on the duplicate send.
    // Verifying a follow-up request succeeds is the observable proxy for "no crash".
    it('server remains responsive after a timeout (responded guard prevents double-send)', async () => {
      const s = await createSnippet('cpp', [{
        name: 'main.cpp',
        content: 'int main(){ for(;;){} }',
      }])
      await request(app).post(`/api/snippets/${s.id}/run`).send({})
      const health = await request(app).get('/api/snippets')
      expect(health.status).toBe(200)
    }, EXECUTOR_TIMEOUT)

    // P10: detached process group + SIGKILL to -pgid kills forked grandchildren.
    // Without group kill, the forked child would survive past the parent's timeout.
    it('process-group kill on timeout eliminates forked grandchild processes', async () => {
      const pidFile = `/tmp/cppvault-pgkill-${randomUUID()}`
      const s = await createSnippet('c', [{
        name: 'main.c',
        content: `
#include <stdio.h>
#include <unistd.h>

int main() {
    pid_t child = fork();
    if (child == 0) {
        FILE *f = fopen("${pidFile}", "w");
        if (f) { fprintf(f, "%d", (int)getpid()); fclose(f); }
        for(;;) {}
    } else {
        for(;;) {}
    }
    return 0;
}
`,
      }])

      const res = await request(app).post(`/api/snippets/${s.id}/run`).send({})
      expect(res.body.exitCode).toBe(124)

      const pidStr = await fs.readFile(pidFile, 'utf-8').catch(() => null)
      await fs.unlink(pidFile).catch(() => {})

      if (pidStr) {
        const pid = parseInt(pidStr, 10)
        // Check /proc/<pid>/status — if the process is running ('R') or sleeping ('S'),
        // the group kill failed and the grandchild is still consuming resources.
        // Zombie ('Z') is acceptable: process is dead but not yet reaped by init.
        const status = await fs.readFile(`/proc/${pid}/status`, 'utf-8').catch(() => null)
        if (status) {
          const stateMatch = status.match(/^State:\s+(\w)/m)
          const state = stateMatch?.[1]
          // Z = zombie (dead, awaiting reap) — not a live process
          expect(state).toBe('Z')
        }
        // If /proc/<pid>/status is missing, the process no longer exists — group kill worked
      }
      // If pidFile was never written, the child never started — group kill is vacuously satisfied
    }, EXECUTOR_TIMEOUT)

    // P13: compiler error output must not expose the snippet's directory path
    it('compile error stderr does not expose snippet directory path', async () => {
      const s = await createSnippet('cpp', [{
        name: 'main.cpp',
        content: 'NOT VALID C++',
      }])
      const res = await request(app).post(`/api/snippets/${s.id}/run`).send({})
      expect(res.body.exitCode).toBe(1)
      expect(res.body.stderr).not.toContain(dataDir)
      expect(res.body.stderr).not.toMatch(/\/app\/data\//)
      expect(res.body.stderr).toBeTruthy()
    }, COMPILE_TIMEOUT)

    // P14: executor caps stdin at MAX_STDIN_BYTES (64 KB) before writing to child.stdin
    it('stdin is capped at 64 KB — excess bytes are silently discarded', async () => {
      const s = await createSnippet('cpp', [{
        name: 'main.cpp',
        content: `
#include <iostream>
#include <iterator>
#include <vector>
using namespace std;
int main() {
    vector<char> v(istreambuf_iterator<char>(cin), istreambuf_iterator<char>{});
    cout << v.size();
    return 0;
}
`,
      }])
      const bigStdin = 'x'.repeat(70 * 1024)
      const res = await request(app).post(`/api/snippets/${s.id}/run`).send({ stdin: bigStdin })
      expect(res.body.exitCode).toBe(0)
      expect(parseInt(res.body.stdout.trim(), 10)).toBe(64 * 1024)
    }, COMPILE_TIMEOUT)
  })
})
