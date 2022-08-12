from node:14-stretch-slim AS builder
workdir /work
COPY . .
RUN cp .env.sample .env
RUN yarn 
RUN yarn build

FROM nginx:alpine as cicd
LABEL maintainer=Rajesh<rajesh@openreplay.com>
COPY public /var/www/openreplay
COPY nginx.conf /etc/nginx/conf.d/default.conf


# Default step in docker build
FROM nginx:alpine
LABEL maintainer=Rajesh<rajesh@openreplay.com>
COPY --from=builder /work/public /var/www/openreplay
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 8080
RUN chown -R nginx:nginx /var/cache/nginx && \
    chown -R nginx:nginx /var/log/nginx && \
    chown -R nginx:nginx /etc/nginx/conf.d && \
    touch /var/run/nginx.pid && \
    chown -R nginx:nginx /var/run/nginx.pid

USER nginx
