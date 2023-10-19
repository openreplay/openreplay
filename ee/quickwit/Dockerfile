FROM quickwit/quickwit:0.6.4

WORKDIR /quickwit

RUN apt-get update
RUN apt-get install python3 python3-pip -y
RUN apt-get clean
COPY requirements.txt /quickwit/
RUN pip install -r requirements.txt

COPY *.yaml /quickwit/
COPY *.sh /quickwit/
COPY consumer.py /quickwit/
COPY msgcodec /quickwit/msgcodec

ENV filter="true" \
	encrypted="false" \
	fetch_maxsize=800 \
	graphql_maxsize=800 \
	pageevent_maxsize=800 \
	QUICKWIT_PORT=7280

EXPOSE 7281

ENTRYPOINT ./entrypoint.sh
