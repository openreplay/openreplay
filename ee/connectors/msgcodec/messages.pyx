# Auto-generated, do not edit

from abc cimport ABC

class Message(ABC):
    pass

cdef class PyMessage:
    def __cinit__(self):
        pass


cdef class Timestamp(PyMessage):
    cdef public int __id__
    cdef public unsigned long timestamp

    def __init__(self, unsigned long timestamp):
        self.__id__ = 0
        self.timestamp = timestamp


cdef class SessionStart(PyMessage):
    cdef public int __id__
    cdef public unsigned long timestamp
    cdef public unsigned long project_id
    cdef public str tracker_version
    cdef public str rev_id
    cdef public str user_uuid
    cdef public str user_agent
    cdef public str user_os
    cdef public str user_os_version
    cdef public str user_browser
    cdef public str user_browser_version
    cdef public str user_device
    cdef public str user_device_type
    cdef public unsigned long user_device_memory_size
    cdef public unsigned long user_device_heap_size
    cdef public str user_country
    cdef public str user_id

    def __init__(self, unsigned long timestamp, unsigned long project_id, str tracker_version, str rev_id, str user_uuid, str user_agent, str user_os, str user_os_version, str user_browser, str user_browser_version, str user_device, str user_device_type, unsigned long user_device_memory_size, unsigned long user_device_heap_size, str user_country, str user_id):
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


cdef class SessionEndDeprecated(PyMessage):
    cdef public int __id__
    cdef public unsigned long timestamp

    def __init__(self, unsigned long timestamp):
        self.__id__ = 3
        self.timestamp = timestamp


cdef class SetPageLocation(PyMessage):
    cdef public int __id__
    cdef public str url
    cdef public str referrer
    cdef public unsigned long navigation_start

    def __init__(self, str url, str referrer, unsigned long navigation_start):
        self.__id__ = 4
        self.url = url
        self.referrer = referrer
        self.navigation_start = navigation_start


cdef class SetViewportSize(PyMessage):
    cdef public int __id__
    cdef public unsigned long width
    cdef public unsigned long height

    def __init__(self, unsigned long width, unsigned long height):
        self.__id__ = 5
        self.width = width
        self.height = height


cdef class SetViewportScroll(PyMessage):
    cdef public int __id__
    cdef public long x
    cdef public long y

    def __init__(self, long x, long y):
        self.__id__ = 6
        self.x = x
        self.y = y


cdef class CreateDocument(PyMessage):
    cdef public int __id__
    

    def __init__(self, ):
        self.__id__ = 7
        


cdef class CreateElementNode(PyMessage):
    cdef public int __id__
    cdef public unsigned long id
    cdef public unsigned long parent_id
    cdef public unsigned long index
    cdef public str tag
    cdef public bint svg

    def __init__(self, unsigned long id, unsigned long parent_id, unsigned long index, str tag, bint svg):
        self.__id__ = 8
        self.id = id
        self.parent_id = parent_id
        self.index = index
        self.tag = tag
        self.svg = svg


cdef class CreateTextNode(PyMessage):
    cdef public int __id__
    cdef public unsigned long id
    cdef public unsigned long parent_id
    cdef public unsigned long index

    def __init__(self, unsigned long id, unsigned long parent_id, unsigned long index):
        self.__id__ = 9
        self.id = id
        self.parent_id = parent_id
        self.index = index


cdef class MoveNode(PyMessage):
    cdef public int __id__
    cdef public unsigned long id
    cdef public unsigned long parent_id
    cdef public unsigned long index

    def __init__(self, unsigned long id, unsigned long parent_id, unsigned long index):
        self.__id__ = 10
        self.id = id
        self.parent_id = parent_id
        self.index = index


cdef class RemoveNode(PyMessage):
    cdef public int __id__
    cdef public unsigned long id

    def __init__(self, unsigned long id):
        self.__id__ = 11
        self.id = id


cdef class SetNodeAttribute(PyMessage):
    cdef public int __id__
    cdef public unsigned long id
    cdef public str name
    cdef public str value

    def __init__(self, unsigned long id, str name, str value):
        self.__id__ = 12
        self.id = id
        self.name = name
        self.value = value


cdef class RemoveNodeAttribute(PyMessage):
    cdef public int __id__
    cdef public unsigned long id
    cdef public str name

    def __init__(self, unsigned long id, str name):
        self.__id__ = 13
        self.id = id
        self.name = name


cdef class SetNodeData(PyMessage):
    cdef public int __id__
    cdef public unsigned long id
    cdef public str data

    def __init__(self, unsigned long id, str data):
        self.__id__ = 14
        self.id = id
        self.data = data


cdef class SetCSSData(PyMessage):
    cdef public int __id__
    cdef public unsigned long id
    cdef public str data

    def __init__(self, unsigned long id, str data):
        self.__id__ = 15
        self.id = id
        self.data = data


cdef class SetNodeScroll(PyMessage):
    cdef public int __id__
    cdef public unsigned long id
    cdef public long x
    cdef public long y

    def __init__(self, unsigned long id, long x, long y):
        self.__id__ = 16
        self.id = id
        self.x = x
        self.y = y


