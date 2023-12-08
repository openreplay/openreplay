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

