# Auto-generated, do not edit
cimport abc
from abc cimport ABC

cdef class Message(ABC):
    pass


cdef class Timestamp(Message):
    cdef int __id__

    def __init__(self, int timestamp):
        self.__id__ = 0
        self.timestamp = timestamp


cdef class SessionStart(Message):
    cdef int __id__

    def __init__(self, int timestamp, int project_id, str tracker_version, str rev_id, str user_uuid, str user_agent, str user_os, str user_os_version, str user_browser, str user_browser_version, str user_device, str user_device_type, str user_device_memory_size, str user_device_heap_size, str user_country, str user_id):
        self.__id__ = 1
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
        self.user_id = user_id


cdef class SessionEndDeprecated(Message):
    cdef int __id__

    def __init__(self, int timestamp):
        self.__id__ = 3
        self.timestamp = timestamp


cdef class SetPageLocation(Message):
    cdef int __id__

    def __init__(self, str url, str referrer, int navigation_start):
        self.__id__ = 4
        self.url = url
        self.referrer = referrer
        self.navigation_start = navigation_start


cdef class SetViewportSize(Message):
    cdef int __id__

    def __init__(self, int width, int height):
        self.__id__ = 5
        self.width = width
        self.height = height


cdef class SetViewportScroll(Message):
    cdef int __id__

    def __init__(self, int x, int y):
        self.__id__ = 6
        self.x = x
        self.y = y


cdef class CreateDocument(Message):
    cdef int __id__

    def __init__(self, ):
        self.__id__ = 7
        pass


cdef class CreateElementNode(Message):
    cdef int __id__

    def __init__(self, int id, int parent_id, int index, str tag, bint svg):
        self.__id__ = 8
        self.id = id
        self.parent_id = parent_id
        self.index = index
        self.tag = tag
        self.svg = svg


cdef class CreateTextNode(Message):
    cdef int __id__

    def __init__(self, int id, int parent_id, int index):
        self.__id__ = 9
        self.id = id
        self.parent_id = parent_id
        self.index = index


cdef class MoveNode(Message):
    cdef int __id__

    def __init__(self, int id, int parent_id, int index):
        self.__id__ = 10
        self.id = id
        self.parent_id = parent_id
        self.index = index


cdef class RemoveNode(Message):
    cdef int __id__

    def __init__(self, int id):
        self.__id__ = 11
        self.id = id


cdef class SetNodeAttribute(Message):
    cdef int __id__

    def __init__(self, int id, str name, str value):
        self.__id__ = 12
        self.id = id
        self.name = name
        self.value = value


cdef class RemoveNodeAttribute(Message):
    cdef int __id__

    def __init__(self, int id, str name):
        self.__id__ = 13
        self.id = id
        self.name = name


cdef class SetNodeData(Message):
    cdef int __id__

    def __init__(self, int id, str data):
        self.__id__ = 14
        self.id = id
        self.data = data


cdef class SetCSSData(Message):
    cdef int __id__

    def __init__(self, int id, str data):
        self.__id__ = 15
        self.id = id
        self.data = data


cdef class SetNodeScroll(Message):
    cdef int __id__

    def __init__(self, int id, int x, int y):
        self.__id__ = 16
        self.id = id
        self.x = x
        self.y = y


cdef class SetInputTarget(Message):
    cdef int __id__

    def __init__(self, int id, str label):
        self.__id__ = 17
        self.id = id
        self.label = label


cdef class SetInputValue(Message):
    cdef int __id__

    def __init__(self, int id, str value, mask):
        self.__id__ = 18
        self.id = id
        self.value = value
        self.mask = mask


cdef class SetInputChecked(Message):
    cdef int __id__

    def __init__(self, int id, checked):
        self.__id__ = 19
        self.id = id
        self.checked = checked


cdef class MouseMove(Message):
    cdef int __id__

    def __init__(self, int x, int y):
        self.__id__ = 20
        self.x = x
        self.y = y