cdef class SetInputTarget(PyMessage):
    cdef public int __id__
    cdef public unsigned long id
    cdef public str label

    def __init__(self, unsigned long id, str label):
        self.__id__ = 17
        self.id = id
        self.label = label


cdef class SetInputValue(PyMessage):
    cdef public int __id__
    cdef public unsigned long id
    cdef public str value
    cdef public long mask

    def __init__(self, unsigned long id, str value, long mask):
        self.__id__ = 18
        self.id = id
        self.value = value
        self.mask = mask


cdef class SetInputChecked(PyMessage):
    cdef public int __id__
    cdef public unsigned long id
    cdef public bint checked

    def __init__(self, unsigned long id, bint checked):
        self.__id__ = 19
        self.id = id
        self.checked = checked


cdef class MouseMove(PyMessage):
    cdef public int __id__
    cdef public unsigned long x
    cdef public unsigned long y

    def __init__(self, unsigned long x, unsigned long y):
        self.__id__ = 20
        self.x = x
        self.y = y


cdef class NetworkRequestDeprecated(PyMessage):
    cdef public int __id__
    cdef public str type
    cdef public str method
    cdef public str url
    cdef public str request
    cdef public str response
    cdef public unsigned long status
    cdef public unsigned long timestamp
    cdef public unsigned long duration

    def __init__(self, str type, str method, str url, str request, str response, unsigned long status, unsigned long timestamp, unsigned long duration):
        self.__id__ = 21
        self.type = type
        self.method = method
        self.url = url
        self.request = request
        self.response = response
        self.status = status
        self.timestamp = timestamp
        self.duration = duration


cdef class ConsoleLog(PyMessage):
    cdef public int __id__
    cdef public str level
    cdef public str value

    def __init__(self, str level, str value):
        self.__id__ = 22
        self.level = level
        self.value = value


cdef class PageLoadTiming(PyMessage):
    cdef public int __id__
    cdef public unsigned long request_start
    cdef public unsigned long response_start
    cdef public unsigned long response_end
    cdef public unsigned long dom_content_loaded_event_start
    cdef public unsigned long dom_content_loaded_event_end
    cdef public unsigned long load_event_start
    cdef public unsigned long load_event_end
    cdef public unsigned long first_paint
    cdef public unsigned long first_contentful_paint

    def __init__(self, unsigned long request_start, unsigned long response_start, unsigned long response_end, unsigned long dom_content_loaded_event_start, unsigned long dom_content_loaded_event_end, unsigned long load_event_start, unsigned long load_event_end, unsigned long first_paint, unsigned long first_contentful_paint):
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


cdef class PageRenderTiming(PyMessage):
    cdef public int __id__
    cdef public unsigned long speed_index
    cdef public unsigned long visually_complete
    cdef public unsigned long time_to_interactive

    def __init__(self, unsigned long speed_index, unsigned long visually_complete, unsigned long time_to_interactive):
        self.__id__ = 24
        self.speed_index = speed_index
        self.visually_complete = visually_complete
        self.time_to_interactive = time_to_interactive


cdef class JSExceptionDeprecated(PyMessage):
    cdef public int __id__
    cdef public str name
    cdef public str message
    cdef public str payload

    def __init__(self, str name, str message, str payload):
        self.__id__ = 25
        self.name = name
        self.message = message
        self.payload = payload


cdef class IntegrationEvent(PyMessage):
    cdef public int __id__
    cdef public unsigned long timestamp
    cdef public str source
    cdef public str name
    cdef public str message
    cdef public str payload

    def __init__(self, unsigned long timestamp, str source, str name, str message, str payload):
        self.__id__ = 26
        self.timestamp = timestamp
        self.source = source
        self.name = name
        self.message = message
        self.payload = payload


cdef class CustomEvent(PyMessage):
    cdef public int __id__
    cdef public str name
    cdef public str payload

    def __init__(self, str name, str payload):
        self.__id__ = 27
        self.name = name
        self.payload = payload


cdef class UserID(PyMessage):
    cdef public int __id__
    cdef public str id

    def __init__(self, str id):
        self.__id__ = 28
        self.id = id


cdef class UserAnonymousID(PyMessage):
    cdef public int __id__
    cdef public str id

    def __init__(self, str id):
        self.__id__ = 29
        self.id = id


cdef class Metadata(PyMessage):
    cdef public int __id__
    cdef public str key
    cdef public str value

    def __init__(self, str key, str value):
        self.__id__ = 30
        self.key = key
        self.value = value


