"""
Representations of Kafka messages
"""
from abc import ABC


class Message(ABC):
    pass


class Timestamp(Message):
    __id__ = 0

    def __init__(self, timestamp):
        self.timestamp = timestamp


class SessionStart(Message):
    __id__ = 1

    def __init__(self, timestamp, project_id, tracker_version, rev_id, user_uuid,
                 user_agent, user_os, user_os_version, user_browser, user_browser_version,
                 user_device, user_device_type, user_device_memory_size, user_device_heap_size,
                 user_country):
        self.timestamp = timestamp
        self.project_id = project_id
        self.tracker_version = tracker_version
        self.rev_id = rev_id
        self.user_uuid = user_uuid
        self.user_agent = user_agent
        self.user_os = user_os
        self.user_os_version = user_os_version
        self.user_browser = user_browser
        self.user_browser_version = user_browser_version
        self.user_device = user_device
        self.user_device_type = user_device_type
        self.user_device_memory_size = user_device_memory_size
        self.user_device_heap_size = user_device_heap_size
        self.user_country = user_country


class SessionDisconnect(Message):
    __id__ = 2

    def __init__(self, timestamp):
        self.timestamp = timestamp


class SessionEnd(Message):
    __id__ = 3
    __name__ = 'SessionEnd'

    def __init__(self, timestamp):
        self.timestamp = timestamp


class SetPageLocation(Message):
    __id__ = 4

    def __init__(self, url, referrer, navigation_start):
        self.url = url
        self.referrer = referrer
        self.navigation_start = navigation_start


class SetViewportSize(Message):
    __id__ = 5

    def __init__(self, width, height):
        self.width = width
        self.height = height


class SetViewportScroll(Message):
    __id__ = 6

    def __init__(self, x, y):
        self.x = x
        self.y = y


class CreateDocument(Message):
    __id__ = 7


class CreateElementNode(Message):
    __id__ = 8

    def __init__(self, id, parent_id, index, tag, svg):
        self.id = id
        self.parent_id = parent_id,
        self.index = index
        self.tag = tag
        self.svg = svg


class CreateTextNode(Message):
    __id__ = 9

    def __init__(self, id, parent_id, index):
        self.id = id
        self.parent_id = parent_id
        self.index = index


class MoveNode(Message):
    __id__ = 10

    def __init__(self, id, parent_id, index):
        self.id = id
        self.parent_id = parent_id
        self.index = index


class RemoveNode(Message):
    __id__ = 11

    def __init__(self, id):
        self.id = id


class SetNodeAttribute(Message):
    __id__ = 12

    def __init__(self, id, name: str, value: str):
        self.id = id
        self.name = name
        self.value = value


class RemoveNodeAttribute(Message):
    __id__ = 13

    def __init__(self, id, name: str):
        self.id = id
        self.name = name


class SetNodeData(Message):
    __id__ = 14

    def __init__(self, id, data: str):
        self.id = id
        self.data = data


class SetCSSData(Message):
    __id__ = 15

    def __init__(self, id, data: str):
        self.id = id
        self.data = data


class SetNodeScroll(Message):
    __id__ = 16

    def __init__(self, id, x: int, y: int):
        self.id = id
        self.x = x
        self.y = y


class SetInputTarget(Message):
    __id__ = 17

    def __init__(self, id, label: str):
        self.id = id
        self.label = label


class SetInputValue(Message):
    __id__ = 18

    def __init__(self, id, value: str, mask: int):
        self.id = id
        self.value = value
        self.mask = mask


class SetInputChecked(Message):
    __id__ = 19

    def __init__(self, id, checked: bool):
        self.id = id
        self.checked = checked


class MouseMove(Message):
    __id__ = 20

    def __init__(self, x, y):
        self.x = x
        self.y = y


class MouseClickDepricated(Message):
    __id__ = 21

    def __init__(self, id, hesitation_time, label: str):
        self.id = id
        self.hesitation_time = hesitation_time
        self.label = label


class ConsoleLog(Message):
    __id__ = 22

    def __init__(self, level: str, value: str):
        self.level = level
        self.value = value


