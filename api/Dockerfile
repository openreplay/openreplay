FROM python:3.10-slim
LABEL Maintainer="Rajesh Rajendran<rjshrjndrn@gmail.com>"
LABEL Maintainer="KRAIEM Taha Yassine<tahayk2@gmail.com>"
ARG envarg
# Add Tini
# Startup daemon
ENV TINI_VERSION=v0.19.0 \
    SOURCE_MAP_VERSION=0.7.4 \
    APP_NAME=chalice \
    ENTERPRISE_BUILD=${envarg}
ADD https://github.com/krallin/tini/releases/download/${TINI_VERSION}/tini /tini
ADD https://unpkg.com/source-map@${SOURCE_MAP_VERSION}/lib/mappings.wasm /mappings.wasm
RUN chmod +x /tini

# Installing Nodejs
RUN apt update && apt install -y curl && \
    curl -fsSL https://deb.nodesource.com/setup_18.x | bash - && \
    apt install -y nodejs && \
    apt remove --purge -y curl && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /work_tmp
COPY requirements.txt /work_tmp/requirements.txt
RUN pip install --no-cache-dir --upgrade -r /work_tmp/requirements.txt
COPY sourcemap-reader/*.json /work_tmp/
RUN cd /work_tmp && npm install

WORKDIR /work
COPY . .
RUN mv env.default .env && mv /work_tmp/node_modules sourcemap-reader/.

ENTRYPOINT ["/tini", "--"]
CMD ./entrypoint.sh
