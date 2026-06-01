# Platform Agent Rules

## Git Operations

- **NEVER** run `git commit` or `git push` unless the user explicitly asks you to do so.
- You may stage files (`git add`) as part of preparing changes, but do not finalize commits autonomously.
- Always wait for the user's explicit instruction before committing or pushing.

## Desktop ↔ Web Feature Parity

This monorepo contains two React frontends that share identical UI and behaviour for most features:

- **Desktop** (`desktop/`) — Tauri app (macOS, Windows). Has full local code compilation via Rust/subprocess.
- **Web** (`frontend/`) — Browser-based React app hosted on Vercel. Cannot run compilers locally.

### The Core Rule

> **If you change a shared UI component or feature in one client, you must apply the same change to the other client in the same working session.**

### What Is Platform-Specific (Do NOT cross-port)

| Feature | Desktop only? | Web fallback |
|---|---|---|
| `Run` code button | ✅ Desktop only | Show `<DownloadPromptModal>` |
| `Submit` code button (compile + evaluate) | ✅ Desktop only | Show `<DownloadPromptModal>` |
| Native subprocess execution | ✅ Desktop only | N/A |
| `/download` page | ✅ Web only | N/A (desktop has the app already) |
| `DownloadPromptModal` | ✅ Web only | N/A |

### What Must Stay in Sync (Cross-port these)

- Problem list layout, filters, search, infinite scroll
- Problem detail page — description, hints, editorial tabs
- Submissions tab — accordion, read-only Monaco editor, test result display
- Problem status badges (Solved / Attempted / Todo)
- Dashboard statistics — solved count, streak, difficulty progress bars
- Sidebar navigation items and structure
- Bookmarks feature
- Auth (login, registration, JWT token handling)
- Theme toggling (dark/light)
- All shared UI components and design tokens

### Desktop is Source of Truth

When making a new shared feature:
1. Implement it in the **desktop** first (it has the most capability).
2. Then port it to the **web** — excluding any compiler-dependent parts.
3. Replace compiler-dependent interactions with the `DownloadPromptModal` on web.

### File Mapping Reference

| Desktop | Web |
|---|---|
| `desktop/src/pages/Dashboard.tsx` | `frontend/src/pages/Dashboard.tsx` |
| `desktop/src/pages/ProblemList.tsx` | `frontend/src/pages/ProblemList.tsx` |
| `desktop/src/pages/ProblemDetail.tsx` | `frontend/src/pages/ProblemDetail.tsx` |
| `desktop/src/components/problems/ProblemTable.tsx` | `frontend/src/components/problems/ProblemTable.tsx` |
| `desktop/src/components/problems/ProblemCardList.tsx` | `frontend/src/components/problems/ProblemCardList.tsx` |
| `desktop/src/components/problems/ProblemDescriptionPanel.tsx` | `frontend/src/components/problems/ProblemDescriptionPanel.tsx` |
| `desktop/src/components/problems/CodeEditorPanel.tsx` | `frontend/src/components/problems/CodeEditorPanel.tsx` |
| `desktop/src/components/problems/WorkspaceHeader.tsx` | `frontend/src/components/problems/WorkspaceHeader.tsx` |
| `desktop/src/components/Sidebar.tsx` | `frontend/src/components/Sidebar.tsx` |
| `desktop/src/components/Layout.tsx` | `frontend/src/components/Layout.tsx` |
| `desktop/src/lib/api.ts` | `frontend/src/lib/api.ts` |
