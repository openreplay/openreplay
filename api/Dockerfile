FROM python:3.6-slim
LABEL Maintainer="Rajesh Rajendran<rjshrjndrn@gmail.com>"
WORKDIR /work
COPY . .
RUN pip install -r requirements.txt -t ./vendor --upgrade
RUN pip install chalice==1.22.2
# Installing Nodejs
RUN apt update && apt install -y curl && \
    curl -fsSL https://deb.nodesource.com/setup_12.x | bash - && \
    apt install -y nodejs && \
    apt remove --purge -y curl && \
    rm -rf /var/lib/apt/lists/* && \
    cd sourcemaps_reader && \
    npm install && \
    cd assist_server && \
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
