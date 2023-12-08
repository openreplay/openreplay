import re
import json
import requests
from typing import List
from utils.params import LLM_ENDPOINT, LLM_API_KEY, LLM_TEMPERATURE, FREQUENCY_PENALTY, MAX_TOKENS
from utils.prompts import session_summary_base_prompt, \
        session_summary_base_prompt_long, summary_context
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


def process_llm_response(response: str):
    numeration = re.compile('[0-9]+\..*')
    return '\n'.join(numeration.findall(response))

#def get_events(_try=0, **params):
#    """
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
#
#    # look at api/chalice/core/sessions_replay:get_events function.
#    """
#    try:
#        events = json.loads(call_endpoint(chalice_endpoint, **params))
#        return events
#    except json.decoder.JSONDecodeError as e:
#        raise e
#    except requests.RequestException as e:
#        if _try > 3:
#            sleep(0.5 * _try)
#            get_events(_try = _try + 1, **params)
#        else:
#            raise e


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
        elif message_history:
            formated = session_summary_base_prompt_long.format(
                event_list_json=message
                )
            message_history.append({
                'role': role,
                'content': formated
            })
        else:
            formated = session_summary_base_prompt.format(
                    event_list_json=message
                    )
            message_history.append({
                'role': role,
                'content': formated
            })


    def reset_message_history(self, key_id: str):
        del self.message_history_alive[key_id]


    def process_large_input(self, long_prompt: List[dict], key_id: str, filter_response: bool = True, context: str = '', raw: bool = True):
        splited_prompt = self.split_long_event_list(long_prompt)
        phrase = ''
        valid = False
        for sub_prompt in splited_prompt:
            for word in self.send_stream_request(str(sub_prompt), key_id=key_id, filter_response=filter_response, context=context):
                if raw:
                    yield word
                    continue
                if '•' in word or '*' in word:
                    valid = True
                    phrase += word
                elif '\n' in word and valid:
                    valid = False
                    phrase += word
                    yield phrase
                    phrase = ''
                elif valid:
                    phrase += word
                else:
                    continue
        self.reset_message_history(key_id=key_id)

    def send_stream_request(self, message: str, key_id: str, filter_response: bool = True, context: str = ''):
        self.update_message_history(message, key_id=key_id, raw=False)
        message_history = self.message_history_alive[key_id]
        response = openai.ChatCompletion.create(
                api_base = LLM_ENDPOINT,
                api_key= LLM_API_KEY,
                model = "codellama/CodeLlama-34b-Instruct-hf",
                messages = [{'role': 'system', 'content': context if context else summary_context}] + message_history[-2:] if len(message_history) > 1 else message_history,
                stream = True,
                frequency_penalty=FREQUENCY_PENALTY,
                max_tokens=MAX_TOKENS
                )
        message_history.pop()
        words = ''
        for tok in response: 
            delta = tok.choices[0].delta
            if not delta: # End token 
                if filter_response:
                    message_history.append({'role': 'assistant',
                                                 'content': process_llm_response(words)})
                else:
                                                message_history.append({'role': 'assistant',
                                                                             'content': words})
                break
            elif 'content' in delta:
                words += delta['content']
                yield delta['content'] 
            else: 
                continue

    def split_long_event_list(self, long_event_list: List[dict]):
        n_tokens = len(self.tokenizer.encode(str(long_event_list)))
        splited = list()
        number_of_splits = 4 * n_tokens // self.max_tokens
        if number_of_splits == 0:
            return long_event_list
        else:
            split_size = len(long_event_list) // number_of_splits
            for i in range(number_of_splits):
                splited.append(long_event_list[split_size * i: min(split_size * (i+1), len(long_event_list))])
            return splited

