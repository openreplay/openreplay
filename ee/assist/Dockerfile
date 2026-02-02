ARG ARCH=amd64

FROM --platform=linux/$ARCH node:25-bookworm-slim AS node
FROM --platform=linux/$ARCH ubuntu:24.04
LABEL Maintainer="Zavorotynskiy Alexander <zavorotynskiy@pm.me>"
COPY --from=node /usr/local/bin/node /usr/local/bin/
COPY --from=node /usr/local/lib/node_modules /usr/local/lib/node_modules
RUN apt-get update && apt-get install -y --no-install-recommends tini git libatomic1 && rm -rf /var/lib/apt/lists/* && \
    ln -s /usr/local/lib/node_modules/npm/bin/npm-cli.js /usr/local/bin/npm && \
    ln -s /usr/local/lib/node_modules/npm/bin/npx-cli.js /usr/local/bin/npx && \
    cd /usr/local/lib/node_modules/npm && npm update tar
ARG envarg
ENV ENTERPRISE_BUILD=${envarg} \
  MAXMINDDB_FILE=/home/openreplay/geoip.mmdb \
  PRIVATE_ENDPOINTS=false \
  LISTEN_PORT=9001 \
  ERROR=1 \
  NODE_ENV=production
WORKDIR /work
COPY package.json .
COPY package-lock.json .
RUN npm install
COPY . .

RUN useradd -u 1001 -m openreplay
USER 1001
ADD --chown=1001 https://static.openreplay.com/geoip/GeoLite2-City.mmdb  $MAXMINDDB_FILE

ENTRYPOINT ["/usr/bin/tini", "--"]
CMD npm start
