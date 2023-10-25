aws s3 cp --recursive {{S3_LLM_DIR}} {{CHECKPOINT_DIR}}
aws s3 cp {{S3_TOKENIZER_PATH}} {{TOKENIZER_PATH}}
