from typing import List, Optional
from decouple import config
from time import time

from fastapi import FastAPI, Depends
from contextlib import asynccontextmanager

from utils.contexts import search_context_v2, search_context_v3
from utils.contexts_charts import chart_context_v2, formatable_end
from utils.sql_to_filters import filter_sql_where_statement
from utils import parameters, declarations
from core.llm_test import LLM_Model
from auth.auth_key import api_key_auth
import asyncio

# Testing
from utils.llm_call import Completion
C = Completion()


class FastAPI_with_LLM(FastAPI):
    llm_model: LLM_Model

    def __init__(self, **kwargs):
        super().__init__(**kwargs)

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
    # loop = asyncio.get_event_loop()
    asyncio.create_task(app.llm_model.process_queue_anyscale(search_context_v3))
    yield
    app.clear()


app = FastAPI_with_LLM(lifespan=lifespan)


@app.get('/')
async def health():
    return {'status': 200}

@app.post("/llm/test", dependencies=[Depends(api_key_auth)])
async def predict_test(msg: declarations.LLMQuestion):
    question = msg.question
    t1 = time()
    result = await app.llm_model.send_question(
            question=question,
            key_id=10*msg.userId + msg.projectId)
    t2 = time()
    processed = filter_sql_where_statement(result)
    return {"content": processed, "raw_response": result, "inference_time": t2-t1}

#Testing
@app.post("/llm/testanyscale", dependencies=[Depends(api_key_auth)])
async def predict_anyscale(msg: declarations.LLMQuestion):
    t = time()
    res = ''
    for token in C.send_stream_request(msg.question, "23535"):
        res += token
    return {'content': res, 'inference_time': time()-t}

