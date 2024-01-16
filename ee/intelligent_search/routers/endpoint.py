from fastapi import Depends, APIRouter
from fastapi.responses import StreamingResponse
from time import time
from utils import declarations
from auth.auth_key import api_key_auth
from utils.prompts import FilterPrompt, ChartPrompt
from utils.helpers import filter_sql_where_statement, filter_code_markdown
from utils.llm_call import Completion
from utils.event_preprocessing import split_events_selection_filter


router = APIRouter()


@router.get('/autocomplete/filters', dependencies=[Depends(api_key_auth)])
@router.post('/autocomplete/filters', dependencies=[Depends(api_key_auth)])
async def direct_filter_call(msg: declarations.LLMQuestion):
    """Return filters for session search based on an input question/statement.
    Endpoint /autocomplete/filters
    - Payload:
        - userId: int
        - projectId: int
        - question: str
    - Response:
        - content: str
        - raw_response: str
        - inference_time: int
    """
    anyscale = Completion()
    messages = FilterPrompt.filter_chat_v5[:-1] + [{"role": "user", "content": FilterPrompt.filter_chat_v5[-1]['content'].format(user_question=msg.question)}]
    t = time()
    result = await anyscale.send_async_request(
            messages=messages,
            context=FilterPrompt.filter_context)
    processed = filter_sql_where_statement(result.replace('\n', ' '))
    return {'content': processed, 'raw_response': result, 'inference_time': time()-t}

@router.get('/autocomplete/charts', dependencies=[Depends(api_key_auth)])
@router.post('/autocomplete/charts', dependencies=[Depends(api_key_auth)])
async def direct_chart_call(msg: declarations.LLMQuestion):
    """Generate a chart with its attributes and filters based on an input question/statement.
    Endpoint /autocomplete/charts
    - Payload:
        - userId: int
        - projectId: int
        - question: str
    - Response:
        - content: str
        - raw_response: str
        - inference_time: int
    """
    anyscale = Completion()
    messages = [{"role": "system", "content": ChartPrompt.chart_context}] + ChartPrompt.chart_chat_v3 + [{"role": "user", "content": msg.question}]
    t = time()
    result = await anyscale.send_async_request(messages=messages)
    processed = filter_code_markdown(result)
    return {'content': processed, 'raw_response': result, 'inference_time': time()-t}

@router.get('/summary/session', dependencies=[Depends(api_key_auth)])
@router.post('/summary/session', dependencies=[Depends(api_key_auth)])
async def direct_summary_call(event_list: declarations.EventList):
    """Creates a summary based on the events given in the payload (session events). Could be filtered by event type and issue type.
    Endpoint /summary/session
    - Payload:
        - data: dict
            - events
            - issues
            - stackEvents
            - errors
            - userEvents
            - resources
        - eventTypes: Optional[LIST[CLICK, LOCATION, INPUT, TAP, VIEW, SWIPE]]
        - issueTypes: Optional[LIST[click_rage, dead_click, bad_request, missing_resource, memory, cpu, custom, mouse_thrashing]]
    - Response:
        - Stream [str]
    """
    anyscale = Completion()
    event_insights = split_events_selection_filter(event_list, sessionStartTimestamp=event_list.sessionStartTimestamp, sessionDuration=event_list.sessionDuration)
    return StreamingResponse(anyscale.send_async_stream_request(str(event_insights)))

