FROM node:18-alpine
LABEL Maintainer="KRAIEM Taha Yassine<tahayk2@gmail.com>"
RUN apk add --no-cache tini
ARG envarg
ENV ENTERPRISE_BUILD=${envarg}

WORKDIR /work
COPY package.json .
COPY package-lock.json .
RUN npm install
COPY . .
RUN adduser -u 1001 openreplay -D
USER 1001
ENTRYPOINT ["/sbin/tini", "--"]
CMD npm start
