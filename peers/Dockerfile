FROM node:18-alpine
LABEL Maintainer="KRAIEM Taha Yassine<tahayk2@gmail.com>"
RUN apk add --no-cache tini
RUN apk upgrade busybox --no-cache --repository=http://dl-cdn.alpinelinux.org/alpine/edge/main
ARG envarg
ENV ENTERPRISE_BUILD=${envarg}

WORKDIR /work
COPY package.json .
COPY package-lock.json .
RUN npm install
COPY . .
ENTRYPOINT ["/sbin/tini", "--"]
CMD npm start
