FROM nvidia/cuda:12.2.0-base-ubuntu20.04
FROM python:3.11-slim-buster

RUN apt-get update && apt-get install unzip curl -y \
	&& curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip" \
	&& unzip awscliv2.zip && ./aws/install && rm awscliv2.zip && rm -rf aws

COPY requirements.txt .
RUN pip install -r requirements.txt

WORKDIR api
COPY llama/llama /api/llama
COPY crons /api/crons
COPY utils /api/utils
COPY core /api/core
COPY *.sh /api/
COPY *.py /api/
ENV \
	RANK=0 \
	WORLD_SIZE=1 \
	LOCAL_RANK=0 \
	MASTER_PORT=29500 \
	MASTER_ADDR=localhost \
	CHECKPOINT_DIR=/api/llama-2-7b-chat/ \
	TOKENIZER_PATH=/api/tokenizer.model \
	S3_LLM_DIR= \
	S3_TOKENIZER_PATH= \
	AWS_ACCESS_KEY_ID= \
	AWS_SECRET_ACCESS_KEY= \
	LLAMA_API_AUTH_KEY=
EXPOSE 8082
ENTRYPOINT ./entrypoint.sh
