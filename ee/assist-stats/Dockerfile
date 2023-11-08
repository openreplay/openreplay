FROM python:3.11-alpine
LABEL Maintainer="Rajesh Rajendran<rjshrjndrn@gmail.com>"
LABEL Maintainer="Shekar Sirikonda<sshekarsiri@gmail.com>"
ARG GIT_SHA
LABEL GIT_SHA=$GIT_SHA

ARG envarg
# Add Tini
# Startup daemon
ENV APP_NAME=assist-stats \
    ENTERPRISE_BUILD=${envarg} \
    GIT_SHA=$GIT_SHA

WORKDIR /work
COPY requirements.txt ./requirements.txt
RUN pip install --no-cache-dir --upgrade -r requirements.txt

COPY . .
RUN mv env.default .env

RUN adduser -u 1001 openreplay -D
USER 1001

EXPOSE 8000
CMD ["/usr/local/bin/python", "./run.py"]
