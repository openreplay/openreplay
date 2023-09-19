from utils.llm_request import LLMResponseProcessing
from llama import Llama, Dialog
from utils.contexts import search_context_v2


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

    def execute_prompts(self, prompts, **params):
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

