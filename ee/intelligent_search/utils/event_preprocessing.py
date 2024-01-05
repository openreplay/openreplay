from utils.declarations import EventList
from utils.helpers import duration_to_text, find_closest_timestamp, \
        percentage_to_text, url_reducer, create_table


def preprocess_events(event_list: EventList, sessionStartTimestamp=None, sessionDuration=None):
    if not sessionStartTimestamp:
        sessionStartTimestamp = event_list.data['events'][0]['timestamp']
    if not sessionDuration:
        sessionEndTimestamp = event_list.data['events'][-1]['timestamp']
        sessionDuration = sessionEndTimestamp - sessionStartTimestamp
    else:
        sessionEndTimestamp = sessionStartTimestamp + sessionDuration
    ordered_page_event = list()
    ordered_click_event = list()
    for (i, ce) in enumerate(event_list.data['events']):
        if ce['type'] == "LOCATION":
            ordered_page_event.append((i,ce))
        elif ce['type'] == "CLICK":
            ordered_click_event.append((i,ce))
        else:
            continue
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
    if n_events > 1:
        if ordered_page_event[n_events-1][1]['url'] not in spentTimeDict.keys():
            spentTimeDict[ordered_page_event[n_events-1][1]['url']] = sessionEndTimestamp - ordered_page_event[n_events-2][1]['timestamp']
        else:
            spentTimeDict[ordered_page_event[n_events-1][1]['url']] += sessionEndTimestamp - ordered_page_event[n_events-2][1]['timestamp']
        total_time += sessionEndTimestamp - ordered_page_event[n_events-2][1]['timestamp']
    else:
        spentTimeDict[ordered_page_event[0][1]['url']] = sessionDuration
        total_time = sessionDuration
    pageSpentTime = [(k, int(100*v/total_time)) for (k,v) in spentTimeDict.items()]
    pageSpentTime = sorted(pageSpentTime, key=lambda k: k[1], reverse=True)[:3]
    for error in event_list.data['errors']:
        if error['source']=='js_exception':
            error['js_error'] = f"{error['name']}: {error['message']}"
            # Find a best way to do this
            closest_click = find_closest_timestamp([k[1] for k in ordered_click_event], error['timestamp'])
            if not closest_click:
                error['closest_click_label'] = None
            elif error['timestamp'] - closest_click['timestamp'] < 2000:
                error['closest_click_label'] = closest_click['label']
            else:
                error['closest_click_label'] = None
    issuesDict = create_table(event_list.data['issues'], [k[1] for k in ordered_page_event], primary_key='type', allowed_elements=event_list.issueTypes, extra_keys=['contextString'])
    errorsDict = create_table(event_list.data['errors'], [k[1] for k in ordered_page_event], primary_key='source', allowed_elements=event_list.errorTypes, extra_keys=['js_error', 'stack', 'closest_click_label'])
    user_behaviour = ""
    if ordered_page_event[0][1]['referrer']:
        user_behaviour += f"User started navigation from page: `{ordered_page_event[0][1]['url']}` via the referral {ordered_page_event[0][1]['referrer']} and ending in the page: {ordered_page_event[-1][1]['url']}."
    else:
        user_behaviour += f"User started navigation from site: `{ordered_page_event[0][1]['url']}`, and ended in: {ordered_page_event[-1][1]['url']}."
    user_behaviour += f" They visited {len(spentTimeDict)} pages during the session. The session lasted {duration_to_text(sessionDuration//1000)}. "
    if pageSpentTime[0][1] > 0.6:
        user_behaviour += f'The user spent most of the time in the page: `{pageSpentTime[0][0]}` ({percentage_to_text(pageSpentTime[0][1])}).'
    elif pageSpentTime[0][1] + pageSpentTime[1][1] > 0.80:
        user_behaviour += f'The user spent most of the time in the pages: `{pageSpentTime[0][0]}` ({percentage_to_text(pageSpentTime[0][1])}), `{pageSpentTime[1][0]}` ({percentage_to_text(pageSpentTime[1][1])}).'
    elif pageSpentTime[0][1] + pageSpentTime[1][1] + pageSpentTime[2][1] > 0.75:
        user_behaviour += f'The user spent of the time in the pages: `{pageSpentTime[0][0]}` ({percentage_to_text(pageSpentTime[0][1])}), `{pageSpentTime[1][0]}` ({percentage_to_text(pageSpentTime[1][1])}), `{pageSpentTime[2][0]}` ({percentage_to_text(pageSpentTime[2][1])}).'
    else:
        user_behaviour += 'The user spent a similar amount of time among all the pages.'
    mostRagedButton = None
    mostBuggyPage = None
    mostFailedRequest = None
    for issue_name, values in issuesDict['object'].items():
        if issue_name == 'click_rage':
            mostRagedButton = sorted(values['contextString'], key=lambda k: k[1], reverse=True)[:1]
        if issue_name == 'mouse_thrashing':
            mostBuggyPage = sorted(values['contextString'], key=lambda k: k[1], reverse=True)[:1]
        if issue_name == 'bad_request':
            mostFailedRequest = sorted(values['contextString'], key=lambda k: k[1], reverse=True)[:1]
    mostCommonJSException = None
    mostCommonButtonException = None
    for error_name, values in errorsDict['object'].items():
        if error_name == 'js_exception':
            mostCommonJSException = sorted(values['js_error'], key=lambda k: k[1], reverse=True)[:1]
            mostCommonButtonException = sorted(values['closest_click_label'], key=lambda k: k[1], reverse=True)[:2]

    sessionIssues = ""
    if mostRagedButton:
        sessionIssues += f"There were click rages in the button `{mostRagedButton[0][0]}` {mostRagedButton[0][1]} times during the session. "
    if mostBuggyPage:
        sessionIssues += f"Erratic movements were noticed, indication possible confusion or annoyance, primarly on page `{mostBuggyPage[0][0]}`. "
    if mostFailedRequest:
        sessionIssues += f"There were some failed network requests to `{url_reducer(mostFailedRequest[0][0])}`. "
    sessionErrors = ""
    if mostCommonJSException:
        sessionErrors += f"The most common JS Exception during the session was `{mostCommonJSException[0][0]}` occurring {mostCommonJSException[0][1]} times."
    if mostCommonButtonException:
        if not mostCommonButtonException[0][0] and len(mostCommonButtonException) == 2:
            sessionErrors += f"The button that generated the most JS Exceptions is `{mostCommonButtonException[1][0]}`."
        elif mostCommonButtonException[0][0]:
            sessionErrors += f"The button that generated the most JS Exceptions is `{mostCommonButtonException[0][0]}`."
    return {"userBehaviour": user_behaviour,
           "IssuesAndErrors": sessionIssues + sessionErrors,}
            #"sessionErrors": sessionErrors}


def split_events_selection_filter(data: EventList, sessionStartTimestamp=None, sessionDuration=None):
    event_insights = preprocess_events(data, sessionStartTimestamp=sessionStartTimestamp, sessionDuration=sessionDuration)
    return [event_insights]

