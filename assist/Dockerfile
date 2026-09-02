FROM node:25-alpine
LABEL Maintainer="Zavorotynskiy Alexander <zavorotynskiy@pm.me>"
RUN apk add --no-cache tini

ARG envarg
ARG GIT_SHA
LABEL GIT_SHA=$GIT_SHA
ENV ENTERPRISE_BUILD=${envarg} \
  GIT_SHA=${GIT_SHA} \
  MAXMINDDB_FILE=/home/openreplay/geoip.mmdb \
  PRIVATE_ENDPOINTS=false \
  LISTEN_PORT=9001 \
  NODE_ENV=production
WORKDIR /work
COPY package.json .
COPY package-lock.json .
RUN npm install
COPY . .

RUN adduser -u 1001 openreplay -D
USER 1001
ADD --chown=1001 https://static.openreplay.com/geoip/dbip-city-lite.mmdb  $MAXMINDDB_FILE

ENTRYPOINT ["/sbin/tini", "--"]
CMD npm start
