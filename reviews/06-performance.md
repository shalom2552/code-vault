# Performance Review: CodeVault

## Summary
The application is a functional prototype with a clean UI, but it exhibits several performance anti-patterns that will lead to noticeable degradation as the number of snippets or the size of individual files grows. The primary concerns are the lack of frontend code splitting, inefficient backend data retrieval (N file reads), and excessive React re-renders due to missing memoization and synchronous I/O on the main thread (localStorage).

## Bottlenecks (measurably slow, user-noticeable)
- **Frontend Bundle Size**: All views and heavy dependencies (`@uiw/react-codemirror`, `highlight.js`) are bundled into a single entry point. This increases initial load time and Time to Interactive (TTI), especially on slower networks.
- **Backend Snippet Listing**: `GET /api/snippets` performs an `fs.readFile` for every snippet folder to get `meta.json`. As the library grows to hundreds or thousands of snippets, this endpoint will become significantly slower and I/O bound.
- **Playground Keystroke Lag**: `Playground.jsx` writes to `localStorage` on every single `onChange` event from CodeMirror. `localStorage` is a synchronous, blocking API. On low-end devices or with large scratchpad content, this will cause perceptible typing lag.

## Wasteful Operations (not slow yet but doing unnecessary work)
- **Redundant Network Fetches**: `ListView.jsx` fetches the entire snippet list every time the component mounts (e.g., when switching back from Detail or Playground tabs). There is no client-side caching or "stale-while-revalidate" strategy.
- **Unnecessary Re-renders in Editor**: In `EditorView.jsx`, the entire form state is held in a single object. Updating a single character in a file or the title triggers a full re-render of the `EditorView` and all child `CodeEditor` components.
- **Missing Memoization in List**: In `ListView.jsx`, `allTags` and the `filtered` list are recalculated on every render using `flatMap`, `Set`, and `filter` operations. These should be wrapped in `useMemo`.
- **Search Filtering**: Search is performed by filtering the entire `snippets` array on every render. While acceptable for small lists, it lacks debouncing, meaning the filter logic runs many times during a single word entry.

## Optimization Opportunities (ordered by impact/effort ratio)
1. **Memoize Heavy Components (High Impact / Low Effort)**:
   - Wrap `CodeEditor` and `CodeBlock` in `React.memo`.
   - Use `useMemo` for tag calculation and filtering in `ListView`.
2. **Debounce LocalStorage Writes (High Impact / Low Effort)**:
   - In `Playground.jsx`, use a debounce timer (e.g., 500ms) before writing the scratchpad content to `localStorage`.
3. **Route/View Code Splitting (High Impact / Medium Effort)**:
   - Use `React.lazy` and `Suspense` in `App.jsx` to load `EditorView`, `Playground`, and `DetailView` only when needed. This will significantly shrink the initial bundle.
4. **Client-side Search Debouncing (Medium Impact / Low Effort)**:
   - Debounce the `search` state update in `ListView.jsx` so that filtering only occurs after the user stops typing.
5. **Implement Metadata Indexing/Caching (High Impact / High Effort)**:
   - The backend should maintain a single `index.json` or an in-memory cache of snippet metadata to avoid reading N files on every list request.
6. **Stale-While-Revalidate Caching (Medium Impact / Medium Effort)**:
   - Use a library like `TanStack Query` (React Query) or implement a simple global state cache for snippets to avoid redundant `GET /api/snippets` calls.

## Measurements to Take (specific things to benchmark before/after)
- **Bundle Analysis**: Run `npm run build` and check the size of the generated assets. Use `rollup-plugin-visualizer` to see the impact of `codemirror` and `highlight.js`.
- **TTI (Time to Interactive)**: Measure TTI using Lighthouse or Chrome DevTools Performance tab on a "Fast 3G" throttling profile.
- **Main Thread Blocking**: Record a Performance profile while typing rapidly in the Playground to see the duration of "Task" blocks caused by `localStorage` writes.
- **API Latency**: Use a script to generate 500 dummy snippets and measure the response time of `GET /api/snippets`.
- **Render Counts**: Use React Developer Tools "Profiler" to count re-renders of `CodeEditor` when typing in the snippet title field.
