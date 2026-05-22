# Language Additions

## Added languages

| Language | Runtime | Version (Alpine 3.23) | Type |
|---|---|---|---|
| JavaScript | node | 24.15.0 (pre-installed) | interpreted |
| TypeScript | tsx | 4.22.3 (npm global) | interpreted |
| Go | go | 1.25.10 | compiled |
| Rust | rustc | 1.91.1 | compiled |
| Java | javac + java | OpenJDK 17.0.19 | compiled |
| Ruby | ruby | 3.4.9 | interpreted |
| PHP | php83 | 8.3.31 | interpreted |

## Files changed

- `server/languages.js` — added 7 language entries; added `import { dirname } from 'path'` for Java runner
- `src/languages.js` — added 7 language entries with labels, defaults, hljsLang
- `src/components/CodeEditor.jsx` — added imports + entries for new CodeMirror language extensions
- `src/components/CodeBlock.jsx` — same as above for viewer
- `Dockerfile` — added `go rust ruby openjdk17-jdk php83` to apk; added `npm install -g tsx`
- `server/routes.js` — added Go, Rust, Java flags to ALLOWED_FLAGS whitelist
- `tests/unit/server-languages.test.js` — replaced `'rust'` with `'fortran'` in fallback test
- `tests/unit/client-languages.test.js` — same
- `tests/integration/snippets-crud.test.js` — same
- `README.md` — updated supported languages list

## CodeMirror packages added

- `@codemirror/lang-javascript` — JS + TS (via `{ typescript: true }` option)
- `@codemirror/lang-go`
- `@codemirror/lang-rust`
- `@codemirror/lang-java`
- `@codemirror/lang-php`
- Ruby uses `@codemirror/legacy-modes/mode/ruby` (already installed)

## Notes / issues

- **PHP binary**: Alpine 3.23 (used by node:24-alpine) ships `php83` not `php82`. Runner uses `php83` explicitly.
- **Java class name**: Java runner uses `java -cp <dir> Main` — requires the public class to be named `Main`. The default file is `Main.java` and playground template uses `public class Main`. Snippets with different class names will fail to run.
- **Go build**: uses file-list compile (`go build -o bin files...`). All files must be in `package main`. Works correctly for single-file and multi-file snippets in the same package.
- **Rust**: only compiles `files[0]` (first source file). Multi-file Rust snippets not supported — matches typical snippet use case.
- **TypeScript**: tsx runs `.ts` files directly without a separate compile step; no `tsconfig.json` required.
- **Tests**: 154/154 pass. Three tests used `'rust'` as the unknown-language sentinel — updated to `'fortran'`.
