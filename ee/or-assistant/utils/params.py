from decouple import config

LLM_API_KEY = config('LLM_API_KEY', cast=str)
API_AUTH_KEY = config('API_AUTH_KEY', cast=str)
LLM_URL = config('LLM_ENDPOINT', cast=str) + '/chat/completions'
LLM_ENDPOINT = config('LLM_ENDPOINT', cast=str)
LLM_TEMPERATURE = config('LLM_TEMPERATURE', default=0.7, cast=float)
# CHALICE_ENDPOINT = config('CHALICE_ENDPOINT', default='https://api.openreplay.com/{projectId}/sessions/{sessionId}/events')