class PageLoadTiming(Message):
    __id__ = 23

    def __init__(self, request_start, response_start, response_end, dom_content_loaded_event_start,
                 dom_content_loaded_event_end, load_event_start, load_event_end,
                 first_paint, first_contentful_paint):
        self.request_start = request_start
        self.response_start = response_start
        self.response_end = response_end
        self.dom_content_loaded_event_start = dom_content_loaded_event_start
        self.dom_content_loaded_event_end = dom_content_loaded_event_end
        self.load_event_start = load_event_start
        self.load_event_end = load_event_end
        self.first_paint = first_paint
        self.first_contentful_paint = first_contentful_paint


class PageRenderTiming(Message):
    __id__ = 24

    def __init__(self, speed_index, visually_complete, time_to_interactive):
        self.speed_index = speed_index
        self.visually_complete = visually_complete
        self.time_to_interactive = time_to_interactive

class JSException(Message):
    __id__ = 25

    def __init__(self, name: str, message: str, payload: str):
        self.name = name
        self.message = message
        self.payload = payload


class RawErrorEvent(Message):
    __id__ = 26

    def __init__(self, timestamp, source: str, name: str, message: str,
                 payload: str):
        self.timestamp = timestamp
        self.source = source
        self.name = name
        self.message = message
        self.payload = payload


class RawCustomEvent(Message):
    __id__ = 27

    def __init__(self, name: str, payload: str):
        self.name = name
        self.payload = payload


class UserID(Message):
    __id__ = 28

    def __init__(self, id: str):
        self.id = id


class UserAnonymousID(Message):
    __id__ = 29

    def __init__(self, id: str):
        self.id = id


class Metadata(Message):
    __id__ = 30

    def __init__(self, key: str, value: str):
        self.key = key
        self.value = value


class PerformanceTrack(Message):
    __id__ = 49

    def __init__(self, frames: int, ticks: int, total_js_heap_size,
                 used_js_heap_size):
        self.frames = frames
        self.ticks = ticks
        self.total_js_heap_size = total_js_heap_size
        self.used_js_heap_size = used_js_heap_size


class PageEvent(Message):
    __id__ = 31

    def __init__(self, message_id, timestamp, url: str, referrer: str,
                 loaded: bool, request_start, response_start, response_end,
                 dom_content_loaded_event_start, dom_content_loaded_event_end,
                 load_event_start, load_event_end, first_paint, first_contentful_paint,
                 speed_index, visually_complete, time_to_interactive):
        self.message_id = message_id
        self.timestamp = timestamp
        self.url = url
        self.referrer = referrer
        self.loaded = loaded
        self.request_start = request_start
        self.response_start = response_start
        self.response_end = response_end
        self.dom_content_loaded_event_start = dom_content_loaded_event_start
        self.dom_content_loaded_event_end = dom_content_loaded_event_end
        self.load_event_start = load_event_start
        self.load_event_end = load_event_end
        self.first_paint = first_paint
        self.first_contentful_paint = first_contentful_paint
        self.speed_index = speed_index
        self.visually_complete = visually_complete
        self.time_to_interactive = time_to_interactive


class InputEvent(Message):
    __id__ = 32

    def __init__(self, message_id, timestamp, value: str, value_masked: bool, label: str):
        self.message_id = message_id
        self.timestamp = timestamp
        self.value = value
        self.value_masked = value_masked
        self.label = label


class ClickEvent(Message):
    __id__ = 33

    def __init__(self, message_id, timestamp, hesitation_time, label: str):
        self.message_id = message_id
        self.timestamp = timestamp
        self.hesitation_time = hesitation_time
        self.label = label


class ErrorEvent(Message):
    __id__ = 34

    def __init__(self, message_id, timestamp, source: str, name: str, message: str,
                 payload: str):
        self.message_id = message_id
        self.timestamp = timestamp
        self.source = source
        self.name = name
        self.message = message
        self.payload = payload


class ResourceEvent(Message):
    __id__ = 35

    def __init__(self, message_id, timestamp, duration, ttfb, header_size, encoded_body_size,
                 decoded_body_size, url: str, type: str, success: bool, method: str, status):
        self.message_id = message_id
        self.timestamp = timestamp
        self.duration = duration
        self.ttfb = ttfb
        self.header_size = header_size
        self.encoded_body_size = encoded_body_size
        self.decoded_body_size = decoded_body_size
        self.url = url
        self.type = type
        self.success = success
        self.method = method
        self.status = status