cdef class PageEvent(PyMessage):
    cdef public int __id__
    cdef public unsigned long message_id
    cdef public unsigned long timestamp
    cdef public str url
    cdef public str referrer
    cdef public bint loaded
    cdef public unsigned long request_start
    cdef public unsigned long response_start
    cdef public unsigned long response_end
    cdef public unsigned long dom_content_loaded_event_start
    cdef public unsigned long dom_content_loaded_event_end
    cdef public unsigned long load_event_start
    cdef public unsigned long load_event_end
    cdef public unsigned long first_paint
    cdef public unsigned long first_contentful_paint
    cdef public unsigned long speed_index
    cdef public unsigned long visually_complete
    cdef public unsigned long time_to_interactive

    def __init__(self, unsigned long message_id, unsigned long timestamp, str url, str referrer, bint loaded, unsigned long request_start, unsigned long response_start, unsigned long response_end, unsigned long dom_content_loaded_event_start, unsigned long dom_content_loaded_event_end, unsigned long load_event_start, unsigned long load_event_end, unsigned long first_paint, unsigned long first_contentful_paint, unsigned long speed_index, unsigned long visually_complete, unsigned long time_to_interactive):
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


cdef class InputEvent(PyMessage):
    cdef public int __id__
    cdef public unsigned long message_id
    cdef public unsigned long timestamp
    cdef public str value
    cdef public bint value_masked
    cdef public str label

    def __init__(self, unsigned long message_id, unsigned long timestamp, str value, bint value_masked, str label):
        self.__id__ = 32
        self.message_id = message_id
        self.timestamp = timestamp
        self.value = value
        self.value_masked = value_masked
        self.label = label


cdef class CSSInsertRule(PyMessage):
    cdef public int __id__
    cdef public unsigned long id
    cdef public str rule
    cdef public unsigned long index

    def __init__(self, unsigned long id, str rule, unsigned long index):
        self.__id__ = 37
        self.id = id
        self.rule = rule
        self.index = index


cdef class CSSDeleteRule(PyMessage):
    cdef public int __id__
    cdef public unsigned long id
    cdef public unsigned long index

    def __init__(self, unsigned long id, unsigned long index):
        self.__id__ = 38
        self.id = id
        self.index = index


cdef class Fetch(PyMessage):
    cdef public int __id__
    cdef public str method
    cdef public str url
    cdef public str request
    cdef public str response
    cdef public unsigned long status
    cdef public unsigned long timestamp
    cdef public unsigned long duration

    def __init__(self, str method, str url, str request, str response, unsigned long status, unsigned long timestamp, unsigned long duration):
        self.__id__ = 39
        self.method = method
        self.url = url
        self.request = request
        self.response = response
        self.status = status
        self.timestamp = timestamp
        self.duration = duration


cdef class Profiler(PyMessage):
    cdef public int __id__
    cdef public str name
    cdef public unsigned long duration
    cdef public str args
    cdef public str result

    def __init__(self, str name, unsigned long duration, str args, str result):
        self.__id__ = 40
        self.name = name
        self.duration = duration
        self.args = args
        self.result = result


cdef class OTable(PyMessage):
    cdef public int __id__
    cdef public str key
    cdef public str value

    def __init__(self, str key, str value):
        self.__id__ = 41
        self.key = key
        self.value = value


cdef class StateAction(PyMessage):
    cdef public int __id__
    cdef public str type

    def __init__(self, str type):
        self.__id__ = 42
        self.type = type


cdef class Redux(PyMessage):
    cdef public int __id__
    cdef public str action
    cdef public str state
    cdef public unsigned long duration

    def __init__(self, str action, str state, unsigned long duration):
        self.__id__ = 44
        self.action = action
        self.state = state
        self.duration = duration


cdef class Vuex(PyMessage):
    cdef public int __id__
    cdef public str mutation
    cdef public str state

    def __init__(self, str mutation, str state):
        self.__id__ = 45
        self.mutation = mutation
        self.state = state


cdef class MobX(PyMessage):
    cdef public int __id__
    cdef public str type
    cdef public str payload

    def __init__(self, str type, str payload):
        self.__id__ = 46
        self.type = type
        self.payload = payload


cdef class NgRx(PyMessage):
    cdef public int __id__
    cdef public str action
    cdef public str state
    cdef public unsigned long duration

    def __init__(self, str action, str state, unsigned long duration):
        self.__id__ = 47
        self.action = action
        self.state = state
        self.duration = duration


cdef class GraphQL(PyMessage):
    cdef public int __id__
    cdef public str operation_kind
    cdef public str operation_name
    cdef public str variables
    cdef public str response

    def __init__(self, str operation_kind, str operation_name, str variables, str response):
        self.__id__ = 48
        self.operation_kind = operation_kind
        self.operation_name = operation_name
        self.variables = variables
        self.response = response


cdef class PerformanceTrack(PyMessage):
    cdef public int __id__
    cdef public long frames
    cdef public long ticks
    cdef public unsigned long total_js_heap_size
    cdef public unsigned long used_js_heap_size

    def __init__(self, long frames, long ticks, unsigned long total_js_heap_size, unsigned long used_js_heap_size):
        self.__id__ = 49
        self.frames = frames
        self.ticks = ticks
        self.total_js_heap_size = total_js_heap_size
        self.used_js_heap_size = used_js_heap_size


cdef class StringDict(PyMessage):
    cdef public int __id__
    cdef public unsigned long key
    cdef public str value

    def __init__(self, unsigned long key, str value):
        self.__id__ = 50
        self.key = key
        self.value = value


