from utils.declarations import EventList
from utils.helpers import find_closest_timestamp

click_event_properties = [
        'timestamp',
        'path',
        'url',
#         'label',
#         'hesitation',
        'type'
        ]
page_event_properties = [
        'timestamp',
#        'timeToInteractive',
        'type',
        'referrer',
#         'query',
        'path',
        'host',
#         'spentTime',
        'pageTimeShare'
        ]


def split_events_selection(data: EventList):
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
    click_events = sorted(click_events, key=lambda k: k['timestamp'])
    for c_event in click_events:
        c_event.pop('timestamp')
    # From errors you can ask based on the errors what could be the possible issue and what could be a solution
    return click_events, errors, issues


def split_events_selection_filter(data: EventList, max_click_events: int = 10, max_page_events: int = 10):
    click_events, page_event = preprocess_events(data, max_click_events=max_click_events, max_page_events=max_page_events)
    event_list = [{s: k[s] for s in click_event_properties} for k in click_events] \
               + [{s: k[s] for s in page_event_properties} for k in page_event]
    issues = [{s: k[s] for s in ['timestamp', 'payload', 'type']} for k in data.data['issues']]
    #event_list = sorted(event_list + issues, key=lambda k: k['timestamp'])
    event_list = sorted(event_list, key=lambda k: k['timestamp'])
    for event in event_list:
        event.pop('timestamp')
    errors = data.data['errors']
    # From errors you can ask based on the errors what could be the possible issue and what could be a solution
    return event_list, errors, issues


def preprocess_events(event_list: EventList, max_click_events: int = 10, max_page_events: int = 10):
    ordered_click_events = [(i, ce) for (i,ce) in enumerate(event_list.data['events']) if ce['type']=="CLICK"]
    ordered_page_event = [(i, pe) for (i,pe) in enumerate(event_list.data['events']) if pe['type']=="LOCATION"]
    ordered_click_events = sorted(ordered_click_events, key=lambda k: k[1]['hesitation'], reverse=True)[:max_click_events]
    total_time = 0
    for i in range(len(ordered_page_event)-1):
        delta_time = ordered_page_event[i+1][1]['timestamp'] - ordered_page_event[i][1]['timestamp']
        ordered_page_event[i][1]['spentTime'] = delta_time
        total_time += delta_time
    ordered_page_event[-1][1]['spentTime'] = None
    ordered_page_event[-1][1]['pageTimeShare'] = None
    for i in range(len(ordered_page_event)-1):
        ordered_page_event[i][1]['pageTimeShare'] = f"{100 * ordered_page_event[i][1]['spentTime'] / total_time:.1f}%"
    last_page = ordered_page_event[-1][1]
    ordered_page_event = sorted(ordered_page_event[:-1], key=lambda k: k[1]['spentTime'], reverse=True)[:max_page_events]
    ordered_page_event = [l[1] for l in sorted(ordered_page_event, key=lambda k: k[0])] + [last_page]
    ordered_click_events = [l[1] for l in sorted(ordered_click_events, key=lambda k: k[0])]
    return ordered_click_events, ordered_page_event


