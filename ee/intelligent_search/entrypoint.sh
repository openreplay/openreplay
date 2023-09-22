find /api/ -type f -name "download_llm.sh" -exec sed -i "s#{{S3_LLM_DIR}}#${S3_LLM_DIR}#g" {} \;
find /api/ -type f -name "download_llm.sh" -exec sed -i "s#{{CHECKPOINT_DIR}}#${CHECKPOINT_DIR}#g" {} \;
find /api/ -type f -name "download_llm.sh" -exec sed -i "s#{{S3_TOKENIZER_PATH}}#${S3_TOKENIZER_PATH}#g" {} \;
find /api/ -type f -name "download_llm.sh" -exec sed -i "s#{{TOKENIZER_PATH}}#${TOKENIZER_PATH}#g" {} \;
./download_llm.sh
uvicorn main:app --host 0.0.0.0 --port 8082
