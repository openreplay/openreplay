FROM node:20

WORKDIR /work
COPY . .

ENV AWS_REGION=eu-central-1 \
  WIDTH=1280 \
  HEIGHT=720 \
  FPS=2 \
  SPEED=1 \
  MODE=video \
  OUTDIR=videos \
  BASEURL=https://app.openreplay.com \
  IMGFORMAT=jpeg \

RUN bash install.sh

CMD [ "node", "index.js" ]