class CustomEvent(Message):
    __id__ = 36

    def __init__(self, message_id, timestamp, name: str, payload: str):
        self.message_id = message_id
        self.timestamp = timestamp
        self.name = name
        self.payload = payload


class CSSInsertRule(Message):
    __id__ = 37

    def __init__(self, id, rule: str, index):
        self.id = id
        self.rule = rule
        self.index = index


class CSSDeleteRule(Message):
    __id__ = 38

    def __init__(self, id, index):
        self.id = id
        self.index = index


class Fetch(Message):
    __id__ = 39

    def __init__(self, method: str, url: str, request: str, response: str, status,
                 timestamp, duration):
        self.method = method
        self.url = url
        self.request = request
        self.response = response
        self.status = status
        self.timestamp = timestamp
        self.duration = duration


class Profiler(Message):
    __id__ = 40

    def __init__(self, name: str, duration, args: str, result: str):
        self.name = name
        self.duration = duration
        self.args = args
        self.result = result


class OTable(Message):
    __id__ = 41

    def __init__(self, key: str, value: str):
        self.key = key
        self.value = value


class StateAction(Message):
    __id__ = 42

    def __init__(self, type: str):
        self.type = type


class StateActionEvent(Message):
    __id__ = 43

    def __init__(self, message_id, timestamp, type: str):
        self.message_id = message_id
        self.timestamp = timestamp
        self.type = type


class Redux(Message):
    __id__ = 44

    def __init__(self, action: str, state: str, duration):
        self.action = action
        self.state = state
        self.duration = duration


class Vuex(Message):
    __id__ = 45

    def __init__(self, mutation: str, state: str):
        self.mutation = mutation
        self.state = state


class MobX(Message):
    __id__ = 46

    def __init__(self, type: str, payload: str):
        self.type = type
        self.payload = payload


class NgRx(Message):
    __id__ = 47

    def __init__(self, action: str, state: str, duration):
        self.action = action
        self.state = state
        self.duration = duration


class GraphQL(Message):
    __id__ = 48

    def __init__(self, operation_kind: str, operation_name: str,
                 variables: str, response: str):
        self.operation_kind = operation_kind
        self.operation_name = operation_name
        self.variables = variables
        self.response = response


class PerformanceTrack(Message):
    __id__ = 49

    def __init__(self, frames: int, ticks: int,
                 total_js_heap_size, used_js_heap_size):
        self.frames = frames
        self.ticks = ticks
        self.total_js_heap_size = total_js_heap_size
        self.used_js_heap_size = used_js_heap_size


class GraphQLEvent(Message):
    __id__ = 50

    def __init__(self, message_id, timestamp, name: str):
        self.message_id = message_id
        self.timestamp = timestamp
        self.name = name


class FetchEvent(Message):
    __id__ = 51

    def __init__(self, message_id, timestamp, method: str, url, request, response: str,
                  status, duration):
        self.message_id = message_id
        self.timestamp = timestamp
        self.method = method
        self.url = url
        self.request = request
        self.response = response
        self.status = status
        self.duration = duration


class DomDrop(Message):
    __id__ = 52

    def __init__(self, timestamp):
        self.timestamp = timestamp


class ResourceTiming(Message):
    __id__ = 53

    def __init__(self, timestamp, duration, ttfb, header_size, encoded_body_size,
                 decoded_body_size, url, initiator):
        self.timestamp = timestamp
        self.duration = duration
        self.ttfb = ttfb
        self.header_size = header_size
        self.encoded_body_size = encoded_body_size
        self.decoded_body_size = decoded_body_size
        self.url = url
        self.initiator = initiator


class ConnectionInformation(Message):
    __id__ = 54

    def __init__(self, downlink, type: str):
        self.downlink = downlink
        self.type = type


class SetPageVisibility(Message):
    __id__ = 55

    def __init__(self, hidden: bool):
        self.hidden = hidden


