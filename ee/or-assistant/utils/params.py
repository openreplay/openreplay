from decouple import config, Choices


def float_range(value: object, lower_bound: float, higher_bound: float):
    value = float(value)
    assert value >= lower_bound and value <= higher_bound, f'Value out of range ({lower_bound}, {higher_bound})'
    return value

llama_models = [
        'meta-llama/Llama-2-7b-chat-hf',
        'meta-llama/Llama-2-13b-chat-hf',
        'meta-llama/Llama-2-70b-chat-hf',
        'codellama/CodeLlama-34b-Instruct-hf'
        ]

LLM_API_KEY = config('LLM_API_KEY', cast=str)
API_AUTH_KEY = config('API_AUTH_KEY', cast=str)
LLM_URL = config('LLM_ENDPOINT', cast=str) + '/chat/completions'
LLM_ENDPOINT = config('LLM_ENDPOINT', cast=str)
LLM_MODEL = config('LLM_MODEL', cast=Choices(llama_models), default='meta-llama/Llama-2-70b-chat-hf')
LLM_TEMPERATURE = config('LLM_TEMPERATURE', default=0.2, cast=float)
# CHALICE_ENDPOINT = config('CHALICE_ENDPOINT', default='https://api.openreplay.com/{projectId}/sessions/{sessionId}/events')
FREQUENCY_PENALTY = config('FREQUENCY_PENALTY', default=0.0, cast=lambda k: float_range(k, -2.0, 2.0))
MAX_TOKENS = config('MAX_TOKENS', default=None, cast=lambda k: int(k) if k else None)

