from node:14-stretch-slim AS builder
workdir /work
COPY . .
RUN cp .env.example .env
RUN yarn 
RUN yarn build

FROM nginx:alpine
LABEL maintainer=Rajesh<rajesh@openreplay.com>

COPY --from=builder /work/public /var/www/openreplay
COPY nginx.conf /etc/nginx/conf.d/default.conf

FROM nginx:alpine as cicd
LABEL maintainer=Rajesh<rajesh@openreplay.com>

COPY public /var/www/openreplay
COPY nginx.conf /etc/nginx/conf.d/default.conf

