from time import time
from utils.contexts import search_context_v2, search_context_v3
from utils.contexts_charts import chart_context_v2, formatable_end
from utils.sql_to_filters import filter_sql_where_statement
from utils import parameters, declarations
from core.llm_test import LLM_Model
import asyncio

from fastapi import FastAPI, Depends, HTTPException
from fastapi.responses import StreamingResponse
from contextlib import asynccontextmanager
from auth.auth_key import api_key_auth
from core.session_summary import summarize_stream


class FastAPI_with_LLM(FastAPI):
    llm_model: LLM_Model

    def __init__(self, **kwargs):
        super().__init__(**kwargs)

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


@asynccontextmanager
async def lifespan(app: FastAPI_with_LLM):
    app.build_llm(ckpt_dir=parameters.ckpt_dir,
                  tokenizer_path=parameters.tokenizer_path,
                  max_seq_len=parameters.max_seq_len,
                  max_batch_size=parameters.max_batch_size)
    # loop = asyncio.get_event_loop()
    asyncio.create_task(app.llm_model.process_queue_anyscale(search_context_v3))
    asyncio.create_task(app.llm_endpoint.process_queue_anyscale(search_context_v3))
    yield
    app.clear()


app = FastAPI_with_LLM(lifespan=lifespan)


@app.get('/')
async def health():
    return {'status': 200}

@app.post("/llm/local", dependencies=[Depends(api_key_auth)])
async def predict_local(msg: declarations.LLMQuestion):
    question = msg.question
    t1 = time()
    result = await app.llm_model.send_question(
            question=question,
            key_id=10*msg.userId + msg.projectId)
    t2 = time()
    processed = filter_sql_where_statement(result)
    return {"content": processed, "raw_response": result, "inference_time": t2-t1}

@app.post("/llm/anyscale", dependencies=[Depends(api_key_auth)])
async def predict_anyscale(msg: declarations.LLMQuestion):
    question = msg.question
    t1 = time()
    result = await app.llm_endpoint.send_question(
            question=question,
            key_id=10*msg.userId + msg.projectId)
    t2 = time()
    processed = filter_sql_where_statement(result)
    return {"content": processed, "raw_response": result, "inference_time": t2-t1}

@app.get('/stream/{projectId}/summary/session/{sessionId}',
          dependencies=[Depends(api_key_auth)],
          response_model=str,
          responses={503: {"detail": "OpenAI server is busy, try again later"}})
@app.post('/stream/{projectId}/summary/session/{sessionId}',
         dependencies=[Depends(api_key_auth)],
         response_model=str,
         responses={503: {"detail": "OpenAI server is busy, try again later"}})

async def session_summary_stream(projectId: int, sessionId: int, eventList: declarations.EventList):
    key_id = str(sessionId)
    return StreamingResponse(summarize_stream(sessionId, projectId, key_id, eventList), media_type="text/event-stream")

