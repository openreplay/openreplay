from decouple import config, Choices
from typing import Optional, Union


def float_range(value: object, lower_bound: float, higher_bound: float):
    value = float(value)
    assert value >= lower_bound and value <= higher_bound, f'Value out of range ({lower_bound}, {higher_bound})'
    return value

anyscale_models = [
        'meta-llama/Llama-2-7b-chat-hf',
        'meta-llama/Llama-2-13b-chat-hf',
        'meta-llama/Llama-2-70b-chat-hf',
        'codellama/CodeLlama-34b-Instruct-hf'
        ]

# Self-hosted params
ckpt_dir: str = config('CHECKPOINT_DIR', default=None)
tokenizer_path: str = config('TOKENIZER_PATH', default=None)
temperature: float = config('TEMPERATURE', cast=lambda k: float_range(k, 0.0, 2.0), default=0.6)
top_p: float = config('TOP_P', default=0.9)
max_seq_len: int = config('MAX_SEQ_LEN', default=4098)
max_gen_len: int = config('MAX_GEN_LEN', default=64)
max_batch_size: int = config('MAX_BATCH_SIZE', default=4)

# Cloud endpoint params
LLM_ENDPOINT: str = config('LLM_ENDPOINT', default=None)
LLM_API_KEY: str = config('LLM_API_KEY', default=None)
LLM_TEMPERATURE: float = config('LLM_TEMPERATURE', cast=lambda k: float_range(k, 0.0, 2.0), default=0.2)
FREQUENCY_PENALTY: float = config('FREQUENCY_PENALTY', cast=lambda k: float_range(k, -2.0, 2.0), default=0.0)
MAX_TOKENS: int = config('MAX_TOKENS', cast=int, default=64)
LLM_MODEL: str = config('LLM_MODEL', cast=Choices(anyscale_models), default='meta-llama/Llama-2-7b-chat-hf')

