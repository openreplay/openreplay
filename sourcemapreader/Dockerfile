FROM node:26-alpine
LABEL Maintainer="KRAIEM Taha Yassine<tahayk2@gmail.com>"
ARG GIT_SHA
LABEL GIT_SHA=$GIT_SHA
RUN apk upgrade --no-cache && apk add --no-cache tini

ARG envarg
ENV APP_NAME=sourcemapreader \
    LISTEN_PORT=9000 \
    PRIVATE_ENDPOINTS=true \
    GIT_SHA=$GIT_SHA \
    ENTERPRISE_BUILD=${envarg} \
    NODE_ENV=production

WORKDIR /work
COPY *.json ./
RUN npm install --omit=dev --ignore-scripts \
    && npm cache clean --force \
    && rm -rf /usr/local/lib/node_modules/npm /usr/local/lib/node_modules/corepack \
              /usr/local/bin/npm /usr/local/bin/npx /usr/local/bin/corepack \
              /root/.npm /tmp/*

COPY . .

RUN adduser -u 1001 openreplay -D
USER 1001

ENTRYPOINT ["/sbin/tini", "--"]
CMD ./entrypoint.sh
