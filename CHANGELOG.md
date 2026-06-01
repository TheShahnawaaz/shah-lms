# Changelog

All notable changes to the **ShahLMS** project will be documented in this file.

## [0.1.3] - 2026-06-01

### Added
- Local parallel code submission execution engine evaluating C++, Python, and Java.
- Accordion-style Submission History inspector rendering read-only Monaco Editor and test case diagnostics inline.
- Solved status checkmarks and attempted dots on the problems table and card lists.
- Solved count metrics and daily submission streak analytics on the dashboard.

## [0.1.2] - 2026-06-01

### Added
- Native local compiler detector and execution engine for C++, Python, and Java.
- Time Limit Exceeded (TLE) supervisor thread to terminate infinite loops.
- Workspace and Sidebar integration for a premium Compiler Settings Modal.
- Parallel test case execution for "Run on Sample".

### Fixed
- Fixed stacking context backdrop-blur-md bug on WorkspaceHeader settings.
- Resolved nested button React HTML validation warnings.

## [0.1.1] - 2026-06-01

### Fixed
- Resolved updater capability permission issues preventing update checks.
- Integrated `tauri-plugin-process` to support automatic app relaunching after updates.
- Simplified Tauri app configurations to read versioning dynamically from `package.json`.

## [0.1.0] - 2026-06-01

### Added
- Created the desktop application wrapper using Tauri v2.
- Integrated local loopback Google OAuth flow for desktop users.
- Mounted the background Auto-Updater checker and download notification banner.
- Configured application icons using a custom vector-style logo.
