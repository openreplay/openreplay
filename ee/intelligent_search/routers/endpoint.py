from fastapi import Depends, APIRouter
from fastapi.responses import StreamingResponse
from time import time
from utils import declarations
from auth.auth_key import api_key_auth
from utils.prompts import FilterPrompt, ChartPrompt
from utils.helpers import filter_sql_where_statement
from utils.llm_call import Completion
from core.llm_handler import llm_handler


from utils.event_preprocessing import split_events_selection_filter


router = APIRouter()

@router.post("/llm/anyscale", dependencies=[Depends(api_key_auth)])
async def predict_anyscale(msg: declarations.LLMQuestion):
    question = msg.question
    t1 = time()
    result = await llm_handler.llm_endpoint.send_question(
            question=question,
            key_id=10*msg.userId + msg.projectId)
    t2 = time()
    processed = filter_sql_where_statement(result)
    return {"content": processed, "raw_response": result, "inference_time": t2-t1}

@router.get('/autocomplete/filters', dependencies=[Depends(api_key_auth)])
@router.post('/autocomplete/filters', dependencies=[Depends(api_key_auth)])
async def direct_filter_call(msg: declarations.LLMQuestion):
    anyscale = Completion()
    message = FilterPrompt.search_context_v3.format(user_question=msg.question)
    result = await anyscale.send_async_request(message=message)
    processed = filter_sql_where_statement(result)
    return {'content': processed, 'raw_response': result}

@router.get('/autocomplete/charts', dependencies=[Depends(api_key_auth)])
@router.post('/autocomplete/charts', dependencies=[Depends(api_key_auth)])
async def direct_chart_call(msg: declarations.LLMQuestion):
    anyscale = Completion()
    message = ChartPrompt.chart_context_v2.format(user_question=msg.question)
    result = await anyscale.send_async_request(message=message)
    processed = None
    return {'content': processed, 'raw_response': result}

@router.get('/summary/session', dependencies=[Depends(api_key_auth)])
@router.post('/summary/session', dependencies=[Depends(api_key_auth)])
async def direct_summary_call(event_list: declarations.EventList):
    anyscale = Completion()
    event_insights = split_events_selection_filter(event_list, sessionStartTimestamp=event_list.sessionStartTimestamp, sessionDuration=event_list.sessionDuration)
    return StreamingResponse(anyscale.send_async_stream_request(str(event_insights)))

