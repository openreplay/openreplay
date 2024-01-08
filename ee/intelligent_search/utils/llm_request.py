import json
import requests
from typing import List
from utils.params import LLM_ENDPOINT, LLM_API_KEY, LLM_TEMPERATURE, \
        FREQUENCY_PENALTY, MAX_TOKENS, LLM_MODEL
from utils.prompts import summary_context, question_format, \
        summary_example_user_input, summary_example_ai_response
import tiktoken
import openai
# import anyscale


def call_endpoint(url: str, **params):
    if 'method' in params.keys():
        method = params.pop('method')
    else:
        method = 'GET'

    if method == 'GET':
        return json.loads(requests.get(url, data=json.dumps(params['data']), headers=params['headers']).content)
    elif method == 'POST':
        return json.loads(requests.post(url, data=json.dumps(params['data']), headers=params['headers']).content)
    elif method == 'PUT':
        return json.loads(requests.put(url, data=json.dumps(params['data']), headers=params['headers']).content)
    else:
        raise ValueError('Method not implemented')


#    Events have these possible keys:
#        for iOS:
#            events
#                TAP
#                INPUT
#                VIEW
#                SWIPE
#            crashes
#            userEvents
#                customEvents
#            issues
#                 click_rage
#                 dead_click
#                 bad_request
#                 missing_resource
#                 memory
#                 cpu
#                 custom
#                 mouse_thrashing
#        for others:
#            events
#                click
#                input
#                location
#            stackEvents
#                errors != js_exception
#            errors
#                js_exception
#            userEvents
#                customEvents
#            resources
#            issues
#                click_rage
#                dead_click
#                bad_request
#                missing_resource
#                memory
#                cpu
#                custom
#                mouse_thrashing


class Completion:

    def __init__(self, url: str):
        self.url = url
        self.temperature = LLM_TEMPERATURE
        self.llm_api_key = LLM_API_KEY
        self.response_keys = ['id', 'object', 'created', 'model', 'choices', 'usage']
        self.max_tokens = 16384
        self.tokenizer = tiktoken.get_encoding("cl100k_base")
        self.message_history_alive: dict[str, List] = dict()
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

    def update_message_history(self, message: str, key_id: str, role: str = 'user', raw: bool = False):
        if key_id not in self.message_history_alive.keys():
            self.message_history_alive[key_id] = list()
        message_history = self.message_history_alive[key_id]
        if raw:
            message_history.append({
                'role': role,
                'content': message
                })
        else:
            message_history.append({
                'role': role,
                'content': question_format.format(message)
                })


    def reset_message_history(self, key_id: str):
        del self.message_history_alive[key_id]


    def process_large_input(self, long_prompt: List[dict], key_id: str, context: str = '', raw: bool = False):
        splited_prompt = [long_prompt]
        for sub_prompt in splited_prompt:
            for word in self.send_stream_request(str(sub_prompt), key_id=key_id, raw=raw, context=context):
                yield word
        self.reset_message_history(key_id=key_id)

    def send_stream_request(self, message: str, key_id: str, raw: bool = True, context: str = ''):
        self.update_message_history(message, key_id=key_id, raw=raw)
        message_history = self.message_history_alive[key_id]
        client = openai.OpenAI(base_url = LLM_ENDPOINT, api_key= LLM_API_KEY)
        response = client.chat.completions.create(
                model = LLM_MODEL,
                messages = [{'role': 'system', 'content': context if context else summary_context},
                            {'role': 'user', 'content': summary_example_user_input},
                            {'role': 'assistant', 'content': summary_example_ai_response}
                            ] + message_history[-2:] if len(message_history) > 1 else message_history,
                stream = True,
                frequency_penalty=FREQUENCY_PENALTY,
                max_tokens=MAX_TOKENS,
                temperature=LLM_TEMPERATURE
            )
        message_history.pop()
        words = ''
        first_word = True
        for tok in response: 
            delta = tok.choices[0].delta
            if not delta: # End token 
                message_history.append({'role': 'assistant',
                                        'content': words})
                client.close()
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

