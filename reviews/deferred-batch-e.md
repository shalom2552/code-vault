# Deferred — Batch E

Bugs found while writing tests. Not fixed (Batch E only owns tests/).

---

## BUG-1: `.toMatch()` on array return value in server-languages tests

**File:** `tests/unit/server-languages.test.js:26` and `:60`

```js
// line 26
expect(lang.compile(['a.cpp'], '/out')).toMatch(/^g\+\+/)
// line 60
expect(lang.compile(['a.c'], '/out')).toMatch(/^gcc/)
```

`compile()` was changed in Batch A to return `string[]` (argv array), e.g.
`['g++', 'a.cpp', '-o', '/out']`. Vitest's `.toMatch()` expects a string received
value. If vitest is strict, both tests throw at runtime rather than asserting.
If vitest coerces via `Array.prototype.toString()` (giving `"g++,a.cpp,-o,/out"`),
the regex still matches — tests pass but are testing implicit string coercion, not
the actual array interface.

**Fix:** Replace with array-aware assertions:
```js
expect(lang.compile(['a.cpp'], '/out')[0]).toBe('g++')
expect(lang.compile(['a.c'],  '/out')[0]).toBe('gcc')
```

---

## BUG-2: process-group kill test is vacuous if grandchild never writes pidFile

**File:** `tests/integration/snippets-run.test.js` (process-group kill test)

If the forked child process is reaped as a zombie before the test checks `/proc/<pid>/status`,
the test reads `null` for status and skips the assertion. With a very slow disk, the
child might also not have written the pidFile before timeout. In both cases the test
passes without actually verifying group kill behavior.

**Mitigation:** The test asserts `state === 'Z'` (zombie) or no `/proc` entry — both
indicate the process is dead, which is the correct outcome. Running instances ('R'/'S')
would fail the test. The window where a zombie exists before init reaps it is typically
<100ms. No fix needed unless flakiness is observed in CI.
