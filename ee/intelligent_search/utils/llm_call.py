from utils.parameters import LLM_ENDPOINT, LLM_API_KEY, LLM_TEMPERATURE, \
        FREQUENCY_PENALTY, MAX_TOKENS, LLM_MODEL
from utils.prompts import FilterPrompt, SummaryPrompt
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
        client = openai.OpenAI(api_key= LLM_API_KEY,base_url = LLM_ENDPOINT)
        response = client.chat.completions.create(
                model = LLM_MODEL,
                messages = [{"role": "user", "content": FilterPrompt.search_context_v3.format(user_question=message)}],
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
                client.close()
                break
            elif delta.content:
                words += delta.content
                if first_word:
                    if delta.content == ' ':
                        continue
                    elif delta.content[0] == ' ':
                        yield delta.content[1:]
                    else:
                        yield delta.content
                    first_word = False
                else:
                    yield delta.content 
            else: 
                continue

    async def send_async_request(self, message: str, raw: bool = True, context: str = ''):
        client = openai.AsyncOpenAI(api_key= LLM_API_KEY,base_url = LLM_ENDPOINT)
        response = await client.chat.completions.create(
                model = LLM_MODEL,
                messages = [{"role": "user", "content": FilterPrompt.search_context_v3.format(user_question=message)}],
                frequency_penalty=FREQUENCY_PENALTY,
                max_tokens=MAX_TOKENS,
                temperature=LLM_TEMPERATURE
                )
        await client.close()
        return response.choices[0].message.content

    async def send_async_stream_request(self, message: str, raw: bool = True, context: str = ''):
        client = openai.AsyncOpenAI(api_key= LLM_API_KEY,base_url = LLM_ENDPOINT)
        message_json = {
            'role': 'user',
            'content': SummaryPrompt.question_format.format(message)
        }

        response = await client.chat.completions.create(
                model = LLM_MODEL,
                messages = [{'role': 'system', 'content': context if context else SummaryPrompt.summary_context},
                            {'role': 'user', 'content': SummaryPrompt.summary_example_user_input},
                            {'role': 'assistant', 'content': SummaryPrompt.summary_example_ai_response}
                            ] + [message_json],
                stream = True,
                frequency_penalty=FREQUENCY_PENALTY,
                max_tokens=MAX_TOKENS,
                temperature=LLM_TEMPERATURE
            )
        words = ''
        first_word = True
        async for tok in response: 
            delta = tok.choices[0].delta
            if not delta: # End token 
                await client.close()
                break
            elif delta.content:
                words += delta.content
                if first_word:
                    if delta.content == ' ':
                        continue
                    elif delta.content[0] == ' ':
                        yield delta.content[1:]
                    else:
                        yield delta.content
                    first_word = False
                else:
                    yield delta.content 
            else: 
                continue

