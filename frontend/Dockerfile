from node:25-slim AS builder
workdir /work
COPY . .
RUN cp .env.sample .env
ARG NODE_OPTIONS="--max-old-space-size=10240"
ENV NODE_OPTIONS=$NODE_OPTIONS
RUN yarn 
RUN yarn build

FROM nginx:alpine as cicd
LABEL maintainer=Rajesh<rajesh@openreplay.com>
COPY public /var/www/openreplay
COPY nginx.conf /etc/nginx/conf.d/default.conf


# Default step in docker build
FROM cgr.dev/chainguard/nginx
LABEL maintainer=Rajesh<rajesh@openreplay.com>
ARG GIT_SHA
LABEL GIT_SHA=$GIT_SHA
COPY --from=builder /work/public /var/www/openreplay
COPY nginx.conf /etc/nginx/conf.d/default.conf

ENV GIT_SHA=$GIT_SHA

EXPOSE 8080
