FROM node:18-alpine
LABEL Maintainer="KRAIEM Taha Yassine<tahayk2@gmail.com>"
ARG envarg
ENV TINI_VERSION=v0.19.0 \
    ENTERPRISE_BUILD=${envarg}
# Add Tini
# Startup daemon
ADD https://github.com/krallin/tini/releases/download/${TINI_VERSION}/tini /tini
RUN chmod +x /tini
WORKDIR /work
COPY package.json .
COPY package-lock.json .
RUN npm install
COPY . .
ENTRYPOINT ["/tini", "--"]
CMD npm start