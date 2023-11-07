import re


def split_events(data):
    events = data.data['events']
    click_events = [k for k in events if k['type']=='CLICK' or k['type']=='LOCATION']
    click_events = [{s: k[s] for s in ['path', 'url', 'label', 'hesitation', 'type']} for k in click_events if k['type']=='CLICK'] \
                   + [{s: k[s] for s in ['timeToInteractive', 'type', 'referrer', 'query', 'path', 'host']}
                      for k in click_events if k['type']=='LOCATION']
    # From click_events you can ask 'to explain what user was doing in the webpage'
    issues = data.data['issues']
    errors = data.data['errors']
    # From errors you can ask based on the errors what could be the possible issue and what could be a solution
    return click_events, errors, issues

def process_llm_response(response):
    numeration = re.compile('[0-9]+\..*')
    return '\n'.join(numeration.findall(response))


def split_events_selection(data):
    events = data.data['events']
    selection = data.eventTypes
    click_events = [k for k in events if k['type'] in selection]
    click_events = [{s: k[s] for s in ['path', 'url', 'label', 'hesitation', 'type']} for k in click_events if k['type']=='CLICK'] \
                   + [{s: k[s] for s in ['timeToInteractive', 'type', 'referrer', 'query', 'path', 'host']}
                      for k in click_events if k['type']=='LOCATION'] \
                   + [d for d in click_events if d['type'] not in ['CLICK', 'LOCATION']]
    # From click_events you can ask 'to explain what user was doing in the webpage'
    issues = data.data['issues']
    errors = data.data['errors']
    # From errors you can ask based on the errors what could be the possible issue and what could be a solution
    return click_events, errors, issues

