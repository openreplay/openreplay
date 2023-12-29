from decouple import config
from typing import Optional

ckpt_dir: str = config('CHECKPOINT_DIR')
tokenizer_path: str = config('TOKENIZER_PATH')
temperature: float = config('TEMPERATURE', default=0.6)
top_p: float = config('TOP_P', default=0.9)
max_seq_len: int = config('MAX_SEQ_LEN', default=4098)
max_gen_len: int = config('MAX_GEN_LEN', default=64)
max_batch_size: int = config('MAX_BATCH_SIZE', default=4)

# This is a test
LLM_ENDPOINT: str = config('LLM_ENDPOINT')
LLM_API_KEY: str = config('LLM_API_KEY')
LLM_TEMPERATURE: float = config('LLM_TEMPERATURE', cast=float, default=0.2)
FREQUENCY_PENALTY: float = config('FREQUENCY_PENALTY', cast=float, default=0.0)
MAX_TOKENS: int = config('MAX_TOKENS', cast=int, default=64)
LLM_MODEL: str = config('LLM_MODEL', default='meta-llama/Llama-2-7b')

