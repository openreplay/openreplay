FROM python:3.11-alpine

WORKDIR app
COPY requirements.txt requirements.txt
RUN pip install -r requirements.txt
COPY . .
ENV \
	LLM_ENDPOINT= \
	LLM_API_KEY= \
	API_AUTH_KEY= \
	LLM_URL= \
	LLM_MODEL= \
	LLM_TEMPERATURE= \
	FREQUENCY_PENALTY= \
	MAX_TOKENS= 

EXPOSE 8484
ENTRYPOINT ./entrypoint.sh

