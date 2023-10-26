from llama import Llama, Dialog
from decouple import config
from utils.contexts import search_context_v2
from threading import Semaphore


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
        self.max_queue_size = config('LLM_MAX_QUEUE_SIZE', cast=int, default=1)
        self.semaphore = Semaphore(config('LLM_MAX_BATCH_SIZE', cast=int, default=1))
        self.queue = list()
        self.responses = list()

    def __execute_prompts(self, prompts, **params):
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

    def execute_prompts(self, prompts, **params):
        if self.semaphore.acquire(timeout=10):
            results = self.__execute_prompts(prompts, **params)
            self.semaphore.release()
            return results
        else:
            raise TimeoutError("[Error] LLM is over-requested")

    async def queue_prompt(self, prompt, force=False, **params):
        if self.semaphore.acquire(timeout=10):
            if force:
                self.responses = execute_prompts(self.queue + [prompt])
            else:
                self.queue.append(prompt)
                # Wait until response exists
            self.semaphore.release()
        else:
            raise TimeoutError("[Error] LLM is over-requested")

