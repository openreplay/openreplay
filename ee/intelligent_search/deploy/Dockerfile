FROM python:3.11-alpine

COPY deploy/requirements.txt .
RUN pip install -r requirements.txt

WORKDIR api
COPY auth/*.py auth/
COPY utils/*.py utils/
COPY routers/*.py routers/
COPY core/*.py core/
COPY *.py ./
COPY entrypoint.sh ./
ENV \
	S3_LLM_DIR= \
	S3_TOKENIZER_PATH= \
	AWS_ACCESS_KEY_ID= \
	AWS_SECRET_ACCESS_KEY= \
	LLAMA_API_AUTH_KEY=
EXPOSE 8082
ENTRYPOINT ./entrypoint.sh
