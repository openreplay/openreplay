# AGENTS – openreplay (upstream source)

Use this alongside `~/Documents/GITHUB/agents.md`. This repo is used to build self-hosted OpenReplay images consumed by `ai-hub-infra`.

Codex 0.65 usage
----------------
- Host CLI is `codex-cli 0.65.0` (≥0.64). Verify with `codex --version`; Codex auto-captures repo/cwd—no need to restate.
- After any change, run `/review` and list high-severity findings first; keep the review thread open so history persists.
- Default env injections live in `~/.codex/config.toml` (`POSTGRES_PORT=55433`, `PGBOUNCER_PORT=65433`, `REDIS_PORT=6382`, `WP_PORT=8080`, `WP_DB_PORT=3312`, `MATOMO_PORT=8088`, `GCS_PORT=4443`, `GROWTHBOOK_UI_PORT=8092`, `GROWTHBOOK_API_PORT=8093`). Adjust there instead of hard-coding.

Non-negotiables
---------------
- Start clean (`git status`, `git pull --ff-only` when possible); note if detached or no remote.
- Keep secrets/tokens out of git. Publishing to registries requires PATs—store them outside the repo.
- Build outputs feed `ai-hub-infra/docker-compose.openreplay.yml`; if you retag images, update that compose file and keep port 8091 reserved on the host.
- Coordinate with infra when changing Dockerfiles/build scripts so downstream compose stacks stay in sync.
- GitHub Action: `.github/workflows/codex-pr-review.yml` posts Codex reviews on PRs; set repo/org secret `OPENAI_API_KEY`.
