FROM oven/bun:1.1.30-slim

WORKDIR /work/frontend

COPY ../pnpm-lock.yaml /work/

COPY . .

RUN cp .env.sample .env

RUN pnpm install -g pnpm

RUN pnpm install --filter . --frozen-lockfile --dir /work/frontend

RUN pnpm build

FROM nginx:alpine AS cicd
LABEL maintainer="Rajesh<rajesh@openreplay.com>"

COPY --from=builder /work/frontend/public /var/www/openreplay

COPY ./nginx.conf /etc/nginx/conf.d/default.conf

FROM nginx:alpine
LABEL maintainer="Rajesh<rajesh@openreplay.com>"
ARG GIT_SHA
LABEL GIT_SHA=$GIT_SHA

COPY --from=builder /var/www/openreplay /var/www/openreplay
COPY ./nginx.conf /etc/nginx/conf.d/default.conf

ENV GIT_SHA=$GIT_SHA

RUN chown -R nginx:nginx /var/cache/nginx && \
    chown -R nginx:nginx /var/log/nginx && \
    chown -R nginx:nginx /etc/nginx/conf.d && \
    touch /var/run/nginx.pid && \
    chown -R nginx:nginx /var/run/nginx.pid

EXPOSE 8080

USER nginx
