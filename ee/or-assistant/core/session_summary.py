from utils.llm_request import Completion, call_endpoint
from utils.event_preprocessing import split_events_selection, split_events_selection_filter, split_events_selection_filter2
from utils.params import LLM_URL
from utils.declarations import EventList
from time import time
import hashlib

LLM_Completion = Completion(LLM_URL)


def summarize_stream(sessionId: int, projectId: int, key_id: str, event_list: EventList):
    m = hashlib.sha256()
    key_id = f'{key_id}{time()}'
    m.update(bytes(key_id, 'utf-8'))
    if event_list.limitEvents:
        click_events, _errors, _issues = split_events_selection_filter2(event_list, max_click_events=event_list.maxClickEvents, max_page_events=event_list.maxPageEvents, sessionStartTimestamp=event_list.sessionStartTimestamp, sessionDuration=event_list.sessionDuration)
    else:
        click_events, _errors, _issues = split_events_selection(event_list)
    completion_stream = LLM_Completion.process_large_input(click_events,
                                                           key_id=m.hexdigest(),
                                                           filter_response=event_list.filter,
                                                           # context=event_list.context,
                                                           raw=event_list.raw)
    for completion_response in completion_stream:
        yield completion_response

