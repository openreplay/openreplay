# coding: utf-8
from sqlalchemy import BigInteger, Boolean, Column, Integer, ARRAY, VARCHAR, text, VARCHAR
from sqlalchemy.ext.declarative import declarative_base
from pathlib import Path
from decouple import config

DATABASE = config('CLOUD_SERVICE')

Base = declarative_base()
metadata = Base.metadata

base_path = Path(__file__).parent.parent

# Get a table name from a configuration file
try:
    events_table_name = config('EVENTS_TABLE_NAME', default='connector_events')
except KeyError as e:
    events_table_name = None
    print(repr(e))
try:
    events_detailed_table_name = config('EVENTS_DETAILED_TABLE_NAME', default='connector_events_detailed')
except KeyError as e:
    print(repr(e))
    events_detailed_table_name = None
sessions_table_name = config('SESSIONS_TABLE', default='connector_user_sessions')


class Session(Base):
    __tablename__ = sessions_table_name

    sessionid = Column(BigInteger, primary_key=True)
    user_agent = Column(VARCHAR(5000))
    user_browser = Column(VARCHAR(5000))
    user_browser_version = Column(VARCHAR(5000))
    user_country = Column(VARCHAR(5000))
    user_device = Column(VARCHAR(5000))
    user_device_heap_size = Column(BigInteger)
    user_device_memory_size = Column(BigInteger)
    user_device_type = Column(VARCHAR(5000))
    user_os = Column(VARCHAR(5000))
    user_os_version = Column(VARCHAR(5000))
    user_uuid = Column(VARCHAR(5000))
    connection_effective_bandwidth = Column(BigInteger)  # Downlink
    connection_type = Column(VARCHAR(5000))  # "bluetooth", "cellular", "ethernet", "none", "wifi", "wimax", "other", "unknown"
    metadata_key = Column(VARCHAR(5000))
    metadata_value = Column(VARCHAR(5000))
    referrer = Column(VARCHAR(5000))
    user_anonymous_id = Column(VARCHAR(5000))
    user_id = Column(VARCHAR(5000))

    # TIME
    session_start_timestamp = Column(BigInteger)
    session_end_timestamp = Column(BigInteger)
    session_duration = Column(BigInteger)

    # SPEED INDEX RELATED
    first_contentful_paint = Column(BigInteger)
    speed_index = Column(BigInteger)
    visually_complete = Column(BigInteger)
    timing_time_to_interactive = Column(BigInteger)

    # PERFORMANCE
    avg_cpu = Column(Integer)
    avg_fps = Column(BigInteger)
    max_cpu = Column(Integer)
    max_fps = Column(BigInteger)
    max_total_js_heap_size = Column(BigInteger)
    max_used_js_heap_size = Column(BigInteger)

    # ISSUES AND EVENTS
    js_exceptions_count = Column(BigInteger)
    #long_tasks_total_duration = Column(BigInteger)
    #long_tasks_max_duration = Column(BigInteger)
    #long_tasks_count = Column(BigInteger)
    inputs_count = Column(BigInteger)
    clicks_count = Column(BigInteger)
    issues_count = Column(BigInteger)
    urls_count = Column(BigInteger)


class Event(Base):
    __tablename__ = events_table_name

    sessionid = Column(BigInteger, primary_key=True)
    consolelog_level = Column(VARCHAR(5000))
    consolelog_value = Column(VARCHAR(5000))
    customevent_name = Column(VARCHAR(5000))
    customevent_payload = Column(VARCHAR(5000))
    jsexception_message = Column(VARCHAR(5000))
    jsexception_name = Column(VARCHAR(5000))
    jsexception_payload = Column(VARCHAR(5000))
    jsexception_metadata = Column(VARCHAR(5000))
    networkrequest_type = Column(VARCHAR(5000))
    networkrequest_method = Column(VARCHAR(5000))
    networkrequest_url = Column(VARCHAR(5000))
    networkrequest_request = Column(VARCHAR(5000))
    networkrequest_response = Column(VARCHAR(5000))
    networkrequest_status = Column(BigInteger)
    networkrequest_timestamp = Column(BigInteger)
    networkrequest_duration = Column(BigInteger)
    issueevent_message_id = Column(BigInteger)
    issueevent_timestamp = Column(BigInteger)
    issueevent_type = Column(VARCHAR(5000))
    issueevent_context_string = Column(VARCHAR(5000))
    issueevent_context = Column(VARCHAR(5000))
    issueevent_payload = Column(VARCHAR(5000))
    issueevent_url = Column(VARCHAR(5000))
    customissue_name = Column(VARCHAR(5000))
    customissue_payload = Column(VARCHAR(5000))
    received_at = Column(BigInteger)
    batch_order_number = Column(BigInteger)
    clickevent_hesitationtime =	Column(BigInteger)
    clickevent_label = Column(VARCHAR(5000))
    clickevent_messageid = Column(BigInteger)
    clickevent_selector = Column(VARCHAR(5000))


