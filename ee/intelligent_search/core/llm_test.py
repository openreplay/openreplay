from llama import Llama, Dialog
from decouple import config
from utils.contexts import search_context_v2
from threading import Semaphore
from asyncio import sleep
from time import time
import re


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
        self.generator = Llama.build(**params)
        self.max_queue_size = config('LLM_MAX_QUEUE_SIZE', cast=int, default=7)
        self.semaphore = Semaphore(config('LLM_MAX_BATCH_SIZE', cast=int, default=7))
        self.api_timeout = config('API_TIMEOUT', cast=int, default=30)
        self.queue: dict[int, str] = dict()
        self.responses: dict[int, str] = dict()
        self.char_limit: int = config('TOKEN_LIMIT_PER_REQUEST', cast=int, default=100)

    async def process_queue(self, context: str, **params):
        # do something loop with self.queue
        m = re.compile('\([0-9]+\).*\n.*;')
        while True:
            if not self.queue:
                await sleep(0.2)
            else:
                to_process = get_elements_limited_by_char(self.queue, self.char_limit)
                res = await self.execute_multiple_questions(to_process, context, **params)
                responses = m.findall(res[0]['generation'])
                for i,k in enumerate(to_process.keys()):
                    self.responses[k] = responses[i]

    async def __execute_prompts(self, prompts: list, **params):
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

    def __is_ready(self, process_id: int):
        return process_id in self.responses.keys()

    async def send_question(self, key_id, question: str):
        self.queue[key_id] = question
        t = time()
        while not self.__is_ready(key_id):
            await sleep(0.1)
            if time()-t > self.api_timeout:
                raise Exception('[Error] TimeOutError')
        return self.responses.pop(key_id)

    def execute_multiple_questions(self, prompts: dict[int, str], context: str, **params):
        long_prompt = ''
        for i, prompt in enumerate(prompts.values()):
            long_prompt += f'({i}) {prompt}\n'
        return self.__execute_prompts([context.format(user_question=long_prompt)], **params)