cdef class SetNodeAttributeDict(PyMessage):
    cdef public int __id__
    cdef public unsigned long id
    cdef public unsigned long name_key
    cdef public unsigned long value_key

    def __init__(self, unsigned long id, unsigned long name_key, unsigned long value_key):
        self.__id__ = 51
        self.id = id
        self.name_key = name_key
        self.value_key = value_key


cdef class ResourceTimingDeprecated(PyMessage):
    cdef public int __id__
    cdef public unsigned long timestamp
    cdef public unsigned long duration
    cdef public unsigned long ttfb
    cdef public unsigned long header_size
    cdef public unsigned long encoded_body_size
    cdef public unsigned long decoded_body_size
    cdef public str url
    cdef public str initiator

    def __init__(self, unsigned long timestamp, unsigned long duration, unsigned long ttfb, unsigned long header_size, unsigned long encoded_body_size, unsigned long decoded_body_size, str url, str initiator):
        self.__id__ = 53
        self.timestamp = timestamp
        self.duration = duration
        self.ttfb = ttfb
        self.header_size = header_size
        self.encoded_body_size = encoded_body_size
        self.decoded_body_size = decoded_body_size
        self.url = url
        self.initiator = initiator


cdef class ConnectionInformation(PyMessage):
    cdef public int __id__
    cdef public unsigned long downlink
    cdef public str type

    def __init__(self, unsigned long downlink, str type):
        self.__id__ = 54
        self.downlink = downlink
        self.type = type


cdef class SetPageVisibility(PyMessage):
    cdef public int __id__
    cdef public bint hidden

    def __init__(self, bint hidden):
        self.__id__ = 55
        self.hidden = hidden


cdef class PerformanceTrackAggr(PyMessage):
    cdef public int __id__
    cdef public unsigned long timestamp_start
    cdef public unsigned long timestamp_end
    cdef public unsigned long min_fps
    cdef public unsigned long avg_fps
    cdef public unsigned long max_fps
    cdef public unsigned long min_cpu
    cdef public unsigned long avg_cpu
    cdef public unsigned long max_cpu
    cdef public unsigned long min_total_js_heap_size
    cdef public unsigned long avg_total_js_heap_size
    cdef public unsigned long max_total_js_heap_size
    cdef public unsigned long min_used_js_heap_size
    cdef public unsigned long avg_used_js_heap_size
    cdef public unsigned long max_used_js_heap_size

    def __init__(self, unsigned long timestamp_start, unsigned long timestamp_end, unsigned long min_fps, unsigned long avg_fps, unsigned long max_fps, unsigned long min_cpu, unsigned long avg_cpu, unsigned long max_cpu, unsigned long min_total_js_heap_size, unsigned long avg_total_js_heap_size, unsigned long max_total_js_heap_size, unsigned long min_used_js_heap_size, unsigned long avg_used_js_heap_size, unsigned long max_used_js_heap_size):
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


cdef class LoadFontFace(PyMessage):
    cdef public int __id__
    cdef public unsigned long parent_id
    cdef public str family
    cdef public str source
    cdef public str descriptors

    def __init__(self, unsigned long parent_id, str family, str source, str descriptors):
        self.__id__ = 57
        self.parent_id = parent_id
        self.family = family
        self.source = source
        self.descriptors = descriptors


cdef class SetNodeFocus(PyMessage):
    cdef public int __id__
    cdef public long id

    def __init__(self, long id):
        self.__id__ = 58
        self.id = id


cdef class LongTask(PyMessage):
    cdef public int __id__
    cdef public unsigned long timestamp
    cdef public unsigned long duration
    cdef public unsigned long context
    cdef public unsigned long container_type
    cdef public str container_src
    cdef public str container_id
    cdef public str container_name

    def __init__(self, unsigned long timestamp, unsigned long duration, unsigned long context, unsigned long container_type, str container_src, str container_id, str container_name):
        self.__id__ = 59
        self.timestamp = timestamp
        self.duration = duration
        self.context = context
        self.container_type = container_type
        self.container_src = container_src
        self.container_id = container_id
        self.container_name = container_name


cdef class SetNodeAttributeURLBased(PyMessage):
    cdef public int __id__
    cdef public unsigned long id
    cdef public str name
    cdef public str value
    cdef public str base_url

    def __init__(self, unsigned long id, str name, str value, str base_url):
        self.__id__ = 60
        self.id = id
        self.name = name
        self.value = value
        self.base_url = base_url


cdef class SetCSSDataURLBased(PyMessage):
    cdef public int __id__
    cdef public unsigned long id
    cdef public str data
    cdef public str base_url

    def __init__(self, unsigned long id, str data, str base_url):
        self.__id__ = 61
        self.id = id
        self.data = data
        self.base_url = base_url


