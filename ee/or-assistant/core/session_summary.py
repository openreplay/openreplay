from utils.llm_request import Completion, call_endpoint
from utils.events_split import split_events_selection
from utils.params import LLM_URL
from utils.declarations import EventList

LLM_Completion = Completion(LLM_URL)

def summarize(sessionId: int, projectId: int, eventList: EventList):
    params = {}
    # call_endpoint(CHALICE_ENDPOINT.format(projectId=projectId, sessionId=sessionId), **params) # What params should I call to get response from chalice ??? auth??

def summarize_stream(sessionId: int, projectId: int, event_list: EventList):
    params = {}
    click_events, _errors, _issues = split_events_selection(event_list)
    completion_stream = LLM_Completion.process_large_input(click_events, filter_response=event_list.filter, context=event_list.context)
    for completion_response in completion_stream:
        yield completion_response

