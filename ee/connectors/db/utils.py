import pandas as pd
from db.models import DetailedEvent, Event, Session, DATABASE

dtypes_events = {
    'sessionid': "Int64",
    'consolelog_level': "string",
    'consolelog_value': "string",
    'customevent_name': "string",
    'customevent_payload': "string",
    'jsexception_message': "string",
    'jsexception_name': "string",
    'jsexception_payload': "string",
    'jsexception_metadata': "string",
    'networkrequest_type': "string",
    'networkrequest_method': "string",
    'networkrequest_url': "string",
    'networkrequest_request': "string",
    'networkrequest_response': "string",
    'networkrequest_status': "Int64",
    'networkrequest_timestamp': "Int64",
    'networkrequest_duration': "Int64",
    'issueevent_message_id': "Int64",
    'issueevent_timestamp': "Int64",
    'issueevent_type': "string",
    'issueevent_context_string': "string",
    'issueevent_context': "string",
    'issueevent_url': "string",
    'issueevent_payload': "string",
    'customissue_name': "string",
    'customissue_payload': "string",
    'received_at': "Int64",
    'batch_order_number': "Int64",
    'clickevent_hesitationtime': "Int64",
    'clickevent_label': "string",
    'clickevent_messageid': "Int64",
    'clickevent_selector': "string"}
dtypes_detailed_events = {
"sessionid": "Int64",
"clickevent_hesitationtime": "Int64",
"clickevent_label": "string",
"clickevent_messageid": "Int64",
"clickevent_timestamp": "Int64",
"connectioninformation_downlink": "Int64",
"connectioninformation_type": "string",
"consolelog_level": "string",
"consolelog_value": "string",
"customevent_name": "string",
"customevent_payload": "string",
"fetch_duration": "Int64",
"fetch_method": "string",
"fetch_request": "string",
"fetch_response": "string",
"fetch_status": "Int64",
"fetch_timestamp": "Int64",
"fetch_url": "string",
"graphql_operationkind": "string",
"graphql_operationname": "string",
"graphql_response": "string",
"graphql_variables": "string",
"inputevent_label": "string",
"inputevent_messageid": "Int64",
"inputevent_timestamp": "Int64",
"inputevent_value": "string",
"inputevent_valuemasked": "boolean",
"jsexception_message": "string",
"jsexception_name": "string",
"jsexception_payload": "string",
"jsexception_metadata": "string",
"mouseclick_id": "Int64",
"mouseclick_hesitationtime": "Int64",
"mouseclick_label": "string",
"networkrequest_type": "string",
"networkrequest_method": "string",
"networkrequest_url": "string",
"networkrequest_request": "string",
"networkrequest_response": "string",
"networkrequest_status": "Int64",
"networkrequest_timestamp": "Int64",
"networkrequest_duration": "Int64",
"pageevent_domcontentloadedeventend": "Int64",
"pageevent_domcontentloadedeventstart": "Int64",
"pageevent_firstcontentfulpaint": "Int64",
"pageevent_firstpaint": "Int64",
"pageevent_loaded": "boolean",
"pageevent_loadeventend": "Int64",
"pageevent_loadeventstart": "Int64",
"pageevent_messageid": "Int64",
"pageevent_referrer": "string",
"pageevent_requeststart": "Int64",
"pageevent_responseend": "Int64",
"pageevent_responsestart": "Int64",
"pageevent_speedindex": "Int64",
"pageevent_timestamp": "Int64",
"pageevent_url": "string",
"sessionend_timestamp": "Int64",
"sessionend_encryption_key": "string",
"sessionstart_projectid": "Int64",
"sessionstart_revid": "string",
"sessionstart_timestamp": "Int64",
"sessionstart_trackerversion": "string",
"sessionstart_useragent": "string",
"sessionstart_userbrowser": "string",
"sessionstart_userbrowserversion": "string",
"sessionstart_usercountry": "string",
"sessionstart_userdevice": "string",
"sessionstart_userdeviceheapsize": "Int64",
"sessionstart_userdevicememorysize": "Int64",
"sessionstart_userdevicetype": "string",
"sessionstart_useros": "string",
"sessionstart_userosversion": "string",
"sessionstart_useruuid": "string",
"setpagelocation_navigationstart": "Int64",
"setpagelocation_referrer": "string",
"setpagelocation_url": "string",
"issueevent_message_id": "Int64",
"issueevent_timestamp": "Int64",
"issueevent_type": "string",
"issueevent_context_string": "string",
"issueevent_context": "string",
"issueevent_payload": "string",
"issueevent_url": "string",
"customissue_name": "string",
"customissue_payload": "string",
"received_at": "Int64",
"batch_order_number": "Int64",
}
dtypes_sessions = {'sessionid': "Int64",
                   'user_agent': "string",
                   'user_browser': "string",
                   'user_browser_version': "string",
                   'user_country': "string",
                   'user_device': "string",
                   'user_device_heap_size': "Int64",
                   'user_device_memory_size': "Int64",
                   'user_device_type': "string",
                   'user_os': "string",
                   'user_os_version': "string",
                   'user_uuid': "string",
                   'connection_effective_bandwidth': "Int64",
                   'connection_type': "string",
                   'metadata_key': "string",
                   'metadata_value': "string",
                   'referrer': "string",
                   'user_anonymous_id': "string",
                   'user_id': "string",
                   'session_start_timestamp': "Int64",
                   'session_end_timestamp': "Int64",
                   'session_duration': "Int64",
                   'first_contentful_paint': "Int64",
                   'speed_index': "Int64",
                   'visually_complete': "Int64",
                   'timing_time_to_interactive': "Int64",
                   'avg_cpu': "Int64",
                   'avg_fps': "Int64",
                   'max_cpu': "Int64",
                   'max_fps': "Int64",
                   'max_total_js_heap_size': "Int64",
                   'max_used_js_heap_size': "Int64",
                   'js_exceptions_count': "Int64",
                   'inputs_count': "Int64",
                   'clicks_count': "Int64",
                   'issues_count': "Int64",
                   'urls_count': "Int64",
                   }