cdef class IssueEventDeprecated(PyMessage):
    cdef public int __id__
    cdef public unsigned long message_id
    cdef public unsigned long timestamp
    cdef public str type
    cdef public str context_string
    cdef public str context
    cdef public str payload

    def __init__(self, unsigned long message_id, unsigned long timestamp, str type, str context_string, str context, str payload):
        self.__id__ = 62
        self.message_id = message_id
        self.timestamp = timestamp
        self.type = type
        self.context_string = context_string
        self.context = context
        self.payload = payload


cdef class TechnicalInfo(PyMessage):
    cdef public int __id__
    cdef public str type
    cdef public str value

    def __init__(self, str type, str value):
        self.__id__ = 63
        self.type = type
        self.value = value


cdef class CustomIssue(PyMessage):
    cdef public int __id__
    cdef public str name
    cdef public str payload

    def __init__(self, str name, str payload):
        self.__id__ = 64
        self.name = name
        self.payload = payload


cdef class AssetCache(PyMessage):
    cdef public int __id__
    cdef public str url

    def __init__(self, str url):
        self.__id__ = 66
        self.url = url


cdef class CSSInsertRuleURLBased(PyMessage):
    cdef public int __id__
    cdef public unsigned long id
    cdef public str rule
    cdef public unsigned long index
    cdef public str base_url

    def __init__(self, unsigned long id, str rule, unsigned long index, str base_url):
        self.__id__ = 67
        self.id = id
        self.rule = rule
        self.index = index
        self.base_url = base_url


cdef class MouseClick(PyMessage):
    cdef public int __id__
    cdef public unsigned long id
    cdef public unsigned long hesitation_time
    cdef public str label
    cdef public str selector

    def __init__(self, unsigned long id, unsigned long hesitation_time, str label, str selector):
        self.__id__ = 69
        self.id = id
        self.hesitation_time = hesitation_time
        self.label = label
        self.selector = selector


cdef class CreateIFrameDocument(PyMessage):
    cdef public int __id__
    cdef public unsigned long frame_id
    cdef public unsigned long id

    def __init__(self, unsigned long frame_id, unsigned long id):
        self.__id__ = 70
        self.frame_id = frame_id
        self.id = id


cdef class AdoptedSSReplaceURLBased(PyMessage):
    cdef public int __id__
    cdef public unsigned long sheet_id
    cdef public str text
    cdef public str base_url

    def __init__(self, unsigned long sheet_id, str text, str base_url):
        self.__id__ = 71
        self.sheet_id = sheet_id
        self.text = text
        self.base_url = base_url


cdef class AdoptedSSReplace(PyMessage):
    cdef public int __id__
    cdef public unsigned long sheet_id
    cdef public str text

    def __init__(self, unsigned long sheet_id, str text):
        self.__id__ = 72
        self.sheet_id = sheet_id
        self.text = text


cdef class AdoptedSSInsertRuleURLBased(PyMessage):
    cdef public int __id__
    cdef public unsigned long sheet_id
    cdef public str rule
    cdef public unsigned long index
    cdef public str base_url

    def __init__(self, unsigned long sheet_id, str rule, unsigned long index, str base_url):
        self.__id__ = 73
        self.sheet_id = sheet_id
        self.rule = rule
        self.index = index
        self.base_url = base_url


cdef class AdoptedSSInsertRule(PyMessage):
    cdef public int __id__
    cdef public unsigned long sheet_id
    cdef public str rule
    cdef public unsigned long index

    def __init__(self, unsigned long sheet_id, str rule, unsigned long index):
        self.__id__ = 74
        self.sheet_id = sheet_id
        self.rule = rule
        self.index = index


cdef class AdoptedSSDeleteRule(PyMessage):
    cdef public int __id__
    cdef public unsigned long sheet_id
    cdef public unsigned long index

    def __init__(self, unsigned long sheet_id, unsigned long index):
        self.__id__ = 75
        self.sheet_id = sheet_id
        self.index = index


cdef class AdoptedSSAddOwner(PyMessage):
    cdef public int __id__
    cdef public unsigned long sheet_id
    cdef public unsigned long id

    def __init__(self, unsigned long sheet_id, unsigned long id):
        self.__id__ = 76
        self.sheet_id = sheet_id
        self.id = id


cdef class AdoptedSSRemoveOwner(PyMessage):
    cdef public int __id__
    cdef public unsigned long sheet_id
    cdef public unsigned long id

    def __init__(self, unsigned long sheet_id, unsigned long id):
        self.__id__ = 77
        self.sheet_id = sheet_id
        self.id = id


cdef class JSException(PyMessage):
    cdef public int __id__
    cdef public str name
    cdef public str message
    cdef public str payload
    cdef public str metadata

    def __init__(self, str name, str message, str payload, str metadata):
        self.__id__ = 78
        self.name = name
        self.message = message
        self.payload = payload
        self.metadata = metadata


cdef class Zustand(PyMessage):
    cdef public int __id__
    cdef public str mutation
    cdef public str state

    def __init__(self, str mutation, str state):
        self.__id__ = 79
        self.mutation = mutation
        self.state = state


