import { spawn } from 'child_process'

const TIMEOUT_MS = 30_000
const COMPILE_TIMEOUT_MS = 30_000
const MAX_STDIN_BYTES = 64 * 1024

// P2: compile via spawn with argv array — no shell interpolation
export async function compileCode(argv) {
  return new Promise((resolve) => {
    const [cmd, ...args] = argv
    const child = spawn(cmd, args, { stdio: ['ignore', 'ignore', 'pipe'] })
    let stderr = ''
    child.stderr.on('data', d => stderr += d)

    const timer = setTimeout(() => {
      child.kill('SIGKILL')
      resolve({ err: true, stderr: 'Compile timeout (30s)' })
    }, COMPILE_TIMEOUT_MS)

    child.on('error', (e) => {
      clearTimeout(timer)
      resolve({ err: true, stderr: e.message })
    })

    child.on('close', (code) => {
      clearTimeout(timer)
      resolve({ err: code !== 0, stderr })
    })
  })
}

// P2/P27: shared run logic — replaces duplicated spawn+timeout+cleanup in routes.js
// P10: detached process group; SIGKILL on timeout kills all forked grandchildren
// P12: ulimit -v 131072 caps user code at 128 MB virtual memory
// P14: stdin capped at MAX_STDIN_BYTES before piping
export async function runCode({ lang, srcFiles, outBin, stdin, cleanup }) {
  return new Promise((resolve) => {
    const [cmd, ...args] = lang.runner(outBin, srcFiles)

    // Shell wrapper sets memory limit then execs user binary — outBin path is controlled so no injection risk
    const child = spawn(
      'sh',
      ['-c', 'ulimit -v 131072 2>/dev/null; exec "$@"', '--', cmd, ...args],
      { detached: true }
    )

    let stdout = '', runErr = ''
    child.stdout.on('data', d => stdout += d)
    child.stderr.on('data', d => runErr += d)
    child.stdin.on('error', () => {})

    if (stdin) {
      const buf = Buffer.from(stdin)
      child.stdin.write(buf.subarray(0, MAX_STDIN_BYTES))
    }
    child.stdin.end()

    // P3: single done flag prevents double-resolve on timeout vs close race
    let done = false

    const finish = async (result) => {
      if (done) return
      done = true
      await cleanup()
      resolve(result)
    }

    // P10: kill process group on timeout — catches forked grandchildren
    // P17: cleanup (unlink binary / rm tmpDir) runs in timeout handler too
    const timer = setTimeout(() => {
      try { process.kill(-child.pid, 'SIGKILL') } catch {}
      finish({ stdout, stderr: 'Timeout (30s)', exitCode: 124 })
    }, TIMEOUT_MS)

    // P5: error handler for missing binary or exec failure
    child.on('error', (e) => {
      clearTimeout(timer)
      finish({ stdout, stderr: e.message, exitCode: 1 })
    })

    child.on('close', (code) => {
      clearTimeout(timer)
      finish({ stdout, stderr: runErr, exitCode: code })
    })
  })
}