cdef class NetworkRequest(Message):
    cdef int __id__

    def __init__(self, str type, str method, str url, request, response, int status, int timestamp, int duration):
        self.__id__ = 21
        self.type = type
        self.method = method
        self.url = url
        self.request = request
        self.response = response
        self.status = status
        self.timestamp = timestamp
        self.duration = duration


cdef class ConsoleLog(Message):
    cdef int __id__

    def __init__(self, level, str value):
        self.__id__ = 22
        self.level = level
        self.value = value


cdef class PageLoadTiming(Message):
    cdef int __id__

    def __init__(self, request_start, response_start, response_end, dom_content_loaded_event_start, dom_content_loaded_event_end, load_event_start, load_event_end, first_paint, first_contentful_paint):
        self.__id__ = 23
        self.request_start = request_start
        self.response_start = response_start
        self.response_end = response_end
        self.dom_content_loaded_event_start = dom_content_loaded_event_start
        self.dom_content_loaded_event_end = dom_content_loaded_event_end
        self.load_event_start = load_event_start
        self.load_event_end = load_event_end
        self.first_paint = first_paint
        self.first_contentful_paint = first_contentful_paint


cdef class PageRenderTiming(Message):
    cdef int __id__

    def __init__(self, speed_index, visually_complete, time_to_interactive):
        self.__id__ = 24
        self.speed_index = speed_index
        self.visually_complete = visually_complete
        self.time_to_interactive = time_to_interactive


cdef class JSExceptionDeprecated(Message):
    cdef int __id__

    def __init__(self, str name, str message, str payload):
        self.__id__ = 25
        self.name = name
        self.message = message
        self.payload = payload


cdef class IntegrationEvent(Message):
    cdef int __id__

    def __init__(self, int timestamp, str source, str name, str message, str payload):
        self.__id__ = 26
        self.timestamp = timestamp
        self.source = source
        self.name = name
        self.message = message
        self.payload = payload


cdef class CustomEvent(Message):
    cdef int __id__

    def __init__(self, str name, str payload):
        self.__id__ = 27
        self.name = name
        self.payload = payload


cdef class UserID(Message):
    cdef int __id__

    def __init__(self, int id):
        self.__id__ = 28
        self.id = id


cdef class UserAnonymousID(Message):
    cdef int __id__

    def __init__(self, int id):
        self.__id__ = 29
        self.id = id


cdef class Metadata(Message):
    cdef int __id__

    def __init__(self, str key, str value):
        self.__id__ = 30
        self.key = key
        self.value = value


cdef class PageEvent(Message):
    cdef int __id__

    def __init__(self, str message_id, int timestamp, str url, str referrer, loaded, request_start, response_start, response_end, dom_content_loaded_event_start, dom_content_loaded_event_end, load_event_start, load_event_end, first_paint, first_contentful_paint, speed_index, visually_complete, time_to_interactive):
        self.__id__ = 31
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


cdef class InputEvent(Message):
    cdef int __id__

    def __init__(self, str message_id, int timestamp, str value, bint value_masked, str label):
        self.__id__ = 32
        self.message_id = message_id
        self.timestamp = timestamp
        self.value = value
        self.value_masked = value_masked
        self.label = label


cdef class CSSInsertRule(Message):
    cdef int __id__

    def __init__(self, int id, rule, int index):
        self.__id__ = 37
        self.id = id
        self.rule = rule
        self.index = index


cdef class CSSDeleteRule(Message):
    cdef int __id__

    def __init__(self, int id, int index):
        self.__id__ = 38
        self.id = id
        self.index = index


cdef class Fetch(Message):
    cdef int __id__

    def __init__(self, str method, str url, request, response, int status, int timestamp, int duration):
        self.__id__ = 39
        self.method = method
        self.url = url
        self.request = request
        self.response = response
        self.status = status
        self.timestamp = timestamp
        self.duration = duration


cdef class Profiler(Message):
    cdef int __id__

    def __init__(self, str name, int duration, args, result):
        self.__id__ = 40
        self.name = name
        self.duration = duration
        self.args = args
        self.result = result


