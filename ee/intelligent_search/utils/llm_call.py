import json
import requests
from typing import List
from utils.parameters import LLM_ENDPOINT, LLM_API_KEY, LLM_TEMPERATURE, \
        FREQUENCY_PENALTY, MAX_TOKENS, LLM_MODEL
from utils.contexts import search_context_v3
import tiktoken
import openai


class Completion:

    def __init__(self):
        self.llm_api_key = LLM_API_KEY
        self.max_tokens = 16384
        # 'id': {model}-{id}
        # 'object': method (text-completion)
        # 'created': timestamp
        # 'model': model
        # 'choices': list of the following
        #       message
        #           role: Assistant
        #           content: response
        #       index
        #       finish_reason
        # 'usage'

    def send_stream_request(self, message: str, raw: bool = True, context: str = ''):
        response = openai.ChatCompletion.create(
                api_base = LLM_ENDPOINT,
                api_key= LLM_API_KEY,
                model = LLM_MODEL,
                messages = [{"role": "user", "content": search_context_v3.format(user_question=message)}],
                stream = True,
                frequency_penalty=FREQUENCY_PENALTY,
                max_tokens=MAX_TOKENS,
                temperature=LLM_TEMPERATURE
                )
        words = ''
        first_word = True
        for tok in response: 
            delta = tok.choices[0].delta
            if not delta: # End token 
                break
            elif 'content' in delta:
                words += delta['content']
                if first_word:
                    if delta['content'] == ' ':
                        continue
                    elif delta['content'][0] == ' ':
                        yield delta['content'][1:]
                    else:
                        yield delta['content']
                    first_word = False
                else:
                    yield delta['content'] 
            else: 
                continue
