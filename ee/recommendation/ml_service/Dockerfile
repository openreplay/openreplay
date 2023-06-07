FROM recommendations_base

RUN apt-get update \
  && apt-get install -y gcc libc-dev g++ pkg-config libxml2-dev libxmlsec1-dev libxmlsec1-openssl \
  && apt-get clean

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY auth auth
COPY crons crons
COPY core core
COPY entrypoint.sh .
COPY api.py .

EXPOSE 7001
ENTRYPOINT ./entrypoint.sh
