from typing import List, Union, Tuple


def find_closest_timestamp(ordered_events, timestamp, list_length=None, previous_value=None):
    if not list_length:
        list_length = len(ordered_events)
    middle = list_length // 2
    if middle == 0 and ordered_events[0]['timestamp'] < timestamp:
        return ordered_events[0]
    elif middle == 0:
        return previous_value
    value = ordered_events[middle]
    if value['timestamp'] > timestamp:
        return find_closest_timestamp(ordered_events[:middle], timestamp, list_length = middle, previous_value=previous_value)
    elif value['timestamp'] < timestamp:
        return find_closest_timestamp(ordered_events[middle:], timestamp, list_length=None, previous_value=value)
    else:
        return value

def duration_to_text(sessionDuration: int):
    hours = sessionDuration // 3600
    sessionDuration -= 3600*hours
    minutes = sessionDuration // 60
    seconds = sessionDuration % 60
    if minutes > 0 and seconds > 30:
        minutes += 1
        seconds = 0
    if minutes >= 50:
        hours += 1
        minutes = 0
        seconds = 0
    elif hours > 0 and minutes < 20:
        minutes = 0
        seconds = 0
    if hours == 0 and minutes > 0:
        return f'around {minutes} minute(s)'
    elif hours == 0 and minutes == 0:
        return f'{seconds} second(s)'
    elif minutes > 0:
        return f'around {hours}.5 hours'
    else:
        return f'around {hours} hour(s)'


def url_reducer(url: str):
    splitted_url = url.split('/')
    if len(splitted_url) <= 3:
        return url
    elif len(url) < 30:
        return url
    return '/'.join(splitted_url[:3])+'/[...]'

def percentage_to_text(percentage: float):
    if percentage < 1:
        return '< 1%'
    else:
        return f'~{int(percentage)}%'

def join_values(elements: List[Tuple[object, int]], new_value: object):
    for i in range(len(elements)):
        if new_value == elements[i][0]:
            elements[i] = (new_value, elements[i][1]+1)
            return elements
    return elements + [(new_value, 1)]

def create_table(list_of_objects, ordered_pagevent_list, allowed_elements, primary_key:str='type', extra_keys:List[str]=[]):
    url_n_object_table = {'url': dict(), 'object': dict()}
    for element in list_of_objects:
        if element[primary_key] not in allowed_elements:
            continue
        element_timestamp = element['timestamp']
        closestPageEvent = find_closest_timestamp(ordered_pagevent_list, element_timestamp)
        if not closestPageEvent:
            continue
        if closestPageEvent['url'] not in url_n_object_table['url'].keys():
            url_n_object_table['url'][closestPageEvent['url']] = {k.name:0 for k in allowed_elements} | {'total': 0}
        url_n_object_table['url'][closestPageEvent['url']][element[primary_key]] += 1
        url_n_object_table['url'][closestPageEvent['url']]['total'] += 1
        if not extra_keys:
            continue
        if element[primary_key] not in url_n_object_table['object'].keys():
            url_n_object_table['object'][element[primary_key]] = {k: [(element[k], 1)] for k in extra_keys} | {'count': 1}
        else:
            tmp = url_n_object_table['object'][element[primary_key]]
            url_n_object_table['object'][element[primary_key]] = {k: join_values(tmp[k], element[k]) for k in extra_keys} | {'count': tmp['count'] + 1}
    return url_n_object_table

