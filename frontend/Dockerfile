from node:14-stretch-slim AS builder
workdir /work
COPY . .
RUN yarn 
RUN yarn build

FROM nginx:alpine
LABEL maintainer=Rajesh<rajesh@openreplay.com>

COPY --from=builder /work/public /var/www/openreplay
COPY nginx.conf /etc/nginx/conf.d/default.conf
