from decouple import config
from typing import Optional

ckpt_dir: str = config('CHECKPOINT_DIR')
tokenizer_path: str = config('TOKENIZER_PATH')
temperature: float = config('TEMPERATURE', default=0.6)
top_p: float = config('TOP_P', default=0.9)
max_seq_len: int = config('MAX_SEQ_LEN', default=4098)
max_gen_len: int = config('MAX_GEN_LEN', default=256)
max_batch_size: int = config('MAX_BATCH_SIZE', default=4)

