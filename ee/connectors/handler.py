from typing import Optional, Union

from db.models import Event, DetailedEvent, Session
from messages import *


def handle_normal_message(message: Message) -> Optional[Event]:

    n = Event()

    if isinstance(message, ConnectionInformation):
        n.connectioninformation_downlink = message.downlink
        n.connectioninformation_type = message.type
        return n

    if isinstance(message, ConsoleLog):
        n.consolelog_level = message.level
        n.consolelog_value = message.value
        return n

    if isinstance(message, CustomEvent):
        n.customevent_name = message.name
        n.customevent_payload = message.payload
        return n

    if isinstance(message, Metadata):
        n.metadata_key = message.key
        n.metadata_value = message.value
        return n

    if isinstance(message, MouseClick):
        n.clickevent_hesitationtime = message.hesitation_time
        n.clickevent_messageid = message.id
        n.clickevent_label = message.label
        n.clickevent_selector = message.selector
        return n

    if isinstance(message, NetworkRequest):
        n.networkrequest_type = message.type
        n.networkrequest_method = message.method
        n.networkrequest_url = message.url
        n.networkrequest_request = message.request
        n.networkrequest_response = message.response
        n.networkrequest_status = message.status
        n.networkrequest_timestamp = message.timestamp
        n.networkrequest_duration = message.duration
        return n

    if isinstance(message, PageEvent):
        n.pageevent_firstcontentfulpaint = message.first_contentful_paint
        n.pageevent_firstpaint = message.first_paint
        n.pageevent_messageid = message.message_id
        n.pageevent_referrer = message.referrer
        n.pageevent_speedindex = message.speed_index
        n.pageevent_timestamp = message.timestamp
        n.pageevent_url = message.url
        return n

    if isinstance(message, PageRenderTiming):
        n.pagerendertiming_timetointeractive = message.time_to_interactive
        n.pagerendertiming_visuallycomplete = message.visually_complete
        return n

    if isinstance(message, SetViewportSize):
        n.setviewportsize_height = message.height
        n.setviewportsize_width = message.width
        return n

    if isinstance(message, Timestamp):
        n.timestamp_timestamp = message.timestamp
        return n

    if isinstance(message, UserAnonymousID):
        n.user_anonymous_id = message.id
        return n

    if isinstance(message, UserID):
        if message.id != '':
            n.user_id = message.id
        return n

    if isinstance(message, IssueEvent):
        n.issueevent_messageid = message.message_id
        n.issueevent_timestamp = message.timestamp
        n.issueevent_type = message.type
        n.issueevent_context_string = message.context_string
        n.issueevent_context = message.context
        n.issueevent_payload = message.payload
        n.issueevent_url = message.url
        return n

    if isinstance(message, CustomIssue):
        n.customissue_name = message.name
        n.customissue_payload = message.payload
        return n


