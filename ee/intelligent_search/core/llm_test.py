from llama import Llama, Dialog
from decouple import config
from utils.contexts import search_context_v2
from threading import Semaphore
from asyncio import sleep
from time import time
import re
from utils.llm_call import Completion
import logging


def get_elements_limited_by_char(queue: dict[int, str], char_limit: int):
    elements = dict()
    total_length = 0
    for k,v in queue.items():
        l = len(v)
        if l + total_length >= char_limit:
            break
        else:
            total_length += l
            elements[k] = v
    for k in elements.keys():
        del queue[k]
    return elements


class LLM_Model:

    def __init__(self, **params):
        """
        Initialization of pre-trained model.
        Args:
            ckpt_dirckpt_dir (str): The directory containing checkpoint files for the pretrained model.
            tokenizer_path (str): The path to the tokenizer model used for text encoding/decoding.
            max_seq_len (int, optional): The maximum sequence length for input prompts. Defaults to 128.
            max_batch_size (int, optional): The maximum batch size for generating sequences. Defaults to 4.
        """
        local = params.pop('local')
        if local:
            self.generator = Llama.build(**params)
        else:
            self.generator = None
        self.max_queue_size = config('LLM_MAX_QUEUE_SIZE', cast=int, default=7)
        self.semaphore_queue = Semaphore(config('LLM_MAX_BATCH_SIZE', cast=int, default=1))
        self.semaphore_response = Semaphore(config('LLM_MAX_BATCH_SIZE', cast=int, default=1))
        self.api_timeout = config('API_TIMEOUT', cast=int, default=30)
        self.queue: dict[int, str] = dict()
        self.responses: dict[int, str] = dict()
        self.char_limit: int = config('TOKEN_LIMIT_PER_REQUEST', cast=int, default=100)
        self.anyscale = Completion()

    async def process_queue(self, context: str, **params):
        assert self.generator, 'Self hosted model should be build. Set local=True during initialization, along with model checkpoint directory and tokenizer path.'
        # do something loop with self.queue
        m = re.compile('\(\d\)[^;]*')
        while True:
            if not self.queue:
                await sleep(0.2)
            else:
                #print('[INFO] FOUND DATA!!!')
                if self.semaphore_queue.acquire(timeout=4):
                    to_process = get_elements_limited_by_char(self.queue, self.char_limit)
                    self.semaphore_queue.release()
                else:
                    continue
                    # raise Exception('[Error] Semaphore TimeOutException')
                res = await self.execute_multiple_questions(to_process, context, **params)
                #print('Result ready:', res)
                if len(to_process) == 1:
                    responses = [res[0]['generation'].replace('\n',' ')]
                else:
                    responses = m.findall(res[0]['generation'].replace('\n',' '))
                if self.semaphore_response.acquire(timeout=4):
                    for i,k in enumerate(to_process.keys()):
                        try:
                            self.responses[k] = responses[i]
                        except IndexError:
                            logging.error(f'Unmatched questions to answers:\n{to_process}\n{res}\n{responses}')
                    self.semaphore_response.release()
                else:
                    raise Exception('[Error] Semaphore TimeOutException')

    def __execute_prompts(self, prompts: list, **params):
        """
        Entry point of the program for generating text using a pretrained model.

        Args:
            prompts (list str): batch of prompts to be asked to LLM.
            temperature (float, optional): The temperature value for controlling randomness in generation. Defaults to 0.6.
            top_p (float, optional): The top-p sampling parameter for controlling diversity in generation. Defaults to 0.9.
            max_gen_len (int, optional): The maximum length of generated sequences. Defaults to 64.
        """
        return self.generator.text_completion(
                prompts, **params)

    async def __is_ready(self, process_id: int):
        t = time()
        while True:
            if self.semaphore_response.acquire(timeout=2):
                if process_id in self.responses.keys():
                    value = self.responses[process_id]
                    self.semaphore_response.release()
                    return value
                else:
                    self.semaphore_response.release()
                    await sleep(0.1)
            if time()-t > self.api_timeout:
                raise Exception('[Error] Semaphore TimeOutException')

    async def send_question(self, key_id, question: str):
        if self.semaphore_queue.acquire(timeout=2):
            self.queue[key_id] = question
            self.semaphore_queue.release()
        else:
            raise Exception('[Error] Semaphore TimeOutException')
        t = time()
        return await self.__is_ready(key_id)

    async def execute_multiple_questions(self, prompts: dict[int, str], context: str, **params):
        long_prompt = ''
        for i, prompt in enumerate(prompts.values()):
            long_prompt += f'({i}) {prompt}\n'
        return self.__execute_prompts([context.format(user_question=long_prompt)], **params)

    async def execute_multiple_questions_anyscale(self, prompts: dict[int, str], context: str, **params):
        long_prompt = ''
        for i, prompt in enumerate(prompts.values()):
            long_prompt += f'({i}) {prompt}\n'
        response = ''
        for k in self.anyscale.send_stream_request([context.format(user_question=long_prompt)], **params):
            response += k
        return [{'generation': response}]

    async def process_queue_anyscale(self, context: str, **params):
        # do something loop with self.queue
        m = re.compile('\(\d\)[^;]*')
        while True:
            if not self.queue:
                await sleep(0.2)
            else:
                #print('[INFO] FOUND DATA!!!')
                if self.semaphore_queue.acquire(timeout=4):
                    to_process = get_elements_limited_by_char(self.queue, self.char_limit)
                    self.semaphore_queue.release()
                else:
                    continue
                    # raise Exception('[Error] Semaphore TimeOutException')
                res = await self.execute_multiple_questions_anyscale(to_process, context, **params)
                logging.info(f'Number of requests processed simultaneosly: {len(to_process)}')
                #print('Result ready:', res)
                if len(to_process) == 1:
                    responses = [res[0]['generation'].replace('\n',' ')]
                else:
                    responses = m.findall(res[0]['generation'].replace('\n',' '))
                if self.semaphore_response.acquire(timeout=4):
                    for i,k in enumerate(to_process.keys()):
                        try:
                            self.responses[k] = responses[i]
                        except IndexError:
                            logging.error(f'Unmatched questions to answers:\n{to_process}\n{res}\n{responses}')
                    self.semaphore_response.release()
                else:
                    raise Exception('[Error] Semaphore TimeOutException')

