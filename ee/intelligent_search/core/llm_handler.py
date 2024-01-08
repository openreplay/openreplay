from core.llm_app import LLM_Model


class Handler:
     llm_model: LLM_Model
     llm_endpoint: LLM_Model

     def __init__(self):
         pass

     def build_llm(self, ckpt_dir: str, tokenizer_path: str, max_seq_len: int, max_batch_size: int):
         self.llm_model = LLM_Model(local=True,
                                ckpt_dir=ckpt_dir,
                                tokenizer_path=tokenizer_path,
                                max_seq_len=max_seq_len,
                                max_batch_size=max_batch_size)
         self.llm_endpoint = LLM_Model(local=False) 

     def clear(self):
         del self.llm_endpoint
         del self.llm_model

llm_handler = Handler()