cdef class OTable(Message):
    cdef int __id__

    def __init__(self, str key, str value):
        self.__id__ = 41
        self.key = key
        self.value = value


cdef class StateAction(Message):
    cdef int __id__

    def __init__(self, str type):
        self.__id__ = 42
        self.type = type


cdef class Redux(Message):
    cdef int __id__

    def __init__(self, action, str state, int duration):
        self.__id__ = 44
        self.action = action
        self.state = state
        self.duration = duration


cdef class Vuex(Message):
    cdef int __id__

    def __init__(self, str mutation, str state):
        self.__id__ = 45
        self.mutation = mutation
        self.state = state


cdef class MobX(Message):
    cdef int __id__

    def __init__(self, str type, str payload):
        self.__id__ = 46
        self.type = type
        self.payload = payload


cdef class NgRx(Message):
    cdef int __id__

    def __init__(self, action, str state, int duration):
        self.__id__ = 47
        self.action = action
        self.state = state
        self.duration = duration


cdef class GraphQL(Message):
    cdef int __id__

    def __init__(self, operation_kind, operation_name, variables, response):
        self.__id__ = 48
        self.operation_kind = operation_kind
        self.operation_name = operation_name
        self.variables = variables
        self.response = response


cdef class PerformanceTrack(Message):
    cdef int __id__

    def __init__(self, frames, ticks, total_js_heap_size, used_js_heap_size):
        self.__id__ = 49
        self.frames = frames
        self.ticks = ticks
        self.total_js_heap_size = total_js_heap_size
        self.used_js_heap_size = used_js_heap_size


cdef class StringDict(Message):
    cdef int __id__

    def __init__(self, int key, str value):
        self.__id__ = 50
        self.key = key
        self.value = value


cdef class SetNodeAttributeDict(Message):
    cdef int __id__

    def __init__(self, int id, str name_key, int value_key):
        self.__id__ = 51
        self.id = id
        self.name_key = name_key
        self.value_key = value_key


cdef class ResourceTimingDeprecated(Message):
    cdef int __id__

    def __init__(self, int timestamp, int duration, ttfb, int header_size, int encoded_body_size, int decoded_body_size, str url, str initiator):
        self.__id__ = 53
        self.timestamp = timestamp
        self.duration = duration
        self.ttfb = ttfb
        self.header_size = header_size
        self.encoded_body_size = encoded_body_size
        self.decoded_body_size = decoded_body_size
        self.url = url
        self.initiator = initiator


cdef class ConnectionInformation(Message):
    cdef int __id__

    def __init__(self, downlink, str type):
        self.__id__ = 54
        self.downlink = downlink
        self.type = type


cdef class SetPageVisibility(Message):
    cdef int __id__

    def __init__(self, hidden):
        self.__id__ = 55
        self.hidden = hidden


cdef class PerformanceTrackAggr(Message):
    cdef int __id__

    def __init__(self, int timestamp_start, int timestamp_end, int min_fps, int avg_fps, int max_fps, int min_cpu, int avg_cpu, int max_cpu, int min_total_js_heap_size, int avg_total_js_heap_size, int max_total_js_heap_size, int min_used_js_heap_size, int avg_used_js_heap_size, int max_used_js_heap_size):
        self.__id__ = 56
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


cdef class LoadFontFace(Message):
    cdef int __id__

    def __init__(self, int parent_id, str family, str source, str descriptors):
        self.__id__ = 57
        self.parent_id = parent_id
        self.family = family
        self.source = source
        self.descriptors = descriptors


cdef class SetNodeFocus(Message):
    cdef int __id__

    def __init__(self, int id):
        self.__id__ = 58
        self.id = id


cdef class LongTask(Message):
    cdef int __id__

    def __init__(self, int timestamp, int duration, str context, int container_type, str container_src, int container_id, str container_name):
        self.__id__ = 59
        self.timestamp = timestamp
        self.duration = duration
        self.context = context
        self.container_type = container_type
        self.container_src = container_src
        self.container_id = container_id
        self.container_name = container_name


