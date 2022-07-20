FROM node:18-alpine
LABEL Maintainer="KRAIEM Taha Yassine<tahayk2@gmail.com>"
RUN apk add --no-cache tini
RUN apk upgrade busybox --no-cache --repository=http://dl-cdn.alpinelinux.org/alpine/edge/main
ARG envarg
ENV ENTERPRISE_BUILD=${envarg} \
    MAXMINDDB_FILE=/root/geoip.mmdb

WORKDIR /work
ADD https://static.openreplay.com/geoip/GeoLite2-Country.mmdb  $MAXMINDDB_FILE
COPY package.json .
COPY package-lock.json .
RUN npm install
COPY . .
RUN adduser -u 1001 openreplay -D
USER 1001
ENTRYPOINT ["/sbin/tini", "--"]
CMD npm start
