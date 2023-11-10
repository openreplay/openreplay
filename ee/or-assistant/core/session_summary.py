from utils.llm_request import Completion, call_endpoint
from utils.event_preprocessing import split_events_selection, split_events_selection_filter
from utils.params import LLM_URL
from utils.declarations import EventList

LLM_Completion = Completion(LLM_URL)


def summarize_stream(sessionId: int, projectId: int, event_list: EventList):
    params = {}
    if event_list.limitEvents:
        click_events, _errors, _issues = split_events_selection_filter(event_list, max_click_events=event_list.maxClickEvents, max_page_events=event_list.maxPageEvents)
    else:
        click_events, _errors, _issues = split_events_selection(event_list)
    completion_stream = LLM_Completion.process_large_input(click_events,
                                                           filter_response=event_list.filter,
                                                           # context=event_list.context,
                                                           raw=event_list.raw)
    for completion_response in completion_stream:
        yield completion_response