cdef class SetNodeAttributeURLBased(Message):
    cdef int __id__

    def __init__(self, int id, str name, str value, str base_url):
        self.__id__ = 60
        self.id = id
        self.name = name
        self.value = value
        self.base_url = base_url


cdef class SetCSSDataURLBased(Message):
    cdef int __id__

    def __init__(self, int id, str data, str base_url):
        self.__id__ = 61
        self.id = id
        self.data = data
        self.base_url = base_url


cdef class IssueEventDeprecated(Message):
    cdef int __id__

    def __init__(self, str message_id, int timestamp, str type, str context_string, str context, str payload):
        self.__id__ = 62
        self.message_id = message_id
        self.timestamp = timestamp
        self.type = type
        self.context_string = context_string
        self.context = context
        self.payload = payload


cdef class TechnicalInfo(Message):
    cdef int __id__

    def __init__(self, str type, str value):
        self.__id__ = 63
        self.type = type
        self.value = value


cdef class CustomIssue(Message):
    cdef int __id__

    def __init__(self, str name, str payload):
        self.__id__ = 64
        self.name = name
        self.payload = payload


cdef class AssetCache(Message):
    cdef int __id__

    def __init__(self, str url):
        self.__id__ = 66
        self.url = url


cdef class CSSInsertRuleURLBased(Message):
    cdef int __id__

    def __init__(self, int id, rule, int index, str base_url):
        self.__id__ = 67
        self.id = id
        self.rule = rule
        self.index = index
        self.base_url = base_url


cdef class MouseClick(Message):
    cdef int __id__

    def __init__(self, int id, int hesitation_time, str label, str selector):
        self.__id__ = 69
        self.id = id
        self.hesitation_time = hesitation_time
        self.label = label
        self.selector = selector


cdef class CreateIFrameDocument(Message):
    cdef int __id__

    def __init__(self, frame_id, int id):
        self.__id__ = 70
        self.frame_id = frame_id
        self.id = id


cdef class AdoptedSSReplaceURLBased(Message):
    cdef int __id__

    def __init__(self, int sheet_id, str text, str base_url):
        self.__id__ = 71
        self.sheet_id = sheet_id
        self.text = text
        self.base_url = base_url


cdef class AdoptedSSReplace(Message):
    cdef int __id__

    def __init__(self, int sheet_id, str text):
        self.__id__ = 72
        self.sheet_id = sheet_id
        self.text = text


cdef class AdoptedSSInsertRuleURLBased(Message):
    cdef int __id__

    def __init__(self, int sheet_id, rule, int index, str base_url):
        self.__id__ = 73
        self.sheet_id = sheet_id
        self.rule = rule
        self.index = index
        self.base_url = base_url


cdef class AdoptedSSInsertRule(Message):
    cdef int __id__

    def __init__(self, int sheet_id, rule, int index):
        self.__id__ = 74
        self.sheet_id = sheet_id
        self.rule = rule
        self.index = index


cdef class AdoptedSSDeleteRule(Message):
    cdef int __id__

    def __init__(self, int sheet_id, int index):
        self.__id__ = 75
        self.sheet_id = sheet_id
        self.index = index


cdef class AdoptedSSAddOwner(Message):
    cdef int __id__

    def __init__(self, int sheet_id, int id):
        self.__id__ = 76
        self.sheet_id = sheet_id
        self.id = id


cdef class AdoptedSSRemoveOwner(Message):
    cdef int __id__

    def __init__(self, int sheet_id, int id):
        self.__id__ = 77
        self.sheet_id = sheet_id
        self.id = id


cdef class JSException(Message):
    cdef int __id__

    def __init__(self, str name, str message, str payload, str metadata):
        self.__id__ = 78
        self.name = name
        self.message = message
        self.payload = payload
        self.metadata = metadata


cdef class Zustand(Message):
    cdef int __id__

    def __init__(self, str mutation, str state):
        self.__id__ = 79
        self.mutation = mutation
        self.state = state


