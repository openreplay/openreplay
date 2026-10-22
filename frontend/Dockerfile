from node:24-slim AS builder
COPY --from=oven/bun:1.4.3@sha256:ec06c3b6cea04192ae6770c434f668ca41d343ad19fa6472216c7b48be39c598 /usr/local/bin/bun /usr/local/bin/bun
workdir /work/frontend
# Build context is the repo root (built with `-f frontend/Dockerfile`) so that the
# sibling player/ package is available — frontend depends on it via `file:../player`.
COPY player /work/player
COPY frontend /work/frontend
# player is its own project: install its deps so its source imports (fflate, fzstd, …) resolve when frontend bundles it.
RUN cd /work/player && bun install --frozen-lockfile
RUN cp .env.sample .env
ARG NODE_OPTIONS="--max-old-space-size=10240"
ENV NODE_OPTIONS=$NODE_OPTIONS
RUN bun install --frozen-lockfile
RUN bun run build

FROM nginx:alpine as cicd
LABEL maintainer=Rajesh<rajesh@openreplay.com>
COPY frontend/public /var/www/openreplay
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf


# Default step in docker build
FROM cgr.dev/chainguard/nginx
LABEL maintainer=Rajesh<rajesh@openreplay.com>
ARG GIT_SHA
LABEL GIT_SHA=$GIT_SHA
COPY --from=builder /work/frontend/public /var/www/openreplay
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf

ENV GIT_SHA=$GIT_SHA

EXPOSE 8080
