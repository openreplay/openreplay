#ARCH can be amd64 or arm64
ARG ARCH=amd64

FROM --platform=linux/$ARCH node:20-alpine
LABEL Maintainer="KRAIEM Taha Yassine<tahayk2@gmail.com>"
RUN apk add --no-cache tini

ARG envarg
ENV ENTERPRISE_BUILD=${envarg} \
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
ADD --chown=1001 https://static.openreplay.com/geoip/GeoLite2-City.mmdb  $MAXMINDDB_FILE

ENTRYPOINT ["/sbin/tini", "--"]
CMD npm start