cdef class BatchMeta(Message):
    cdef int __id__

    def __init__(self, int page_no, int first_index, int timestamp):
        self.__id__ = 80
        self.page_no = page_no
        self.first_index = first_index
        self.timestamp = timestamp


cdef class BatchMetadata(Message):
    cdef int __id__

    def __init__(self, int version, int page_no, int first_index, int timestamp, str location):
        self.__id__ = 81
        self.version = version
        self.page_no = page_no
        self.first_index = first_index
        self.timestamp = timestamp
        self.location = location


cdef class PartitionedMessage(Message):
    cdef int __id__

    def __init__(self, int part_no, int part_total):
        self.__id__ = 82
        self.part_no = part_no
        self.part_total = part_total


cdef class InputChange(Message):
    cdef int __id__

    def __init__(self, int id, str value, bint value_masked, str label, int hesitation_time, int input_duration):
        self.__id__ = 112
        self.id = id
        self.value = value
        self.value_masked = value_masked
        self.label = label
        self.hesitation_time = hesitation_time
        self.input_duration = input_duration


cdef class SelectionChange(Message):
    cdef int __id__

    def __init__(self, int selection_start, int selection_end, str selection):
        self.__id__ = 113
        self.selection_start = selection_start
        self.selection_end = selection_end
        self.selection = selection


cdef class MouseThrashing(Message):
    cdef int __id__

    def __init__(self, int timestamp):
        self.__id__ = 114
        self.timestamp = timestamp


cdef class UnbindNodes(Message):
    cdef int __id__

    def __init__(self, int total_removed_percent):
        self.__id__ = 115
        self.total_removed_percent = total_removed_percent


cdef class ResourceTiming(Message):
    cdef int __id__

    def __init__(self, int timestamp, int duration, ttfb, int header_size, int encoded_body_size, int decoded_body_size, str url, str initiator, int transferred_size, bint cached):
        self.__id__ = 116
        self.timestamp = timestamp
        self.duration = duration
        self.ttfb = ttfb
        self.header_size = header_size
        self.encoded_body_size = encoded_body_size
        self.decoded_body_size = decoded_body_size
        self.url = url
        self.initiator = initiator
        self.transferred_size = transferred_size
        self.cached = cached


cdef class IssueEvent(Message):
    cdef int __id__

    def __init__(self, str message_id, int timestamp, str type, str context_string, str context, str payload, str url):
        self.__id__ = 125
        self.message_id = message_id
        self.timestamp = timestamp
        self.type = type
        self.context_string = context_string
        self.context = context
        self.payload = payload
        self.url = url


cdef class SessionEnd(Message):
    cdef int __id__

    def __init__(self, int timestamp, str encryption_key):
        self.__id__ = 126
        self.timestamp = timestamp
        self.encryption_key = encryption_key


cdef class SessionSearch(Message):
    cdef int __id__

    def __init__(self, int timestamp, int partition):
        self.__id__ = 127
        self.timestamp = timestamp
        self.partition = partition


cdef class IOSBatchMeta(Message):
    cdef int __id__

    def __init__(self, int timestamp, int length, int first_index):
        self.__id__ = 107
        self.timestamp = timestamp
        self.length = length
        self.first_index = first_index


cdef class IOSSessionStart(Message):
    cdef int __id__

    def __init__(self, int timestamp, int project_id, str tracker_version, str rev_id, str user_uuid, str user_os, str user_os_version, str user_device, str user_device_type, str user_country):
        self.__id__ = 90
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


cdef class IOSSessionEnd(Message):
    cdef int __id__

    def __init__(self, int timestamp):
        self.__id__ = 91
        self.timestamp = timestamp


cdef class IOSMetadata(Message):
    cdef int __id__

    def __init__(self, int timestamp, int length, str key, str value):
        self.__id__ = 92
        self.timestamp = timestamp
        self.length = length
        self.key = key
        self.value = value


