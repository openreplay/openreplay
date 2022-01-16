FROM python:3.9.7-slim
LABEL Maintainer="Rajesh Rajendran<rjshrjndrn@gmail.com>"
LABEL Maintainer="KRAIEM Taha Yassine<tahayk2@gmail.com>"
WORKDIR /work
COPY . .
RUN pip install -r requirements.txt
RUN mv .env.default .env

# Add Tini
# Startup daemon
ENV TINI_VERSION v0.19.0
ARG envarg
ENV ENTERPRISE_BUILD ${envarg}
ADD https://github.com/krallin/tini/releases/download/${TINI_VERSION}/tini /tini
RUN chmod +x /tini
ENTRYPOINT ["/tini", "--"]
CMD ./entrypoint.sh