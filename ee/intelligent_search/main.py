from utils.prompts import FilterPrompt
from utils import parameters
import asyncio

from fastapi import FastAPI
from contextlib import asynccontextmanager

from routers import local, endpoint
from core.llm_handler import llm_handler
from utils.module_handler import torch_available


@asynccontextmanager
async def lifespan(app: FastAPI):
    if torch_available:
        llm_handler.build_llm(ckpt_dir=parameters.ckpt_dir,
                  tokenizer_path=parameters.tokenizer_path,
                  max_seq_len=parameters.max_seq_len,
                  max_batch_size=parameters.max_batch_size)
        asyncio.create_task(llm_handler.llm_model.process_queue_anyscale(FilterPrompt.filter_chat_v3))
    # asyncio.create_task(llm_handler.llm_endpoint.process_queue_anyscale(FilterPrompt.filter_chat_v3))
    yield
    if torch_available:
        llm_handler.clear()

app = FastAPI(lifespan=lifespan)
if torch_available:
    app.include_router(local.router)
app.include_router(endpoint.router)


@app.get('/')
async def health():
    return {'status': 200}

