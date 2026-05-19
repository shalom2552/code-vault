# UX & Accessibility Review: CodeVault

## Summary
The CodeVault application provides a functional and aesthetically pleasing experience for managing code snippets. However, it currently suffers from several accessibility and UX shortcomings that hinder its usability for power users, keyboard-only users, and those relying on assistive technologies. The mobile-first design is effective for touch but leaves gaps in desktop and keyboard interactions.

## Critical UX Issues
1.  **Hidden Functionality (Context Menus):** Core actions like "Edit" and "Delete" in the `ListView` are hidden behind a long-press gesture (`onPointerDown` + `setTimeout`). There is no visible indicator that these actions exist, and they are completely inaccessible to keyboard and screen reader users.
2.  **Blocking Modals (`alert`/`confirm`):** The application uses native `alert()` and `confirm()` for critical flows (e.g., "Title required" in `EditorView`, "Reset to blank template" in `Playground`). These are disruptive and inconsistent with the custom `ConfirmDialog` used elsewhere.
3.  **Missing Navigation Labels:** The bottom navigation icons (`SnippetsIcon`, `PlayIcon`) lack `aria-label` or `title` attributes, making them difficult to distinguish for screen readers.
4.  **Error Handling & Validation:** Form validation is minimal (title only) and uses `alert()`. There is no visual feedback for empty states in individual fields or specific error messages near the inputs.

## Accessibility Violations
1.  **Non-Semantic HTML:** Many interactive elements use `div` or `span` with `onClick` instead of `<button>` or `<a>` (e.g., `snippet-card`, `ctx-overlay`). This prevents them from being focusable or announced correctly.
2.  **Keyboard Traps & Focus Management:**
    *   The `ConfirmDialog` and `ctx-menu` do not trap focus or return focus to the trigger element when closed.
    *   The `ListView` long-press menu cannot be triggered via keyboard.
    *   Focus order in `EditorView` is logical but lacks visual focus indicators for many custom-styled elements.
3.  **Color Contrast:** The `card-tag` color (`var(--accent)` at 0.7 opacity on `var(--surface)`) may not meet WCAG AA standards (4.5:1) for small text.
4.  **Missing Alt/ARIA:** SVG icons in buttons and the "plus" icon in the FAB lack descriptive text or `aria-hidden` where appropriate.

## Flow Improvements
1.  **Multi-file Navigation:** In `EditorView`, adding multiple files creates a long vertical scroll. A tabbed interface (similar to `DetailView`) or a sidebar file list would improve navigation within a single snippet.
2.  **Search Discoverability:** The search input in `ListView` is prominent, but "No matches" empty state provides no "Clear Search" action, forcing manual text deletion.
3.  **Playground "Save" Logic:** The "Save" button in Playground is disabled until the code changes from the default template. This might be confusing for users who *want* to save the template as a starting point.
4.  **Immediate Feedback:** When "Run" is clicked, the `loading` state is minimal (just a `…` on the button). A more prominent skeleton or spinner for the output area would improve perceived performance.

## Polish
1.  **Interactive Feedback:** Add hover states for `snippet-card` and `tag-chip` on desktop to improve discoverability.
2.  **Empty States:** Enhance the "No snippets yet" state with a call-to-action button or a helpful illustration.
3.  **Transitions:** Implement smooth transitions for view changes (e.g., sliding between List and Detail) to reinforce the spatial model.
4.  **Optimistic UI:** When deleting a snippet from the `ListView`, the card could be hidden immediately before the API call finishes to make the app feel faster.
5.  **Touch Targets:** Increase the hit area for the `remove-file-btn` in `EditorView` and `back-btn` in `nav-header` to meet the 44x44px recommendation.
