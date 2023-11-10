from utils.declarations import EventList


click_event_properties = [
        'timestamp',
        'path',
        'url',
        'label',
#         'hesitation',
        'type'
        ]
page_event_properties = [
        'timestamp',
#        'timeToInteractive',
        'type',
        'referrer',
        'query',
        'path',
        'host',
        'spentTime'
        ]


def split_events_selection(data):
    events = data.data['events']
    selection = data.eventTypes
    click_events = [k for k in events if k['type'] in selection]
    click_events = [{s: k[s] for s in ['timestamp', 'path', 'url', 'label', 'hesitation', 'type']} for k in click_events if k['type']=='CLICK'] \
                   + [{s: k[s] for s in ['timestamp', 'timeToInteractive', 'type', 'referrer', 'query', 'path', 'host']}
                      for k in click_events if k['type']=='LOCATION'] \
                   + [d for d in click_events if d['type'] not in ['CLICK', 'LOCATION']]
    # From click_events you can ask 'to explain what user was doing in the webpage'
    issues = [{s: k[s] for s in ['timestamp', 'payload', 'type']} for k in data.data['issues']]
    errors = data.data['errors']
    # From errors you can ask based on the errors what could be the possible issue and what could be a solution
    return click_events, errors, issues


def split_events_selection_filter(data, max_click_events=10, max_page_events=10):
    click_events, page_event = preprocess_events(data, max_click_events=max_click_events, max_page_events=max_page_events)
    event_list = [{s: k[s] for s in click_event_properties} for k in click_events] \
               + [{s: k[s] for s in page_event_properties} for k in page_event]
    issues = [{s: k[s] for s in ['timestamp', 'payload', 'type']} for k in data.data['issues']]
    ###### TEST
    event_list = sorted(event_list + issues, key=lambda k: k['timestamp'])
    for event in event_list:
        event.pop('timestamp')
    ######
    errors = data.data['errors']
    # From errors you can ask based on the errors what could be the possible issue and what could be a solution
    return event_list, errors, issues


def preprocess_events(event_list: EventList, max_click_events=10, max_page_events=10):
    ordered_click_events = [(i, ce) for (i,ce) in enumerate(event_list.data['events']) if ce['type']=="CLICK"]
    ordered_page_event = [(i, pe) for (i,pe) in enumerate(event_list.data['events']) if pe['type']=="LOCATION"]
    ordered_click_events = sorted(ordered_click_events, key=lambda k: k[1]['hesitation'], reverse=True)[:max_click_events]
    #TODO order the pages by how long they stayed
    for i in range(len(ordered_page_event)-1):
        delta_time = ordered_page_event[i+1][1]['timestamp'] - ordered_page_event[i][1]['timestamp']
        ordered_page_event[i][1]['spentTime'] = delta_time
    ordered_page_event[-1][1]['spentTime'] = None
    last_page = ordered_page_event[-1][1]
    ordered_page_event = sorted(ordered_page_event[:-1], key=lambda k: k[1]['spentTime'], reverse=True)[:max_page_events]

    ordered_page_event = [l[1] for l in sorted(ordered_page_event, key=lambda k: k[0])] + [last_page]
    ordered_click_events = [l[1] for l in sorted(ordered_click_events, key=lambda k: k[0])]
    return ordered_click_events, ordered_page_event

