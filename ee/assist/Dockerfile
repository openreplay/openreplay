ARG ARCH=amd64

FROM --platform=linux/$ARCH ubuntu:24.04
LABEL Maintainer="Zavorotynskiy Alexander <zavorotynskiy@pm.me>"
RUN apt-get update && \
    apt-get install -y --no-install-recommends ca-certificates curl gnupg && \
    mkdir -p /etc/apt/keyrings && \
    curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key | gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg && \
    echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_25.x nodistro main" > /etc/apt/sources.list.d/nodesource.list && \
    apt-get update && \
    apt-get install -y --no-install-recommends nodejs tini git && \
    rm -rf /var/lib/apt/lists/*
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