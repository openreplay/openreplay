FROM python:3.13-alpine
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
RUN pip install --no-cache-dir --upgrade uv
RUN uv pip install --no-cache-dir --upgrade pip setuptools wheel --system
RUN uv pip install --no-cache-dir --upgrade -r requirements.txt --system
RUN pip uninstall -y uv

# pip is not needed at runtime; its vendored libs (msgpack, setuptools, urllib3) are listed
# in pip/_vendor/bom.cdx.json and get flagged by image scanners
RUN rm -rf /usr/local/lib/python3.13/site-packages/pip \
  /usr/local/lib/python3.13/site-packages/pip-*.dist-info \
  /usr/local/lib/python3.13/ensurepip \
  /usr/local/bin/pip /usr/local/bin/pip3 /usr/local/bin/pip3.*

COPY . .
RUN mv env.default .env

RUN adduser -u 1001 openreplay -D
USER 1001

EXPOSE 8000
CMD ["/usr/local/bin/python", "./run.py"]
