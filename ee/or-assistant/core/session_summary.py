from utils.llm_request import Completion 
from utils.event_preprocessing import split_events_selection_filter
from utils.params import LLM_URL
from utils.declarations import EventList
from time import time
import hashlib

LLM_Completion = Completion(LLM_URL)


def summarize_stream(sessionId: int, projectId: int, key_id: str, event_list: EventList):
    m = hashlib.sha256()
    key_id = f'{key_id}{time()}'
    m.update(bytes(key_id, 'utf-8'))
    event_insights = split_events_selection_filter(event_list, sessionStartTimestamp=event_list.sessionStartTimestamp, sessionDuration=event_list.sessionDuration)
    completion_stream = LLM_Completion.process_large_input(event_insights,
                                                           key_id=m.hexdigest(),
                                                           )
    for completion_response in completion_stream:
        yield completion_response

