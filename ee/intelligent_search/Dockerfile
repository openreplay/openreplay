FROM pytorch/pytorch:2.0.1-cuda11.7-cudnn8-runtime

COPY requirements.txt .
RUN pip install -r requirements.txt

WORKDIR api
COPY llama/llama/*.py llama/
COPY auth/*.py auth/
COPY crons/*.py crons/
COPY utils/*.py utils/
COPY core/*.py core/
COPY *.sh ./
COPY *.py ./
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
