from typing import List, Optional
from decouple import config
from time import time

from fastapi import FastAPI, Depends
from contextlib import asynccontextmanager

from utils.contexts import search_context_v2, search_context_v3
from utils.contexts_charts import chart_context_v2, formatable_end
from utils.sql_to_filters import filter_sql_where_statement
from utils import parameters, declarations
from core.llm_api import LLM_Model
from auth.auth_key import api_key_auth


class FastAPI_with_LLM(FastAPI):

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.llm_model = None

    def build_llm(self, ckpt_dir: str, tokenizer_path: str, max_seq_len: int, max_batch_size: int):
        self.llm_model = LLM_Model(ckpt_dir=ckpt_dir,
                                tokenizer_path=tokenizer_path,
                                max_seq_len=max_seq_len,
                                max_batch_size=max_batch_size)

    def clear(self):
        del self.llm_model


@asynccontextmanager
async def lifespan(app: FastAPI_with_LLM):
    app.build_llm(ckpt_dir=parameters.ckpt_dir,
                  tokenizer_path=parameters.tokenizer_path,
                  max_seq_len=parameters.max_seq_len,
                  max_batch_size=parameters.max_batch_size)
    yield
    app.clear()


app = FastAPI_with_LLM(lifespan=lifespan)


@app.post("/llm/completion", dependencies=[Depends(api_key_auth)])
async def predict(msg: declarations.LLMQuestion):
    question = msg.question
    t1 = time()
    result = app.llm_model.execute_prompts([search_context_v3.format(user_question=question)],
                                            temperature=parameters.temperature,
                                            top_p=parameters.top_p,
                                            max_gen_len=parameters.max_gen_len)
    t2 = time()
    processed = filter_sql_where_statement(result[0]['generation'])
    if processed is None:
        return {"content": None, "raw_response": result, "inference_time": t2-t1}
    return {"content": processed, "raw_response": result, "inference_time": t2-t1}


@app.post("/llm/completion/charts", dependencies=[Depends(api_key_auth)])
async def chart_predict(msg: declarations.LLMQuestion):
     question = msg.question
     t1 = time()
     result = app.llm_model.execute_prompts([chart_context_v2+formatable_end.format(user_question=question)],
                                             temperature=parameters.temperature,
                                             top_p=parameters.top_p,
                                             max_gen_len=parameters.max_gen_len)
     t2 = time()
     processed = result[0]['generation']
     if processed is None:
         return {"content": None, "raw_response": result, "inference_time": t2-t1}
     return {"content": processed, "raw_response": result, "inference_time": t2-t1}


@app.get('/')
async def health():
    return {'status': 200}