cdef class IOSCustomEvent(Message):
    cdef int __id__

    def __init__(self, int timestamp, int length, str name, str payload):
        self.__id__ = 93
        self.timestamp = timestamp
        self.length = length
        self.name = name
        self.payload = payload


cdef class IOSUserID(Message):
    cdef int __id__

    def __init__(self, int timestamp, int length, str value):
        self.__id__ = 94
        self.timestamp = timestamp
        self.length = length
        self.value = value


cdef class IOSUserAnonymousID(Message):
    cdef int __id__

    def __init__(self, int timestamp, int length, str value):
        self.__id__ = 95
        self.timestamp = timestamp
        self.length = length
        self.value = value


cdef class IOSScreenChanges(Message):
    cdef int __id__

    def __init__(self, int timestamp, int length, int x, int y, int width, int height):
        self.__id__ = 96
        self.timestamp = timestamp
        self.length = length
        self.x = x
        self.y = y
        self.width = width
        self.height = height


cdef class IOSCrash(Message):
    cdef int __id__

    def __init__(self, int timestamp, int length, str name, str reason, str stacktrace):
        self.__id__ = 97
        self.timestamp = timestamp
        self.length = length
        self.name = name
        self.reason = reason
        self.stacktrace = stacktrace


cdef class IOSScreenEnter(Message):
    cdef int __id__

    def __init__(self, int timestamp, int length, str title, str view_name):
        self.__id__ = 98
        self.timestamp = timestamp
        self.length = length
        self.title = title
        self.view_name = view_name


cdef class IOSScreenLeave(Message):
    cdef int __id__

    def __init__(self, int timestamp, int length, str title, str view_name):
        self.__id__ = 99
        self.timestamp = timestamp
        self.length = length
        self.title = title
        self.view_name = view_name


cdef class IOSClickEvent(Message):
    cdef int __id__

    def __init__(self, int timestamp, int length, str label, int x, int y):
        self.__id__ = 100
        self.timestamp = timestamp
        self.length = length
        self.label = label
        self.x = x
        self.y = y


cdef class IOSInputEvent(Message):
    cdef int __id__

    def __init__(self, int timestamp, int length, str value, bint value_masked, str label):
        self.__id__ = 101
        self.timestamp = timestamp
        self.length = length
        self.value = value
        self.value_masked = value_masked
        self.label = label


cdef class IOSPerformanceEvent(Message):
    cdef int __id__

    def __init__(self, int timestamp, int length, str name, str value):
        self.__id__ = 102
        self.timestamp = timestamp
        self.length = length
        self.name = name
        self.value = value


cdef class IOSLog(Message):
    cdef int __id__

    def __init__(self, int timestamp, int length, str severity, str content):
        self.__id__ = 103
        self.timestamp = timestamp
        self.length = length
        self.severity = severity
        self.content = content


cdef class IOSInternalError(Message):
    cdef int __id__

    def __init__(self, int timestamp, int length, str content):
        self.__id__ = 104
        self.timestamp = timestamp
        self.length = length
        self.content = content


cdef class IOSNetworkCall(Message):
    cdef int __id__

    def __init__(self, int timestamp, int length, int duration, str headers, str body, str url, bint success, str method, int status):
        self.__id__ = 105
        self.timestamp = timestamp
        self.length = length
        self.duration = duration
        self.headers = headers
        self.body = body
        self.url = url
        self.success = success
        self.method = method
        self.status = status


cdef class IOSPerformanceAggregated(Message):
    cdef int __id__

    def __init__(self, int timestamp_start, int timestamp_end, int min_fps, int avg_fps, int max_fps, int min_cpu, int avg_cpu, int max_cpu, int min_memory, int avg_memory, int max_memory, int min_battery, int avg_battery, int max_battery):
        self.__id__ = 110
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


cdef class IOSIssueEvent(Message):
    cdef int __id__

    def __init__(self, int timestamp, str type, str context_string, str context, str payload):
        self.__id__ = 111
        self.timestamp = timestamp
        self.type = type
        self.context_string = context_string
        self.context = context
        self.payload = payload