def handle_session(n: Session, message: Message) -> Optional[Session]:

    if not n:
        n = Session()

    if isinstance(message, SessionStart):
        n.session_start_timestamp = message.timestamp

        n.user_uuid = message.user_uuid
        n.user_agent = message.user_agent
        n.user_os = message.user_os
        n.user_os_version = message.user_os_version
        n.user_browser = message.user_browser
        n.user_browser_version = message.user_browser_version
        n.user_device = message.user_device
        n.user_device_type = message.user_device_type
        n.user_device_memory_size = message.user_device_memory_size
        n.user_device_heap_size = message.user_device_heap_size
        n.user_country = message.user_country.split('|')[0]
        return n

    if isinstance(message, SessionEnd):
        n.session_end_timestamp = message.timestamp
        try:
            n.session_duration = n.session_end_timestamp - n.session_start_timestamp
        except TypeError:
            pass
        return n

    if isinstance(message, BatchMeta):
        n.batchmeta_page_no = message.page_no
        n.batchmeta_first_index = message.first_index
        n.batchmeta_timestamp = message.timestamp
        return n

    if isinstance(message, BatchMetadata):
        n.batchmetadata_version = message.version
        n.batchmetadata_page_no = message.page_no
        n.batchmetadata_first_index = message.first_index
        n.batchmetadata_timestamp = message.timestamp
        n.batchmetadata_location = message.location
        return n


    if isinstance(message, PartitionedMessage):
        n.partitionedmessage_part_no = message.part_no
        n.partitionedmessage_part_total = message.part_total
        return n

    # if isinstance(message, IOSBatchMeta):
    #     n.iosbatchmeta_page_no = message.page_no
    #     n.iosbatchmeta_first_index = message.first_index
    #     n.iosbatchmeta_timestamp = message.timestamp
    #     return n

    if isinstance(message, ConnectionInformation):
        n.connection_effective_bandwidth = message.downlink
        n.connection_type = message.type
        return n

    if isinstance(message, Metadata):
        n.metadata_key = message.key
        n.metadata_value = message.value
        return n

    if isinstance(message, PageEvent):
        n.referrer = message.referrer
        n.first_contentful_paint = message.first_contentful_paint
        n.speed_index = message.speed_index
        n.timing_time_to_interactive = message.time_to_interactive
        n.visually_complete = message.visually_complete
        try:
            n.urls_count += 1
        except TypeError:
            n.urls_count = 1
        #itry:
        #    n.urls.append(message.url)
        #except AttributeError:
        #    n.urls = [message.url]
        return n

    if isinstance(message, PerformanceTrackAggr):
        n.avg_cpu = message.avg_cpu
        n.avg_fps = message.avg_fps
        n.max_cpu = message.max_cpu
        n.max_fps = message.max_fps
        n.max_total_js_heap_size = message.max_total_js_heap_size
        n.max_used_js_heap_size = message.max_used_js_heap_size
        return n

    if isinstance(message, UserID):
        try:
            if message.id != '':
                n.user_id = message.id
        except AttributeError as e:
            print(f'Session current type: {type(n)}')
            print(f'Message id: {message.id}')
            raise e
        return n

    if isinstance(message, UserAnonymousID):
        n.user_anonymous_id = message.id
        return n

    if isinstance(message, JSException) or isinstance(message, JSExceptionDeprecated):
        try:
            n.js_exceptions_count += 1
        except TypeError:
            n.js_exceptions_count = 1
        return n

    #if isinstance(message, LongTask):
    #    try:
    #        n.long_tasks_total_duration += message.duration
    #    except TypeError:
    #        n.long_tasks_total_duration = message.duration

    #    try:
    #        if n.long_tasks_max_duration > message.duration:
    #            n.long_tasks_max_duration = message.duration
    #    except TypeError:
    #        n.long_tasks_max_duration = message.duration

    #    try:
    #        n.long_tasks_count += 1
    #    except TypeError:
    #        n.long_tasks_count = 1
    #    return n

    if isinstance(message, InputEvent):
        try:
            n.inputs_count += 1
        except TypeError:
            n.inputs_count = 1
        return n

    if isinstance(message, MouseClick):
        try:
            n.clicks_count += 1
        except TypeError:
            n.clicks_count = 1
        return n

    if isinstance(message, IssueEvent) or isinstance(message, IssueEventDeprecated):
        try:
            n.issues_count += 1
        except TypeError:
            n.issues_count = 1

        #try:
        #    n.issues.append(message.type)
        #except AttributeError:
        #    n.issues = [message.type]
        return n


