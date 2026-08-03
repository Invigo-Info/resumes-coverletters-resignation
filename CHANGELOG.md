# Changelog

All notable changes to this project are documented here. Product/feature history
also lives in `CLAUDE.md`.

## [Unreleased]

### Changed

- Begin architecture restructure onto a purpose-grouped layout (see
  `docs/architecture.md`). Phase 0: add root scaffolding (`database/`, `tests/`,
  `docs/*`, `SECURITY.md`, `CHANGELOG.md`) with no code or behaviour changes.
  Subsequent phases move library code into `services/`, `validation/`,
  `permissions/`, `config/`, `utilities/`, `constants/`, wrap routes in URL-safe
  route groups, and extract `features/*` - each verified with `tsc` and a build.