class PerformanceTrackAggr(Message):
    __id__ = 56

    def __init__(self, timestamp_start, timestamp_end, min_fps, avg_fps,
                 max_fps, min_cpu, avg_cpu, max_cpu,
                 min_total_js_heap_size, avg_total_js_heap_size,
                 max_total_js_heap_size, min_used_js_heap_size,
                 avg_used_js_heap_size, max_used_js_heap_size
                 ):
        self.timestamp_start = timestamp_start
        self.timestamp_end = timestamp_end
        self.min_fps = min_fps
        self.avg_fps = avg_fps
        self.max_fps = max_fps
        self.min_cpu = min_cpu
        self.avg_cpu = avg_cpu
        self.max_cpu = max_cpu
        self.min_total_js_heap_size = min_total_js_heap_size
        self.avg_total_js_heap_size = avg_total_js_heap_size
        self.max_total_js_heap_size = max_total_js_heap_size
        self.min_used_js_heap_size = min_used_js_heap_size
        self.avg_used_js_heap_size = avg_used_js_heap_size
        self.max_used_js_heap_size = max_used_js_heap_size


class LongTask(Message):
    __id__ = 59

    def __init__(self, timestamp, duration, context, container_type, container_src: str,
                 container_id: str, container_name: str):
        self.timestamp = timestamp
        self.duration = duration
        self.context = context
        self.container_type = container_type
        self.container_src = container_src
        self.container_id = container_id
        self.container_name = container_name


class SetNodeURLBasedAttribute(Message):
    __id__ = 60

    def __init__(self, id, name: str, value: str, base_url: str):
        self.id = id
        self.name = name
        self.value = value
        self.base_url = base_url


class SetStyleData(Message):
    __id__ = 61

    def __init__(self, id, data: str, base_url: str):
        self.id = id
        self.data = data
        self.base_url = base_url


class IssueEvent(Message):
    __id__ = 62

    def __init__(self, message_id, timestamp, type: str, context_string: str,
                 context: str, payload: str):
        self.message_id = message_id
        self.timestamp = timestamp
        self.type = type
        self.context_string = context_string
        self.context = context
        self.payload = payload


class TechnicalInfo(Message):
    __id__ = 63

    def __init__(self, type: str, value: str):
        self.type = type
        self.value = value


class CustomIssue(Message):
    __id__ = 64

    def __init__(self, name: str, payload: str):
        self.name = name
        self.payload = payload


class PageClose(Message):
    __id__ = 65


class AssetCache(Message):
    __id__ = 66

    def __init__(self, url):
        self.url = url


class CSSInsertRuleURLBased(Message):
    __id__ = 67

    def __init__(self, id, rule, index, base_url):
        self.id = id
        self.rule = rule
        self.index = index
        self.base_url = base_url


class MouseClick(Message):
    __id__ = 69

    def __init__(self, id, hesitation_time, label: str, selector):
        self.id = id
        self.hesitation_time = hesitation_time
        self.label = label
        self.selector = selector


class CreateIFrameDocument(Message):
    __id__ = 70

    def __init__(self, frame_id, id):
        self.frame_id = frame_id
        self.id = id


class BatchMeta(Message):
    __id__ = 80

    def __init__(self, page_no, first_index, timestamp):
        self.page_no = page_no
        self.first_index = first_index
        self.timestamp = timestamp

class IOSSessionStart(Message):
    __id__ = 90

    def __init__(self, timestamp, project_id, tracker_version: str,
                 rev_id: str, user_uuid: str, user_os: str, user_os_version: str,
                 user_device: str, user_device_type: str, user_country: str):
        self.timestamp = timestamp
        self.project_id = project_id
        self.tracker_version = tracker_version
        self.rev_id = rev_id
        self.user_uuid = user_uuid
        self.user_os = user_os
        self.user_os_version = user_os_version
        self.user_device = user_device
        self.user_device_type = user_device_type
        self.user_country = user_country


class IOSSessionEnd(Message):
    __id__ = 91

    def __init__(self, timestamp):
        self.timestamp = timestamp


class IOSMetadata(Message):
    __id__ = 92

    def __init__(self, timestamp, length, key: str, value: str):
        self.timestamp = timestamp
        self.length = length
        self.key = key
        self.value = value


