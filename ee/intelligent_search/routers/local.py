from fastapi import Depends, APIRouter
from time import time
from utils import declarations
from utils.helpers import filter_sql_where_statement
from auth.auth_key import api_key_auth
from core.llm_handler import llm_handler


router = APIRouter()


@router.post("/llm/local", dependencies=[Depends(api_key_auth)])
async def predict_local(msg: declarations.LLMQuestion):
    question = msg.question
    t1 = time()
    result = await llm_handler.llm_model.send_question(
            question=question,
            key_id=10*msg.userId + msg.projectId)
    t2 = time()
    processed = filter_sql_where_statement(result)
    return {"content": processed, "raw_response": result, "inference_time": t2-t1}

