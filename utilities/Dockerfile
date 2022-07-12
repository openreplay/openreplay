FROM node:18-alpine
LABEL Maintainer="KRAIEM Taha Yassine<tahayk2@gmail.com>"
RUN apk add --no-cache tini
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