Requirement:

```go install github.com/cosmtrek/air@latest```

Environment variables are read from `backend/.env` (git-ignored). Start from the template:

```cp .dev/.env.dev .env```

To run a service in dev mode with hot-code-reload:

```.dev/run-dev.sh api```    # cmd/api
```.dev/run-dev.sh tasks```  # cmd/tasks (crons; set CRON_SCHEDULES / SITE_URL in .env)

Equivalent to `air -c .dev/.air-api.toml` / `air -c .dev/.air-tasks.toml`.