cdef class BatchMeta(PyMessage):
    cdef public int __id__
    cdef public unsigned long page_no
    cdef public unsigned long first_index
    cdef public long timestamp

    def __init__(self, unsigned long page_no, unsigned long first_index, long timestamp):
        self.__id__ = 80
        self.page_no = page_no
        self.first_index = first_index
        self.timestamp = timestamp


cdef class BatchMetadata(PyMessage):
    cdef public int __id__
    cdef public unsigned long version
    cdef public unsigned long page_no
    cdef public unsigned long first_index
    cdef public long timestamp
    cdef public str location

    def __init__(self, unsigned long version, unsigned long page_no, unsigned long first_index, long timestamp, str location):
        self.__id__ = 81
        self.version = version
        self.page_no = page_no
        self.first_index = first_index
        self.timestamp = timestamp
        self.location = location


cdef class PartitionedMessage(PyMessage):
    cdef public int __id__
    cdef public unsigned long part_no
    cdef public unsigned long part_total

    def __init__(self, unsigned long part_no, unsigned long part_total):
        self.__id__ = 82
        self.part_no = part_no
        self.part_total = part_total


cdef class NetworkRequest(PyMessage):
    cdef public int __id__
    cdef public str type
    cdef public str method
    cdef public str url
    cdef public str request
    cdef public str response
    cdef public unsigned long status
    cdef public unsigned long timestamp
    cdef public unsigned long duration
    cdef public unsigned long transferred_body_size

    def __init__(self, str type, str method, str url, str request, str response, unsigned long status, unsigned long timestamp, unsigned long duration, unsigned long transferred_body_size):
        self.__id__ = 83
        self.type = type
        self.method = method
        self.url = url
        self.request = request
        self.response = response
        self.status = status
        self.timestamp = timestamp
        self.duration = duration
        self.transferred_body_size = transferred_body_size


cdef class WSChannel(PyMessage):
    cdef public int __id__
    cdef public str ch_type
    cdef public str channel_name
    cdef public str data
    cdef public unsigned long timestamp
    cdef public str dir
    cdef public str message_type

    def __init__(self, str ch_type, str channel_name, str data, unsigned long timestamp, str dir, str message_type):
        self.__id__ = 84
        self.ch_type = ch_type
        self.channel_name = channel_name
        self.data = data
        self.timestamp = timestamp
        self.dir = dir
        self.message_type = message_type


cdef class InputChange(PyMessage):
    cdef public int __id__
    cdef public unsigned long id
    cdef public str value
    cdef public bint value_masked
    cdef public str label
    cdef public long hesitation_time
    cdef public long input_duration

    def __init__(self, unsigned long id, str value, bint value_masked, str label, long hesitation_time, long input_duration):
        self.__id__ = 112
        self.id = id
        self.value = value
        self.value_masked = value_masked
        self.label = label
        self.hesitation_time = hesitation_time
        self.input_duration = input_duration


cdef class SelectionChange(PyMessage):
    cdef public int __id__
    cdef public unsigned long selection_start
    cdef public unsigned long selection_end
    cdef public str selection

    def __init__(self, unsigned long selection_start, unsigned long selection_end, str selection):
        self.__id__ = 113
        self.selection_start = selection_start
        self.selection_end = selection_end
        self.selection = selection


cdef class MouseThrashing(PyMessage):
    cdef public int __id__
    cdef public unsigned long timestamp

    def __init__(self, unsigned long timestamp):
        self.__id__ = 114
        self.timestamp = timestamp


cdef class UnbindNodes(PyMessage):
    cdef public int __id__
    cdef public unsigned long total_removed_percent

    def __init__(self, unsigned long total_removed_percent):
        self.__id__ = 115
        self.total_removed_percent = total_removed_percent


cdef class ResourceTiming(PyMessage):
    cdef public int __id__
    cdef public unsigned long timestamp
    cdef public unsigned long duration
    cdef public unsigned long ttfb
    cdef public unsigned long header_size
    cdef public unsigned long encoded_body_size
    cdef public unsigned long decoded_body_size
    cdef public str url
    cdef public str initiator
    cdef public unsigned long transferred_size
    cdef public bint cached

    def __init__(self, unsigned long timestamp, unsigned long duration, unsigned long ttfb, unsigned long header_size, unsigned long encoded_body_size, unsigned long decoded_body_size, str url, str initiator, unsigned long transferred_size, bint cached):
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


cdef class TabChange(PyMessage):
    cdef public int __id__
    cdef public str tab_id

    def __init__(self, str tab_id):
        self.__id__ = 117
        self.tab_id = tab_id


cdef class TabData(PyMessage):
    cdef public int __id__
    cdef public str tab_id

    def __init__(self, str tab_id):
        self.__id__ = 118
        self.tab_id = tab_id


cdef class CanvasNode(PyMessage):
    cdef public int __id__
    cdef public str node_id
    cdef public unsigned long timestamp

    def __init__(self, str node_id, unsigned long timestamp):
        self.__id__ = 119
        self.node_id = node_id
        self.timestamp = timestamp


