FROM python:3.6-slim
LABEL Maintainer="Rajesh Rajendran<rjshrjndrn@gmail.com>"
RUN apt-get update && apt-get install -y pkg-config libxmlsec1-dev gcc && rm -rf /var/lib/apt/lists/*
WORKDIR /work
COPY . .
RUN pip install -r requirements.txt -t ./vendor --upgrade
RUN pip install chalice==1.22.2

# Add Tini
# Startup daemon
ENV TINI_VERSION v0.19.0
ARG envarg
ENV ENTERPRISE_BUILD ${envarg}
ADD https://github.com/krallin/tini/releases/download/${TINI_VERSION}/tini /tini
RUN chmod +x /tini
ENTRYPOINT ["/tini", "--"]
CMD ./entrypoint.sh
