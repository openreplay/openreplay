FROM python:3.11.0a7-slim
LABEL Maintainer="Rajesh Rajendran<rjshrjndrn@gmail.com>"
LABEL Maintainer="KRAIEM Taha Yassine<tahayk2@gmail.com>"
WORKDIR /work
COPY . .
RUN pip install -r requirements.txt
RUN mv .env.default .env
ENV APP_NAME chalice
# Installing Nodejs
RUN apt update && apt install -y curl && \
    curl -fsSL https://deb.nodesource.com/setup_12.x | bash - && \
    apt install -y nodejs && \
    apt remove --purge -y curl && \
    rm -rf /var/lib/apt/lists/* && \
    cd sourcemap-reader && \
    npm install

# Add Tini
# Startup daemon
ENV TINI_VERSION v0.19.0
ARG envarg
ENV ENTERPRISE_BUILD ${envarg}
ADD https://github.com/krallin/tini/releases/download/${TINI_VERSION}/tini /tini
RUN chmod +x /tini
ENTRYPOINT ["/tini", "--"]
CMD ./entrypoint.sh