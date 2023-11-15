FROM node:20-alpine
LABEL Maintainer="KRAIEM Taha Yassine<tahayk2@gmail.com>"
ARG GIT_SHA
LABEL GIT_SHA=$GIT_SHA
RUN apk add --no-cache tini
ARG envarg
ENV PRIVATE_ENDPOINTS=false \
    GIT_SHA=$GIT_SHA \
    ENTERPRISE_BUILD=${envarg} \
    NODE_ENV=production

WORKDIR /work
COPY package.json .
COPY package-lock.json .
RUN npm install
COPY . .
RUN adduser -u 1001 openreplay -D
USER 1001
ENTRYPOINT ["/sbin/tini", "--"]
CMD npm start