cdef class TagTrigger(PyMessage):
    cdef public int __id__
    cdef public long tag_id

    def __init__(self, long tag_id):
        self.__id__ = 120
        self.tag_id = tag_id


cdef class IssueEvent(PyMessage):
    cdef public int __id__
    cdef public unsigned long message_id
    cdef public unsigned long timestamp
    cdef public str type
    cdef public str context_string
    cdef public str context
    cdef public str payload
    cdef public str url

    def __init__(self, unsigned long message_id, unsigned long timestamp, str type, str context_string, str context, str payload, str url):
        self.__id__ = 125
        self.message_id = message_id
        self.timestamp = timestamp
        self.type = type
        self.context_string = context_string
        self.context = context
        self.payload = payload
        self.url = url


cdef class SessionEnd(PyMessage):
    cdef public int __id__
    cdef public unsigned long timestamp
    cdef public str encryption_key

    def __init__(self, unsigned long timestamp, str encryption_key):
        self.__id__ = 126
        self.timestamp = timestamp
        self.encryption_key = encryption_key


cdef class SessionSearch(PyMessage):
    cdef public int __id__
    cdef public unsigned long timestamp
    cdef public unsigned long partition

    def __init__(self, unsigned long timestamp, unsigned long partition):
        self.__id__ = 127
        self.timestamp = timestamp
        self.partition = partition


cdef class IOSSessionStart(PyMessage):
    cdef public int __id__
    cdef public unsigned long timestamp
    cdef public unsigned long project_id
    cdef public str tracker_version
    cdef public str rev_id
    cdef public str user_uuid
    cdef public str user_os
    cdef public str user_os_version
    cdef public str user_device
    cdef public str user_device_type
    cdef public str user_country

    def __init__(self, unsigned long timestamp, unsigned long project_id, str tracker_version, str rev_id, str user_uuid, str user_os, str user_os_version, str user_device, str user_device_type, str user_country):
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


cdef class IOSSessionEnd(PyMessage):
    cdef public int __id__
    cdef public unsigned long timestamp

    def __init__(self, unsigned long timestamp):
        self.__id__ = 91
        self.timestamp = timestamp


cdef class IOSMetadata(PyMessage):
    cdef public int __id__
    cdef public unsigned long timestamp
    cdef public unsigned long length
    cdef public str key
    cdef public str value

    def __init__(self, unsigned long timestamp, unsigned long length, str key, str value):
        self.__id__ = 92
        self.timestamp = timestamp
        self.length = length
        self.key = key
        self.value = value


cdef class IOSEvent(PyMessage):
    cdef public int __id__
    cdef public unsigned long timestamp
    cdef public unsigned long length
    cdef public str name
    cdef public str payload

    def __init__(self, unsigned long timestamp, unsigned long length, str name, str payload):
        self.__id__ = 93
        self.timestamp = timestamp
        self.length = length
        self.name = name
        self.payload = payload


cdef class IOSUserID(PyMessage):
    cdef public int __id__
    cdef public unsigned long timestamp
    cdef public unsigned long length
    cdef public str id

    def __init__(self, unsigned long timestamp, unsigned long length, str id):
        self.__id__ = 94
        self.timestamp = timestamp
        self.length = length
        self.id = id


cdef class IOSUserAnonymousID(PyMessage):
    cdef public int __id__
    cdef public unsigned long timestamp
    cdef public unsigned long length
    cdef public str id

    def __init__(self, unsigned long timestamp, unsigned long length, str id):
        self.__id__ = 95
        self.timestamp = timestamp
        self.length = length
        self.id = id


cdef class IOSScreenChanges(PyMessage):
    cdef public int __id__
    cdef public unsigned long timestamp
    cdef public unsigned long length
    cdef public unsigned long x
    cdef public unsigned long y
    cdef public unsigned long width
    cdef public unsigned long height

    def __init__(self, unsigned long timestamp, unsigned long length, unsigned long x, unsigned long y, unsigned long width, unsigned long height):
        self.__id__ = 96
        self.timestamp = timestamp
        self.length = length
        self.x = x
        self.y = y
        self.width = width
        self.height = height


cdef class IOSCrash(PyMessage):
    cdef public int __id__
    cdef public unsigned long timestamp
    cdef public unsigned long length
    cdef public str name
    cdef public str reason
    cdef public str stacktrace

    def __init__(self, unsigned long timestamp, unsigned long length, str name, str reason, str stacktrace):
        self.__id__ = 97
        self.timestamp = timestamp
        self.length = length
        self.name = name
        self.reason = reason
        self.stacktrace = stacktrace


cdef class IOSViewComponentEvent(PyMessage):
    cdef public int __id__
    cdef public unsigned long timestamp
    cdef public unsigned long length
    cdef public str screen_name
    cdef public str view_name
    cdef public bint visible

    def __init__(self, unsigned long timestamp, unsigned long length, str screen_name, str view_name, bint visible):
        self.__id__ = 98
        self.timestamp = timestamp
        self.length = length
        self.screen_name = screen_name
        self.view_name = view_name
        self.visible = visible


