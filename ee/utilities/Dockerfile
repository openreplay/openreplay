FROM node:18-alpine
LABEL Maintainer="KRAIEM Taha Yassine<tahayk2@gmail.com>"
RUN apk upgrade busybox --no-cache --repository=http://dl-cdn.alpinelinux.org/alpine/edge/main
RUN apk add --no-cache tini git libc6-compat && ln -s /lib/libc.musl-x86_64.so.1 /lib/ld-linux-x86-64.so.2
ARG envarg
ENV ENTERPRISE_BUILD=${envarg} \
    MAXMINDDB_FILE=/root/geoip.mmdb

WORKDIR /work
ADD https://static.openreplay.com/geoip/GeoLite2-Country.mmdb  $MAXMINDDB_FILE
COPY package.json .
COPY package-lock.json .
RUN npm install
COPY . .
ENTRYPOINT ["/sbin/tini", "--"]
CMD npm start
