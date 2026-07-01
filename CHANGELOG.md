# Changelog

All notable changes to `mailingcore-js` are documented here.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [0.2.0] - 2026-06-18

### Added

- `MailingCore.init()` — configure API key, base URL and timeout
- `MailingCore.send()` — send transactional emails (HTML body, tags, idempotency)
- `MailingCore.sendTemplate()` — send using published templates by slug with `{{var}}` interpolation
- `MailingCore.getLogs()` — paginated email send logs
- `MailingCoreError` — typed error with HTTP status and RFC 7807 fields
- Browser-safe build (ESM + CJS), zero runtime dependencies

[0.2.0]: https://github.com/ariferndz/mailingcore-sdk/releases/tag/sdk-v0.2.0