cdef class IOSClickEvent(PyMessage):
    cdef public int __id__
    cdef public unsigned long timestamp
    cdef public unsigned long length
    cdef public str label
    cdef public unsigned long x
    cdef public unsigned long y

    def __init__(self, unsigned long timestamp, unsigned long length, str label, unsigned long x, unsigned long y):
        self.__id__ = 100
        self.timestamp = timestamp
        self.length = length
        self.label = label
        self.x = x
        self.y = y


cdef class IOSInputEvent(PyMessage):
    cdef public int __id__
    cdef public unsigned long timestamp
    cdef public unsigned long length
    cdef public str value
    cdef public bint value_masked
    cdef public str label

    def __init__(self, unsigned long timestamp, unsigned long length, str value, bint value_masked, str label):
        self.__id__ = 101
        self.timestamp = timestamp
        self.length = length
        self.value = value
        self.value_masked = value_masked
        self.label = label


cdef class IOSPerformanceEvent(PyMessage):
    cdef public int __id__
    cdef public unsigned long timestamp
    cdef public unsigned long length
    cdef public str name
    cdef public unsigned long value

    def __init__(self, unsigned long timestamp, unsigned long length, str name, unsigned long value):
        self.__id__ = 102
        self.timestamp = timestamp
        self.length = length
        self.name = name
        self.value = value


cdef class IOSLog(PyMessage):
    cdef public int __id__
    cdef public unsigned long timestamp
    cdef public unsigned long length
    cdef public str severity
    cdef public str content

    def __init__(self, unsigned long timestamp, unsigned long length, str severity, str content):
        self.__id__ = 103
        self.timestamp = timestamp
        self.length = length
        self.severity = severity
        self.content = content


cdef class IOSInternalError(PyMessage):
    cdef public int __id__
    cdef public unsigned long timestamp
    cdef public unsigned long length
    cdef public str content

    def __init__(self, unsigned long timestamp, unsigned long length, str content):
        self.__id__ = 104
        self.timestamp = timestamp
        self.length = length
        self.content = content


cdef class IOSNetworkCall(PyMessage):
    cdef public int __id__
    cdef public unsigned long timestamp
    cdef public unsigned long length
    cdef public str type
    cdef public str method
    cdef public str url
    cdef public str request
    cdef public str response
    cdef public unsigned long status
    cdef public unsigned long duration

    def __init__(self, unsigned long timestamp, unsigned long length, str type, str method, str url, str request, str response, unsigned long status, unsigned long duration):
        self.__id__ = 105
        self.timestamp = timestamp
        self.length = length
        self.type = type
        self.method = method
        self.url = url
        self.request = request
        self.response = response
        self.status = status
        self.duration = duration


cdef class IOSSwipeEvent(PyMessage):
    cdef public int __id__
    cdef public unsigned long timestamp
    cdef public unsigned long length
    cdef public str label
    cdef public unsigned long x
    cdef public unsigned long y
    cdef public str direction

    def __init__(self, unsigned long timestamp, unsigned long length, str label, unsigned long x, unsigned long y, str direction):
        self.__id__ = 106
        self.timestamp = timestamp
        self.length = length
        self.label = label
        self.x = x
        self.y = y
        self.direction = direction


cdef class IOSBatchMeta(PyMessage):
    cdef public int __id__
    cdef public unsigned long timestamp
    cdef public unsigned long length
    cdef public unsigned long first_index

    def __init__(self, unsigned long timestamp, unsigned long length, unsigned long first_index):
        self.__id__ = 107
        self.timestamp = timestamp
        self.length = length
        self.first_index = first_index


cdef class IOSPerformanceAggregated(PyMessage):
    cdef public int __id__
    cdef public unsigned long timestamp_start
    cdef public unsigned long timestamp_end
    cdef public unsigned long min_fps
    cdef public unsigned long avg_fps
    cdef public unsigned long max_fps
    cdef public unsigned long min_cpu
    cdef public unsigned long avg_cpu
    cdef public unsigned long max_cpu
    cdef public unsigned long min_memory
    cdef public unsigned long avg_memory
    cdef public unsigned long max_memory
    cdef public unsigned long min_battery
    cdef public unsigned long avg_battery
    cdef public unsigned long max_battery

    def __init__(self, unsigned long timestamp_start, unsigned long timestamp_end, unsigned long min_fps, unsigned long avg_fps, unsigned long max_fps, unsigned long min_cpu, unsigned long avg_cpu, unsigned long max_cpu, unsigned long min_memory, unsigned long avg_memory, unsigned long max_memory, unsigned long min_battery, unsigned long avg_battery, unsigned long max_battery):
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


cdef class IOSIssueEvent(PyMessage):
    cdef public int __id__
    cdef public unsigned long timestamp
    cdef public str type
    cdef public str context_string
    cdef public str context
    cdef public str payload

    def __init__(self, unsigned long timestamp, str type, str context_string, str context, str payload):
        self.__id__ = 111
        self.timestamp = timestamp
        self.type = type
        self.context_string = context_string
        self.context = context
        self.payload = payload