def handle_message(message: Message) -> Optional[DetailedEvent]:
    n = DetailedEvent()

    # if isinstance(message, SessionEnd):
    #     n.sessionend = True
    #     n.sessionend_timestamp = message.timestamp
    #     return n

    if isinstance(message, Timestamp):
        n.timestamp_timestamp = message.timestamp
        return n

    if isinstance(message, SessionStart):
        n.sessionstart_trackerversion = message.tracker_version
        n.sessionstart_revid = message.rev_id
        n.sessionstart_timestamp = message.timestamp
        n.sessionstart_useruuid = message.user_uuid
        n.sessionstart_useragent = message.user_agent
        n.sessionstart_useros = message.user_os
        n.sessionstart_userosversion = message.user_os_version
        n.sessionstart_userbrowser = message.user_browser
        n.sessionstart_userbrowserversion = message.user_browser_version
        n.sessionstart_userdevice = message.user_device
        n.sessionstart_userdevicetype = message.user_device_type
        n.sessionstart_userdevicememorysize = message.user_device_memory_size
        n.sessionstart_userdeviceheapsize = message.user_device_heap_size
        n.sessionstart_usercountry = message.user_country
        return n

    if isinstance(message, CreateIFrameDocument):
        n.create_iframedocument_frame_id = message.frame_id
        n.create_iframedocument_id = message.id
        return n

    if isinstance(message, SetViewportSize):
        n.setviewportsize_width = message.width
        n.setviewportsize_height = message.height
        return n

    if isinstance(message, SetViewportScroll):
        n.setviewportscroll_x = message.x
        n.setviewportscroll_y = message.y
        return n

    if isinstance(message, SetNodeScroll):
        n.setnodescroll_id = message.id
        n.setnodescroll_x = message.x
        n.setnodescroll_y = message.y
        return n

    if isinstance(message, ConsoleLog):
        n.consolelog_level = message.level
        n.consolelog_value = message.value
        return n

    if isinstance(message, PageLoadTiming):
        n.pageloadtiming_requeststart = message.request_start
        n.pageloadtiming_responsestart = message.response_start
        n.pageloadtiming_responseend = message.response_end
        n.pageloadtiming_domcontentloadedeventstart = message.dom_content_loaded_event_start
        n.pageloadtiming_domcontentloadedeventend = message.dom_content_loaded_event_end
        n.pageloadtiming_loadeventstart = message.load_event_start
        n.pageloadtiming_loadeventend = message.load_event_end
        n.pageloadtiming_firstpaint = message.first_paint
        n.pageloadtiming_firstcontentfulpaint = message.first_contentful_paint
        return n

    if isinstance(message, PageRenderTiming):
        n.pagerendertiming_speedindex = message.speed_index
        n.pagerendertiming_visuallycomplete = message.visually_complete
        n.pagerendertiming_timetointeractive = message.time_to_interactive
        return n

    # if isinstance(message, ResourceTiming):
    #     n.resourcetiming_timestamp = message.timestamp
    #     n.resourcetiming_duration = message.duration
    #     n.resourcetiming_ttfb = message.ttfb
    #     n.resourcetiming_headersize = message.header_size
    #     n.resourcetiming_encodedbodysize = message.encoded_body_size
    #     n.resourcetiming_decodedbodysize = message.decoded_body_size
    #     n.resourcetiming_url = message.url
    #     n.resourcetiming_initiator = message.initiator
    #     return n



    if isinstance(message, IntegrationEvent):
        n.integrationevent_timestamp = message.timestamp
        n.integrationevent_source = message.source
        n.integrationevent_name = message.name
        n.integrationevent_message = message.message
        n.integrationevent_payload = message.payload
        return n


    if isinstance(message, UserID):
        if message.id != '':
            n.userid_id = message.id
        return n

    if isinstance(message, UserAnonymousID):
        n.useranonymousid_id = message.id
        return n

    if isinstance(message, Metadata):
        n.metadata_key = message.key
        n.metadata_value = message.value
        return n

    if isinstance(message, BatchMeta):
        n.batchmeta_page_no = message.page_no
        n.batchmeta_first_index = message.first_index
        n.batchmeta_timestamp = message.timestamp
        return n

    if isinstance(message, BatchMetadata):
        n.batchmetadata_version = message.version
        n.batchmetadata_page_no = message.page_no
        n.batchmetadata_first_index = message.first_index
        n.batchmetadata_timestamp = message.timestamp
        n.batchmetadata_location = message.location
        return n

    if isinstance(message, PartitionedMessage):
        n.partitionedmessage_part_no = message.part_no
        n.partitionedmessage_part_total = message.part_total
        return n

    if isinstance(message, InputChange):
        n.inputchange_id=message.id
        n.inputchange_value=message.value
        n.inputchange_value_masked=message.value_masked
        n.inputchange_label=message.label
        n.inputchange_hesitation_time=message.hesitation_time
        n.inputchange_input_duration=message.input_duration
        return n


    if isinstance(message, SelectionChange):
        n.selectionchange_selection_start=message.selection_start
        n.selectionchange_selection_end=message.selection_end
        n.selectionchange_selection=message.selection
        return n

    if isinstance(message, MouseThrashing):
        n.mousethrashing_timestamp=message.timestamp
        return n

    if isinstance(message, UnbindNodes):
        n.unbindnodes_total_removed_percent=message.total_removed_percent
        return n


    if isinstance(message, ResourceTiming):
        n.resourcetiming_timestamp=message.timestamp
        n.resourcetiming_duration=message.duration
        n.resourcetiming_ttfb=message.ttfb
        n.resourcetiming_header_size=message.header_size
        n.resourcetiming_encoded_body_size=message.encoded_body_size
        n.resourcetiming_decoded_body_size=message.decoded_body_size
        n.resourcetiming_url=message.url
        n.resourcetiming_initiator=message.initiator
        n.resourcetiming_transferred_size=message.transferred_size
        n.resourcetiming_cached=message.cached
        return n


    if isinstance(message, IssueEvent):
        n.issueevent_message_id=message.message_id
        n.issueevent_timestamp=message.timestamp
        n.issueevent_type=message.type
        n.issueevent_context_string=message.context_string
        n.issueevent_context=message.context
        n.issueevent_payload=message.payload
        n.issueevent_url=message.url
        return n

    if isinstance(message, SessionEnd):
        n.sessionend_timestamp=message.timestamp
        n.sessionend_encryption_key=message.encryption_key
        return n


    if isinstance(message, SessionSearch):
        n.sessionsearch_timestamp=message.timestamp
        n.sessionsearch_partition=message.partition
        return n


    if isinstance(message, PerformanceTrack):
        n.performancetrack_frames = message.frames
        n.performancetrack_ticks = message.ticks
        n.performancetrack_totaljsheapsize = message.total_js_heap_size
        n.performancetrack_usedjsheapsize = message.used_js_heap_size
        return n

    if isinstance(message, PerformanceTrackAggr):
        n.performancetrackaggr_timestampstart = message.timestamp_start
        n.performancetrackaggr_timestampend = message.timestamp_end
        n.performancetrackaggr_minfps = message.min_fps
        n.performancetrackaggr_avgfps = message.avg_fps
        n.performancetrackaggr_maxfps = message.max_fps
        n.performancetrackaggr_mincpu = message.min_cpu
        n.performancetrackaggr_avgcpu = message.avg_cpu
        n.performancetrackaggr_maxcpu = message.max_cpu
        n.performancetrackaggr_mintotaljsheapsize = message.min_total_js_heap_size
        n.performancetrackaggr_avgtotaljsheapsize = message.avg_total_js_heap_size
        n.performancetrackaggr_maxtotaljsheapsize = message.max_total_js_heap_size
        n.performancetrackaggr_minusedjsheapsize = message.min_used_js_heap_size
        n.performancetrackaggr_avgusedjsheapsize = message.avg_used_js_heap_size
        n.performancetrackaggr_maxusedjsheapsize = message.max_used_js_heap_size
        return n

    if isinstance(message, ConnectionInformation):
        n.connectioninformation_downlink = message.downlink
        n.connectioninformation_type = message.type
        return n

    if isinstance(message, PageEvent):
        n.pageevent_messageid = message.message_id
        n.pageevent_timestamp = message.timestamp
        n.pageevent_url = message.url
        n.pageevent_referrer = message.referrer
        n.pageevent_loaded = message.loaded
        n.pageevent_requeststart = message.request_start
        n.pageevent_responsestart = message.response_start
        n.pageevent_responseend = message.response_end
        n.pageevent_domcontentloadedeventstart = message.dom_content_loaded_event_start
        n.pageevent_domcontentloadedeventend = message.dom_content_loaded_event_end
        n.pageevent_loadeventstart = message.load_event_start
        n.pageevent_loadeventend = message.load_event_end
        n.pageevent_firstpaint = message.first_paint
        n.pageevent_firstcontentfulpaint = message.first_contentful_paint
        n.pageevent_speedindex = message.speed_index
        return n

    if isinstance(message, InputEvent):
        n.inputevent_messageid = message.message_id
        n.inputevent_timestamp = message.timestamp
        n.inputevent_value = message.value
        n.inputevent_valuemasked = message.value_masked
        n.inputevent_label = message.label
        return n

    if isinstance(message, CustomEvent):
        n.customevent_name = message.name
        n.customevent_payload = message.payload
        return n

    if isinstance(message, LoadFontFace):
        n.loadfontface_parent_id = message.parent_id
        n.loadfontface_family = message.family
        n.loadfontface_source = message.source
        n.loadfontface_descriptors = message.descriptors
        return n

    if isinstance(message, SetNodeFocus):
        n.setnodefocus_id = message.id
        return n

    if isinstance(message, AdoptedSSReplaceURLBased):
        n.adoptedssreplaceurlbased_sheet_id = message.sheet_id
        n.adoptedssreplaceurlbased_text = message.text
        n.adoptedssreplaceurlbased_base_url = message.base_url
        return n

    if isinstance(message, AdoptedSSReplace):
        n.adoptedssreplace_sheet_id = message.sheet_id
        n.adoptedssreplace_text = message.text
        return n

    if isinstance(message, AdoptedSSInsertRuleURLBased):
        n.adoptedssinsertruleurlbased_sheet_id = message.sheet_id
        n.adoptedssinsertruleurlbased_rule = message.rule
        n.adoptedssinsertruleurlbased_index = message.index
        n.adoptedssinsertruleurlbased_base_url = message.base_url
        return n

    if isinstance(message, AdoptedSSInsertRule):
        n.adoptedssinsertrule_sheet_id = message.sheet_id
        n.adoptedssinsertrule_rule = message.rule
        n.adoptedssinsertrule_index = message.index
        return n

    if isinstance(message, AdoptedSSDeleteRule):
        n.adoptedssdeleterule_sheet_id = message.sheet_id
        n.adoptedssdeleterule_index = message.index
        return n

    if isinstance(message, AdoptedSSAddOwner):
        n.adoptedssaddowner_sheet_id = message.sheet_id
        n.adoptedssaddowner_id = message.id
        return n

    if isinstance(message, AdoptedSSRemoveOwner):
        n.adoptedssremoveowner_sheet_id = message.sheet_id
        n.adoptedssremoveowner_id = message.id
        return n

    if isinstance(message, JSException):
        n.jsexception_name = message.name
        n.jsexception_message = message.message
        n.jsexception_payload = message.payload
        n.jsexception_metadata = message.metadata
        return n

    if isinstance(message, Zustand):
        n.zustand_mutation = message.mutation
        n.zustand_state = message.state
        return n

    # if isinstance(message, CreateDocument):
    #     n.createdocument = True
    #     return n
    #
    # if isinstance(message, CreateElementNode):
    #     n.createelementnode_id = message.id
    #     if isinstance(message.parent_id, tuple):
    #         n.createelementnode_parentid = message.parent_id[0]
    #     else:
    #         n.createelementnode_parentid = message.parent_id
    #     return n

    # if isinstance(message, CSSInsertRule):
    #     n.cssinsertrule_stylesheetid = message.id
    #     n.cssinsertrule_rule = message.rule
    #     n.cssinsertrule_index = message.index
    #     return n

    # if isinstance(message, CSSInsertRuleURLBased):
    #     n.cssinsertrule_urlbased_id = message.id
    #     n.cssinsertrule_urlbased_rule = message.rule
    #     n.cssinsertrule_urlbased_index = message.index
    #     n.cssinsertrule_urlbased_base_url = message.base_url
    #
    # if isinstance(message, CSSDeleteRule):
    #     n.cssdeleterule_stylesheetid = message.id
    #     n.cssdeleterule_index = message.index
    #     return n

    if isinstance(message, Fetch):
        n.fetch_method = message.method
        n.fetch_url = message.url
        n.fetch_request = message.request
        n.fetch_status = message.status
        n.fetch_timestamp = message.timestamp
        n.fetch_duration = message.duration
        return n

    if isinstance(message, SetNodeAttributeDict):
        n.setnodeattributedict_id = message.id,
        n.setnodeattributedict_name_key = message.name_key
        n.setnodeattributedict_value_key = message.value_key
        return n

    if isinstance(message, Profiler):
        n.profiler_name = message.name
        n.profiler_duration = message.duration
        n.profiler_args = message.args
        n.profiler_result = message.result
        return n

    if isinstance(message, GraphQL):
        n.graphql_operationkind = message.operation_kind
        n.graphql_operationname = message.operation_name
        n.graphql_variables = message.variables
        n.graphql_response = message.response
        return n

    if isinstance(message, MouseClick):
        n.mouseclick_id = message.id
        n.mouseclick_hesitationtime = message.hesitation_time
        n.mouseclick_label = message.label
        n.mouseclick_selector = message.selector
        return n

    if isinstance(message, SetPageLocation):
        n.setpagelocation_url = message.url
        n.setpagelocation_referrer = message.referrer
        n.setpagelocation_navigationstart = message.navigation_start
        return n

    if isinstance(message, MouseMove):
        n.mousemove_x = message.x
        n.mousemove_y = message.y
        return n

    if isinstance(message, LongTask):
        n.longtasks_timestamp = message.timestamp
        n.longtasks_duration = message.duration
        n.longtask_context = message.context
        n.longtask_containertype = message.container_type
        n.longtasks_containersrc = message.container_src
        n.longtasks_containerid = message.container_id
        n.longtasks_containername = message.container_name
        return n

    #if isinstance(message, IssueEvent):
    #    n.issueevent_message_id = message.message_id
    #    n.issueevent_timestamp = message.timestamp
    #    n.issueevent_type = message.type
    #    n.issueevent_context_string = message.context_string
    #    n.issueevent_context = message.context
    #    n.issueevent_payload = message.payload
    #    n.issueevent_url = message.url
    #    return n

    if isinstance(message, TechnicalInfo):
        n.technicalinfo_type = message.type
        n.technicalinfo_value = message.value
        return n

    if isinstance(message, CustomIssue):
        n.customissue_name = message.name
        n.customissue_payload = message.payload
        return n

    if isinstance(message, AssetCache):
        n.asset_cache_url = message.url
        return n

    if isinstance(message, IOSSessionStart):
        n.iossessionstart_timestamp = message.timestamp
        n.iossessionstart_projectid = message.project_id
        n.iossessionstart_trackerversion = message.tracker_version
        n.iossessionstart_revid = message.rev_id
        n.iossessionstart_useruuid = message.user_uuid
        n.iossessionstart_useros = message.user_os
        n.iossessionstart_userosversion = message.user_os_version
        n.iossessionstart_userdevice = message.user_device
        n.iossessionstart_userdevicetype = message.user_device_type
        n.iossessionstart_usercountry = message.user_country
        return n

    if isinstance(message, IOSSessionEnd):
        n.iossessionend_timestamp = message.timestamp
        return n

    if isinstance(message, IOSMetadata):
        n.iosmetadata_timestamp = message.timestamp
        n.iosmetadata_length = message.length
        n.iosmetadata_key = message.key
        n.iosmetadata_value = message.value
        return n

    if isinstance(message, IOSBatchMeta):
        n.iosbatchmeta_lenght = message.length
        n.iosbatchmeta_first_index = message.first_index
        n.iosbatchmeta_timestamp = message.timestamp
        return n

    if isinstance(message, IOSUserID):
        n.iosuserid_timestamp = message.timestamp
        n.iosuserid_length = message.length
        n.iosuserid_id = message.id
        return n

    if isinstance(message, IOSUserAnonymousID):
        n.iosuseranonymousid_timestamp = message.timestamp
        n.iosuseranonymousid_length = message.length
        n.iosuseranonymousid_id = message.id
        return n

    if isinstance(message, IOSScreenEnter):
        n.iosscreenenter_timestamp = message.timestamp
        n.iosscreenenter_length = message.length
        n.iosscreenenter_title = message.title
        n.iosscreenenter_view_name = message.view_name
        return n

    if isinstance(message, IOSScreenLeave):
        n.iosscreenleave_timestamp = message.timestamp
        n.iosscreenleave_length = message.length
        n.iosscreenleave_title = message.title
        n.iosscreenleave_viewname = message.view_name
        return n

    if isinstance(message, IOSScreenChanges):
        n.iosscreenchanges_timestamp = message.timestamp
        n.iosscreenchanges_length = message.length
        n.iosscreenchanges_x = message.x
        n.iosscreenchanges_y = message.y
        n.iosscreenchanges_width = message.width
        n.iosscreenchanges_height = message.height
        return n

    if isinstance(message, IOSClickEvent):
        n.iosclickevent_timestamp = message.timestamp
        n.iosclickevent_length = message.length
        n.iosclickevent_label = message.label
        n.iosclickevent_x = message.x
        n.iosclickevent_y = message.y
        return n

    if isinstance(message, IOSInputEvent):
        n.iosinputevent_timestamp = message.timestamp
        n.iosinputevent_length = message.length
        n.iosinputevent_value_masked = message.value_masked
        n.iosinputevent_label = message.label
        return n

    if isinstance(message, IOSLog):
        n.ioslog_timestamp = message.timestamp
        n.ioslog_length = message.length
        n.ioslog_severity = message.severity
        n.ioslog_content = message.content
        return n

    if isinstance(message, IOSNetworkCall):
        n.iosnetworkcall_timestamp = message.timestamp
        n.iosnetworkcall_length = message.length
        n.iosnetworkcall_duration = message.duration
        n.iosnetworkcall_headers = message.headers
        n.iosnetworkcall_body = message.body
        n.iosnetworkcall_url = message.url
        n.iosnetworkcall_success = message.success
        n.iosnetworkcall_method = message.method
        n.iosnetworkcall_status = message.status
        return n

    if isinstance(message, IOSIssueEvent):
        n.iosissueevent_timestamp = message.timestamp
        n.iosissueevent_type = message.type
        n.iosissueevent_context_string = message.context_string
        n.iosissueevent_context = message.context
        n.iosissueevent_payload = message.payload
        return n

    if isinstance(message, IOSEvent):
        n.iosevent_timestamp = message.timestamp
        n.iosevent_length = message.length
        n.iosevent_name = message.name
        n.iosevent_payload = message.payload
        return n

    if isinstance(message, IOSInternalError):
        n.iosinternalerror_timestamp = message.timestamp
        n.iosinternalerror_length = message.length
        n.iosinternalerror_content = message.content
        return n

    if isinstance(message, IOSCrash):
        n.ioscrash_timestamp = message.timestamp
        n.ioscrash_length = message.length
        n.ioscrash_name = message.name
        n.ioscrash_reason = message.reason
        n.ioscrash_stacktrace = message.stacktrace
        return n

    if isinstance(message, IOSPerformanceEvent):
        n.iosperformanceevent_timestamp = message.timestamp
        n.iosperformanceevent_length = message.length
        n.iosperformanceevent_name = message.name
        n.iosperformanceevent_value = message.value
        return n

    if isinstance(message, IOSPerformanceAggregated):
        n.iosperformanceaggregated_timestampstart = message.timestamp_start
        n.iosperformanceaggregated_timestampend = message.timestamp_end
        n.iosperformanceaggregated_minfps = message.min_fps
        n.iosperformanceaggregated_avgfps = message.avg_fps
        n.iosperformanceaggregated_maxfps = message.max_fps
        n.iosperformanceaggregated_mincpu = message.min_cpu
        n.iosperformanceaggregated_avgcpu = message.avg_cpu
        n.iosperformanceaggregated_maxcpu = message.max_cpu
        n.iosperformanceaggregated_minmemory = message.min_memory
        n.iosperformanceaggregated_avgmemory = message.avg_memory
        n.iosperformanceaggregated_maxmemory = message.max_memory
        n.iosperformanceaggregated_minbattery = message.min_battery
        n.iosperformanceaggregated_avgbattery = message.avg_battery
        n.iosperformanceaggregated_maxbattery = message.max_battery
        return n
    return None
