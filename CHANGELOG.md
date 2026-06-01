# Changelog

All notable changes to the **ShahLMS** project will be documented in this file.

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