def preprocess_events2(event_list: EventList, max_click_events: int = 10, max_page_events: int = 10, sessionStartTimestamp=None, sessionDuration=None):
    if not sessionStartTimestamp:
        sessionStartTimestamp = event_list.data['events'][0]['timestamp']
    if not sessionDuration:
        sessionEndTimestamp = event_list.data['events'][-1]['timestamp']
    else:
        sessionEndTimestamp = sessionStartTimestamp + sessionDuration
    # TODO: Get insights from clickEvents (maybe hesitation time)
    ordered_click_events = list()
    ordered_page_event = list()
    for (i, ce) in enumerate(event_list.data['events']):
        if ce['type'] == "CLICK":
            ordered_click_events.append((i,ce))
        elif ce['type'] == "LOCATION":
            ordered_page_event.append((i,ce))
        else:
            continue
    ordered_click_events = sorted(ordered_click_events, key=lambda k: k[1]['hesitation'], reverse=True)
    total_time = 0
    n_events = len(ordered_page_event)
    spentTimeDict = dict()
    for i in range(n_events-1):
        delta_time = ordered_page_event[i+1][1]['timestamp'] - ordered_page_event[i][1]['timestamp']
        ordered_page_event[i][1]['spentTime'] = delta_time
        if ordered_page_event[i][1]['url'] not in spentTimeDict.keys():
            spentTimeDict[ordered_page_event[i][1]['url']] = delta_time
        else:
            spentTimeDict[ordered_page_event[i][1]['url']] += delta_time
        total_time += delta_time

    sessionDuration = (sessionEndTimestamp - ordered_page_event[0][1]['timestamp']) // 1000
    hours = sessionDuration // 3600
    sessionDuration -= 3600*hours
    minutes = sessionDuration // 60
    seconds = sessionDuration % 60
    sessionStats = {'sessionDuration': f'{hours} hours, {minutes} min, {seconds} sec', 'pagesVisited': len(spentTimeDict)}

    pageSpentTime = [(k, int(100*v/total_time)) for (k,v) in spentTimeDict.items()]
    pageSpentTime = sorted(pageSpentTime, key=lambda k: k[1], reverse=True)[:3]
    if pageSpentTime[0][1] > 0.6:
        sessionStats['mostTimeSharePages'] = f'The user spent most of the time in the page: {pageSpentTime[0][0]} ({pageSpentTime[0][1]}%)'
    elif pageSpentTime[0][1] + pageSpentTime[1][1] > 0.80:
        sessionStats['mostTimeSharePages'] = f'The user spent most of the time in the pages: {pageSpentTime[0][0]} ({pageSpentTime[0][1]}%), {pageSpentTime[1][0]} ({pageSpentTime[1][1]}%)'
    elif pageSpentTime[0][1] + pageSpentTime[1][1] + pageSpentTime[2][1] > 0.75:
        sessionStats['mostTimeSharePages'] = f'The user spent of the time in the pages: {pageSpentTime[0][0]} ({pageSpentTime[0][1]}%), {pageSpentTime[1][0]} ({pageSpentTime[1][1]}%), {pageSpentTime[2][0]} ({pageSpentTime[2][1]}%)'
    else:
        sessionStats['mostTimeSharePages'] = 'The user spent a similar amount of time among all the pages'
    sessionStats = [sessionStats]
    spentTimeList = [{'url': k, 'pageTimeShare': f'{100 * v / total_time:.1f}%'} for k,v in spentTimeDict.items()]
    issueStats = {'url': dict(), 'issue': dict()}
    for issue in event_list.data['issues']:
        if issue['type'] not in event_list.issueTypes:
            continue
        timestamp = issue['timestamp']
        closestPageEvent = find_closest_timestamp([k[1] for k in ordered_page_event], timestamp)
        if issue['type'] not in issueStats['issue'].keys():
            issueStats['issue'][issue['type']] = 1
        else:
            issueStats['issue'][issue['type']] += 1
        if closestPageEvent:
            if closestPageEvent['url'] not in issueStats['url'].keys():
                issueStats['url'][closestPageEvent['url']] = {k.name:0 for k in event_list.issueTypes}
                issueStats['url'][closestPageEvent['url']]['totalIssues'] = 0
            issueStats['url'][closestPageEvent['url']][issue['type']] += 1
            issueStats['url'][closestPageEvent['url']]['totalIssues'] += 1
        else:
            continue
    # TODO: The most buggy page and the most common issue (with number)
    top3issues = sorted(issueStats['issue'].items(), key=lambda k: k[1], reverse=True)[:3] # Verify that issue > 0 (?)
    top3issues = [k[0] for k in top3issues]
    topIssuePage = max(issueStats['url'].items(), key=lambda k: k[1]['totalIssues'])
    topIssuePage[1].pop('totalIssues')
    # type of issues
    return sessionStats, spentTimeList, [{'mostCommonIssues': 'The user incounter the following issues during the session: ' + ' issue, '.join(top3issues) + ' issue', 'pageWithMostIssues': f"The page with most issues during the session is: {topIssuePage[0]} ({100 * spentTimeDict[topIssuePage[0]] / total_time:.1f}% page share) with the following issues: {' issue , '.join([k for (k,v) in topIssuePage[1].items() if v > 0])} issue"}]


def split_events_selection_filter2(data: EventList, max_click_events: int = 10, max_page_events: int = 10, sessionStartTimestamp=None, sessionDuration=None):
    sessionStats, page_event, issues = preprocess_events2(data, max_click_events=max_click_events, max_page_events=max_page_events, sessionStartTimestamp=sessionStartTimestamp, sessionDuration=sessionDuration)
    event_list = []#[{s: k[s] for s in ['url', 'pageTimeShare']} for k in page_event]
    errors = data.data['errors']
    print(sessionStats + event_list + errors + issues)
    return sessionStats + event_list + errors + issues, None, None