class DetailedEvent(Base):
    __tablename__ = events_detailed_table_name

    sessionid = Column(BigInteger, primary_key=True)
    clickevent_hesitationtime = Column(BigInteger)
    clickevent_label = Column(VARCHAR(5000))
    clickevent_messageid = Column(BigInteger)
    clickevent_timestamp = Column(BigInteger)
    connectioninformation_downlink = Column(BigInteger)
    connectioninformation_type = Column(VARCHAR(5000))
    consolelog_level = Column(VARCHAR(5000))
    consolelog_value = Column(VARCHAR(5000))
    customevent_name = Column(VARCHAR(5000))
    customevent_payload = Column(VARCHAR(5000))
    fetch_duration = Column(BigInteger)
    fetch_method = Column(VARCHAR(5000))
    fetch_request = Column(VARCHAR(5000))
    fetch_response = Column(VARCHAR(5000))
    fetch_status = Column(BigInteger)
    fetch_timestamp = Column(BigInteger)
    fetch_url = Column(VARCHAR(5000))
    graphql_operationkind = Column(VARCHAR(5000))
    graphql_operationname = Column(VARCHAR(5000))
    graphql_response = Column(VARCHAR(5000))
    graphql_variables = Column(VARCHAR(5000))
    inputevent_label = Column(VARCHAR(5000))
    inputevent_messageid = Column(BigInteger)
    inputevent_timestamp = Column(BigInteger)
    inputevent_value = Column(VARCHAR(5000))
    inputevent_valuemasked = Column(Boolean)
    jsexception_message = Column(VARCHAR(5000))
    jsexception_name = Column(VARCHAR(5000))
    jsexception_payload = Column(VARCHAR(5000))
    jsexception_metadata = Column(VARCHAR(5000))
    mouseclick_id = Column(BigInteger)
    mouseclick_hesitationtime = Column(BigInteger)
    mouseclick_label = Column(VARCHAR(5000))
    networkrequest_type = Column(VARCHAR(5000))
    networkrequest_method = Column(VARCHAR(5000))
    networkrequest_url = Column(VARCHAR(5000))
    networkrequest_request = Column(VARCHAR(5000))
    networkrequest_response = Column(VARCHAR(5000))
    networkrequest_status = Column(BigInteger)
    networkrequest_timestamp = Column(BigInteger)
    networkrequest_duration = Column(BigInteger)
    pageevent_domcontentloadedeventend = Column(BigInteger)
    pageevent_domcontentloadedeventstart = Column(BigInteger)
    pageevent_firstcontentfulpaint = Column(BigInteger)
    pageevent_firstpaint = Column(BigInteger)
    pageevent_loaded = Column(Boolean)
    pageevent_loadeventend = Column(BigInteger)
    pageevent_loadeventstart = Column(BigInteger)
    pageevent_messageid = Column(BigInteger)
    pageevent_referrer = Column(VARCHAR(5000))
    pageevent_requeststart = Column(BigInteger)
    pageevent_responseend = Column(BigInteger)
    pageevent_responsestart = Column(BigInteger)
    pageevent_speedindex = Column(BigInteger)
    pageevent_timestamp = Column(BigInteger)
    pageevent_url = Column(VARCHAR(5000))
    sessionend_timestamp = Column(BigInteger)
    sessionend_encryption_key = Column(VARCHAR(5000))
    sessionstart_projectid = Column(BigInteger)
    sessionstart_revid = Column(VARCHAR(5000))
    sessionstart_timestamp = Column(BigInteger)
    sessionstart_trackerversion = Column(VARCHAR(5000))
    sessionstart_useragent = Column(VARCHAR(5000))
    sessionstart_userbrowser = Column(VARCHAR(5000))
    sessionstart_userbrowserversion = Column(VARCHAR(5000))
    sessionstart_usercountry = Column(VARCHAR(5000))
    sessionstart_userdevice = Column(VARCHAR(5000))
    sessionstart_userdeviceheapsize = Column(BigInteger)
    sessionstart_userdevicememorysize = Column(BigInteger)
    sessionstart_userdevicetype = Column(VARCHAR(5000))
    sessionstart_useros = Column(VARCHAR(5000))
    sessionstart_userosversion = Column(VARCHAR(5000))
    sessionstart_useruuid = Column(VARCHAR(5000))
    setpagelocation_navigationstart = Column(BigInteger)
    setpagelocation_referrer = Column(VARCHAR(5000))
    setpagelocation_url = Column(VARCHAR(5000))
    issueevent_message_id = Column(BigInteger)
    issueevent_timestamp = Column(BigInteger)
    issueevent_type = Column(VARCHAR(5000))
    issueevent_context_string = Column(VARCHAR(5000))
    issueevent_context = Column(VARCHAR(5000))
    issueevent_payload = Column(VARCHAR(5000))
    issueevent_url = Column(VARCHAR(5000))
    customissue_name = Column(VARCHAR(5000))
    customissue_payload = Column(VARCHAR(5000))
    received_at = Column(BigInteger)
    batch_order_number = Column(BigInteger)

