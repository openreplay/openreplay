FROM python:3.10-slim
LABEL Maintainer="Rajesh Rajendran<rjshrjndrn@gmail.com>"
LABEL Maintainer="KRAIEM Taha Yassine<tahayk2@gmail.com>"
ENV APP_NAME alerts
ENV pg_minconn 2
ENV pg_maxconn 10
# Add Tini
# Startup daemon
ENV TINI_VERSION v0.19.0
ARG envarg
ENV ENTERPRISE_BUILD ${envarg}
ADD https://github.com/krallin/tini/releases/download/${TINI_VERSION}/tini /tini
RUN chmod +x /tini

COPY requirements.txt /work_tmp/requirements.txt
RUN pip install --no-cache-dir --upgrade -r /work_tmp/requirements.txt

WORKDIR /work
COPY . .
RUN mv env.default .env && mv app_alerts.py app.py && mv entrypoint_alerts.sh entrypoint.sh

ENTRYPOINT ["/tini", "--"]
CMD ./entrypoint.sh