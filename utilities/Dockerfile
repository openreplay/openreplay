FROM node:12.22-stretch
WORKDIR /work
COPY . .
RUN npm install


# Add Tini
# Startup daemon
ENV TINI_VERSION v0.19.0
ARG envarg
ENV ENTERPRISE_BUILD ${envarg}
ADD https://github.com/krallin/tini/releases/download/${TINI_VERSION}/tini /tini
RUN chmod +x /tini
ENTRYPOINT ["/tini", "--"]
CMD npm start