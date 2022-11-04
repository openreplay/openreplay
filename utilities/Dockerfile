FROM node:17-stretch
WORKDIR /work
COPY . .
RUN npm install
ENV MAXMINDDB_FILE=/root/geoip.mmdb
RUN wget https://static.openreplay.com/geoip/GeoLite2-Country.mmdb -O "$MAXMINDDB_FILE";

# Add Tini
# Startup daemon
ENV TINI_VERSION v0.19.0
ARG envarg
ENV ENTERPRISE_BUILD ${envarg}
CMD npm start