class IOSCustomEvent(Message):
    __id__ = 93

    def __init__(self, timestamp, length, name: str, payload: str):
        self.timestamp = timestamp
        self.length = length
        self.name = name
        self.payload = payload


class IOSUserID(Message):
    __id__ = 94

    def __init__(self, timestamp, length, value: str):
        self.timestamp = timestamp
        self.length = length
        self.value = value


class IOSUserAnonymousID(Message):
    __id__ = 95

    def __init__(self, timestamp, length, value: str):
        self.timestamp = timestamp
        self.length = length
        self.value = value


class IOSScreenChanges(Message):
    __id__ = 96

    def __init__(self, timestamp, length, x, y, width, height):
        self.timestamp = timestamp
        self.length = length
        self.x = x
        self.y = y
        self.width = width
        self.height = height


class IOSCrash(Message):
    __id__ = 97

    def __init__(self, timestamp, length, name: str, reason: str, stacktrace):
        self.timestamp = timestamp
        self.length = length
        self.name = name
        self.reason = reason
        self.stacktrace = stacktrace


class IOSScreenEnter(Message):
    __id__ = 98

    def __init__(self, timestamp, length, title, view_name):
        self.timestamp = timestamp
        self.length = length
        self.title = title
        self.view_name = view_name


class IOSScreenLeave(Message):
    __id__ = 99

    def __init__(self, timestamp, length, title: str, view_name: str):
        self.timestamp = timestamp
        self.length = length
        self.title = title
        self.view_name = view_name


class IOSClickEvent(Message):
    __id__ = 100

    def __init__(self, timestamp, length, label, x, y):
        self.timestamp = timestamp
        self.length = length
        self.label = label
        self.x = x
        self.y = y


class IOSInputEvent(Message):
    __id__ = 101

    def __init__(self, timestamp, length, value: str, value_masked: bool, label: str):
        self.timestamp = timestamp
        self.length = length
        self.value_masked = value_masked
        self.label = label


class IOSPerformanceEvent(Message):
    __id__ = 102

    def __init__(self, timestamp, length, name: str, value):
        self.timestamp = timestamp
        self.length = length
        self.name = name
        self.value = value


class IOSLog(Message):
    __id__ = 103

    def __init__(self, timestamp, length, severity: str, content: str):
        self.timestamp = timestamp
        self.length = length
        self.severity = severity
        self.content = content


class IOSInternalError(Message):
    __id__ = 104

    def __init__(self, timestamp, length, content: str):
        self.timestamp = timestamp
        self.length = length
        self.content = content


class IOSNetworkCall(Message):
    __id__ = 105

    def __init__(self, timestamp, length, duration, headers, body, url, success: bool, method: str, status):
        self.timestamp = timestamp
        self.length = length
        self.duration = duration
        self.headers = headers
        self.body = body
        self.url = url
        self.success = success
        self.method = method
        self.status = status


class IOSBatchMeta(Message):
    __id__ = 107

    def __init__(self, timestamp, length, first_index):
        self.timestamp = timestamp
        self.length = length
        self.first_index = first_index


class IOSPerformanceAggregated(Message):
    __id__ = 110

    def __init__(self, timestamp_start, timestamp_end, min_fps, avg_fps,
                 max_fps, min_cpu, avg_cpu, max_cpu,
                 min_memory, avg_memory, max_memory,
                 min_battery, avg_battery, max_battery
                 ):
        self.timestamp_start = timestamp_start
        self.timestamp_end = timestamp_end
        self.min_fps = min_fps
        self.avg_fps = avg_fps
        self.max_fps = max_fps
        self.min_cpu = min_cpu
        self.avg_cpu = avg_cpu
        self.max_cpu = max_cpu
        self.min_memory = min_memory
        self.avg_memory = avg_memory
        self.max_memory = max_memory
        self.min_battery = min_battery
        self.avg_battery = avg_battery
        self.max_battery = max_battery


class IOSIssueEvent(Message):
    __id__ = 111

    def __init__(self, timestamp, type: str, context_string: str, context: str, payload: str):
        self.timestamp = timestamp
        self.type = type
        self.context_string = context_string
        self.context = context
        self.payload = payload