if DATABASE == 'bigquery':
    dtypes_sessions['urls'] = "string"
    dtypes_sessions['issues'] = "string"

detailed_events_col = []
for col in DetailedEvent.__dict__:
    if not col.startswith('_'):
        detailed_events_col.append(col)

events_col = []
for col in Event.__dict__:
    if not col.startswith('_'):
        events_col.append(col)

sessions_col = []
for col in Session.__dict__:
    if not col.startswith('_'):
        sessions_col.append(col)


def get_df_from_batch(batch, level):
    if level == 'normal':
        df = pd.DataFrame([b.__dict__ for b in batch], columns=events_col)
    if level == 'detailed':
        df = pd.DataFrame([b.__dict__ for b in batch], columns=detailed_events_col)
    if level == 'sessions':
        df = pd.DataFrame([b.__dict__ for b in batch], columns=sessions_col)

    try:
        df = df.drop('_sa_instance_state', axis=1)
    except KeyError:
        pass

    if level == 'normal':
        current_types = dtypes_events
        #df['clickevent_hesitationtime'] = df['clickevent_hesitationtime'].fillna(0)
        #df['clickevent_messageid'] = df['clickevent_messageid'].fillna(0)
    if level == 'detailed':
        current_types = dtypes_detailed_events
        df['inputevent_value'] = None
        df['customevent_payload'] = None
        #df['clickevent_hesitationtime'] = df['clickevent_hesitationtime'].fillna(0)
        #df['clickevent_messageid'] = df['clickevent_messageid'].fillna(0)
    if level == 'sessions':
        current_types = dtypes_sessions
        df['js_exceptions_count'] = df['js_exceptions_count'].fillna(0)
        df['inputs_count'] = df['inputs_count'].fillna(0)
        df['clicks_count'] = df['clicks_count'].fillna(0)
        df['issues_count'] = df['issues_count'].fillna(0)
        df['urls_count'] = df['urls_count'].fillna(0)
    df = df.astype(current_types)

    if DATABASE == 'clickhouse' and level == 'sessions':
        df['issues'] = df['issues'].fillna('')
        df['urls'] = df['urls'].fillna('')

    for x in df.columns:
        try:
            if df[x].dtype == "string" or current_types[x] == "string":
                df[x] = df[x].fillna("NULL")
                if x == 'user_id' or x == 'user_anonymous_id':
                    df[x] = df[x].str.slice(0, 7999)
                else:
                    df[x] = df[x].str.slice(0, 255)
                df[x] = df[x].str.replace("|", "")
            elif current_types[x] == 'Int64':
                df[x] = df[x].fillna(0)
        except TypeError as e:
            print(repr(e))
            if df[x].dtype == 'str':
                if x == 'user_id' or x == 'user_anonymous_id':
                    df[x] = df[x].str.slice(0, 7999)
                else:
                    df[x] = df[x].str.slice(0, 255)
                df[x] = df[x].str.replace("|", "")
    return df
