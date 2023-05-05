FROM recommendations_base

COPY requirements.txt .
RUN apt-get update \
  && apt-get install gcc libc-dev g++ -y \
  && apt-get install -y pkg-config libxml2-dev libxmlsec1-dev libxmlsec1-openssl \
  && pip install -r requirements.txt \
  && apt-get clean

COPY core core
COPY crons crons
COPY main.py .
COPY entrypoint.sh .
COPY api.py .

EXPOSE 7001
ENTRYPOINT ./entrypoint.sh
