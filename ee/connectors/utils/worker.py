from multiprocessing import Pool, Process, Pipe, TimeoutError
from multiprocessing.connection import Connection
from msgcodec import MessageCodec
from messages import SessionEnd
from utils.uploader import insertBatch
from utils.cache import CachedSessions
from db.models import DetailedEvent, Event, Session, events_detailed_table_name, events_table_name, sessions_table_name
from handler import handle_normal_message, handle_message, handle_session
from datetime import datetime
from decouple import config
from utils import pg_client
from utils.signal_handler import signal_handler
from copy import deepcopy
from confluent_kafka import Consumer
import json
import asyncio

EVENT_TYPE = config('EVENT_TYPE')
DATABASE = config('CLOUD_SERVICE')
UPLOAD_RATE = config('upload_rate', default=30, cast=int)
if EVENT_TYPE == 'detailed':
    table_name = events_detailed_table_name
elif EVENT_TYPE == 'normal':
    table_name = events_table_name

TOPICS = config("TOPICS", default="saas-raw").split(',')
ssl_protocol = config('KAFKA_USE_SSL', default=True, cast=bool)
consumer_settings = {
    "bootstrap.servers": config('KAFKA_SERVERS'),
    "group.id": f"connector_{DATABASE}",
    "auto.offset.reset": "earliest",
    "enable.auto.commit": False
}
if ssl_protocol:
    consumer_settings['security.protocol'] = 'SSL'

session_messages = [1, 25, 28, 29, 30, 31, 32, 54, 56, 62, 69, 78, 125, 126]
if EVENT_TYPE == 'normal':
    events_messages = [21, 22, 25, 27, 64, 78, 125]
elif EVENT_TYPE == 'detailed':
    events_messages = [1, 4, 21, 22, 25, 27, 31, 32, 39, 48, 59, 64, 69, 78, 125, 126]
allowed_messages = list(set(session_messages + events_messages))
codec = MessageCodec(allowed_messages)
max_kafka_read = config('MAX_KAFKA_READ', default=60000, cast=int)


def init_consumer():
    global DATABASE, consumer_settings
    consumer = Consumer(consumer_settings)
    consumer.subscribe(TOPICS)
    return consumer


def close_consumer(consumer):
    consumer.unsubscribe()
    consumer.close()


def session_to_dict(sess: Session):
    _dict = sess.__dict__
    try:
        del _dict['_sa_instance_state']
    except KeyError:
        ...
    return _dict


def dict_to_session(session_dict: dict):
    n = Session()
    n.__dict__ |= session_dict
    return n


def event_to_dict(event: Event | DetailedEvent):
    _dict = event.__dict__
    try:
        del _dict['_sa_instance_state']
    except KeyError:
        ...
    return _dict


def dict_to_event(event_dict: dict):
    global EVENT_TYPE
    if EVENT_TYPE == 'detailed':
        n = DetailedEvent()
    else:
        n = Event()
    n.__dict__ |= event_dict
    return n

class ProjectFilter:
    def __init__(self, project_filter):
        self.max_lifespan = config('MAX_UNWANTED_SESSION_LIFE', default=7800, cast=int)
        self.project_filter = project_filter
        self.sessions_lifespan = CachedSessions()
        self.non_valid_sessions_cache = dict()

    def is_valid(self, sessionId: int):
        if len(self.project_filter) == 0:
            return True
        elif sessionId in self.sessions_lifespan.session_project.keys():
            return True
        elif sessionId in self.non_valid_sessions_cache.keys():
            return False
        else:
            projectId = project_from_session(sessionId)
            if projectId not in self.project_filter:
                self.non_valid_sessions_cache[sessionId] = int(datetime.now().timestamp())
                return False
            else:
                return True

    def already_checked(self, sessionId):
        if len(self.project_filter) == 0:
            return True, True
        elif sessionId in self.sessions_lifespan.session_project.keys():
            return True, True
        elif sessionId in self.non_valid_sessions_cache.keys():
            return True, False
        else:
            return False, None

    def are_valid(self, sessionIds: list[int]):
        valid_sessions = list()
        if len(self.project_filter) == 0:
            return sessionIds
        projects_session = project_from_sessions(list(set(sessionIds)))
        current_datetime = int(datetime.now().timestamp())
        for projectId, sessionId in projects_session:
            if projectId not in self.project_filter:
                self.non_valid_sessions_cache[sessionId] = current_datetime
            else:
                valid_sessions.append(sessionId)
        return valid_sessions

    def handle_clean(self):
        if len(self.project_filter) == 0:
            return
        else:
            current_timestamp = datetime.now().timestamp()
            self.non_valid_sessions_cache = {sessionId: start_timestamp for sessionId, start_timestamp in
                                             self.non_valid_sessions_cache.items() if
                                             self.max_lifespan > current_timestamp - start_timestamp}


def read_from_kafka(pipe: Connection, params: dict):
    global UPLOAD_RATE, max_kafka_read
    # try:
    asyncio.run(pg_client.init())
    kafka_consumer = init_consumer()
    project_filter = params['project_filter']
    capture_messages = list()
    capture_sessions = list()
    while True:
        to_decode = list()
        sessionIds = list()
        start_time = datetime.now().timestamp()
        broken_batchs = 0
        n_messages = 0
        while datetime.now().timestamp() - start_time < UPLOAD_RATE and max_kafka_read > n_messages:
            try:
                msg = kafka_consumer.poll(5.0)
            except Exception as e:
                print('[WORKER Exception]', e)
            if msg is None:
                continue
            n_messages += 1
            try:
                sessionId = codec.decode_key(msg.key())
            except Exception:
                broken_batchs += 1
                continue
            checked, is_valid = project_filter.already_checked(sessionId)
            if not checked:
                capture_sessions.append(sessionId)
                capture_messages.append(msg.value())
            elif is_valid:
                to_decode.append(msg.value())
                sessionIds.append(sessionId)
            # if project_filter.is_valid(sessionId):
            #     to_decode.append(msg.value())
            #     sessionIds.append(sessionId)
        valid_sessions = project_filter.are_valid(list(set(capture_sessions)))
        while capture_sessions:
            sessId = capture_sessions.pop()
            msg = capture_messages.pop()
            if sessId in valid_sessions:
                sessionIds.append(sessId)
                to_decode.append(msg)
        if n_messages != 0:
            print(
            f'[WORKER INFO-bg] Found {broken_batchs} broken batch over {n_messages} read messages ({100 * broken_batchs / n_messages:.2f}%)')
        else:
            print('[WORKER WARN-bg] No messages read')
        non_valid_updated = project_filter.non_valid_sessions_cache
        pipe.send((non_valid_updated, sessionIds, to_decode))
        continue_signal = pipe.recv()
        if continue_signal == 'CLOSE':
            print('[WORKER SHUTDOWN-reader] Reader shutting down')
            break
        kafka_consumer.commit()
    print('[WORKER INFO] Closing consumer')
    close_consumer(kafka_consumer)
    print('[WORKER INFO] Closing pg connection')
    asyncio.run(pg_client.terminate())
    print('[WORKER INFO] Successfully closed reader task')
    # except Exception as e:
    #     print('[WARN]', repr(e))


def into_batch(batch: list[Event | DetailedEvent], session_id: int, n: Session):
    n.sessionid = session_id
    n.received_at = int(datetime.now().timestamp() * 1000)
    n.batch_order_number = len(batch)
    batch.append(n)
    return batch


def project_from_session(sessionId: int):
    """Search projectId of requested sessionId in PG table sessions"""
    with pg_client.PostgresClient() as conn:
        conn.execute(
            conn.mogrify("SELECT project_id FROM sessions WHERE session_id=%(sessionId)s LIMIT 1",
                         {'sessionId': sessionId})
        )
        res = conn.fetchone()
    if res is None:
        print(f'[WORKER WARN] sessionid {sessionId} not found in sessions table')
        return None
    return res['project_id']


def project_from_sessions(sessionIds: list[int]):
    """Search projectId of requested sessionId in PG table sessions"""
    response = list()
    while sessionIds:
        sessIds = sessionIds[-1000:]
        try:
            with pg_client.PostgresClient() as conn:
                conn.execute(
                    "SELECT session_id, project_id FROM sessions WHERE session_id IN ({sessionIds})".format(
                                 sessionIds=','.join([str(sessId) for sessId in sessIds])
                    )
                )
                res = conn.fetchall()
        except Exception as e:
            print('[WORKER project_from_sessions]', repr(e))
            raise e
        if res is None:
            print(f'[WORKER WARN] sessionids {",".join([str(sessId) for sessId in sessIds])} not found in sessions table')
        else:
            response += res
        sessionIds = sessionIds[:-1000]
    if not response:
        return []
    return [(e['project_id'], e['session_id']) for e in response]


def decode_message(params: dict):
    global codec, session_messages, events_messages, EVENT_TYPE
    if len(params['message']) == 0:
        return list(), None, list()
    memory = {sessId: dict_to_session(sessObj) for sessId, sessObj in params['memory'].items()}
    events_worker_batch = list()
    sessionid_ended = list()
    for session_id, encoded_message in params['message']:
        messages = codec.decode_detailed(encoded_message)
        if messages is None:
            continue
        for message in messages:
            if message is None:
                continue
            if message.__id__ in events_messages and EVENT_TYPE != 'detailed':
                n = handle_normal_message(message)
                if n:
                    events_worker_batch = into_batch(batch=events_worker_batch, session_id=session_id, n=n)
            elif message.__id__ in events_messages and EVENT_TYPE == 'detailed':
                n = handle_message(message)
                if n:
                    events_worker_batch = into_batch(batch=events_worker_batch, session_id=session_id, n=n)

            if message.__id__ in session_messages:
                try:
                    memory[session_id] = handle_session(memory[session_id], message)
                except KeyError:
                    memory[session_id] = handle_session(None, message)
                memory[session_id].sessionid = session_id
                if isinstance(message, SessionEnd):
                    sessionid_ended.append(session_id)
    memory = {sessId: session_to_dict(sessObj) for sessId, sessObj in memory.items()}
    return events_worker_batch, memory, sessionid_ended


def work_assigner(params):
    flag = params.pop('flag')
    if flag == 'decoder':
        return {'flag': 'decoder', 'value': decode_message(params)}
    # elif flag == 'reader':
    #     return {'flag': 'reader', 'value': read_from_kafka(params)}


class WorkerPool:
    def __init__(self, n_workers: int, project_filter: list[int]):
        self.pool = Pool(n_workers)
        self.sessions = dict()
        self.assigned_worker = dict()
        self.pointer = 0
        self.n_workers = n_workers
        self.project_filter_class = ProjectFilter(project_filter)

    def get_worker(self, session_id: int) -> int:
        if session_id in self.assigned_worker.keys():
            worker_id = self.assigned_worker[session_id]
        else:
            worker_id = self.pointer
            self.pointer = (self.pointer + 1) % self.n_workers
            self.assigned_worker[session_id] = worker_id
        return worker_id

    def _pool_response_handler(self, pool_results):
        events_batch = list()
        sessions_update_batch = list()
        sessions_insert_batch = list()
        count = 0
        for js_response in pool_results:
            flag = js_response.pop('flag')
            if flag == 'decoder':
                worker_events, worker_memory, end_sessions = js_response['value']
                if worker_memory is None:
                    continue
                events_batch += worker_events
                for session_id in worker_memory.keys():
                    self.sessions[session_id] = dict_to_session(worker_memory[session_id])
                    self.project_filter_class.sessions_lifespan.add(session_id)
                for session_id in end_sessions:
                    if self.sessions[session_id].session_start_timestamp:
                        old_status = self.project_filter_class.sessions_lifespan.close(session_id)
                        if old_status == 'UPDATE':
                            sessions_update_batch.append(deepcopy(self.sessions[session_id]))
                        elif old_status == 'OPEN':
                            sessions_insert_batch.append(deepcopy(self.sessions[session_id]))
                        else:
                            print('[WORKER-WARN] Closed session should not be closed again')
            elif flag == 'reader':
                count += 1
                if count > 1:
                    raise Exception('Pool only accepts one reader task')
                non_valid_updated, session_ids, messages = js_response['value']
                self.project_filter_class.non_valid_sessions_cache = non_valid_updated

        self.project_filter_class.handle_clean()
        sessions_to_delete = self.project_filter_class.sessions_lifespan.clear_sessions()
        for sess_id in sessions_to_delete:
            try:
                del self.sessions[sess_id]
            except KeyError:
                ...
            try:
                del self.assigned_worker[sess_id]
            except KeyError:
                ...
        return events_batch, sessions_insert_batch, sessions_update_batch, session_ids, messages

    def run_workers(self, database_api):
        global sessions_table_name, table_name, EVENT_TYPE
        session_ids = list()
        messages = list()
        main_conn, reader_conn = Pipe()
        kafka_task_params = {'flag': 'reader',
                              'project_filter': self.project_filter_class}
        kafka_reader_process = Process(target=read_from_kafka, args=(reader_conn, kafka_task_params))
        kafka_reader_process.start()
        while signal_handler.KEEP_PROCESSING:
            # Setup of parameters for workers
            if not kafka_reader_process.is_alive():
                print('[WORKER-INFO] Restarting reader task')
                del kafka_reader_process
                kafka_reader_process = Process(target=read_from_kafka, args=(reader_conn, kafka_task_params))
                kafka_reader_process.start()
            decoding_params = [{'flag': 'decoder',
                                'message': list(),
                                'memory': dict()} for _ in range(self.n_workers)
                               ]
            for i in range(len(session_ids)):
                session_id = session_ids[i]
                worker_id = self.get_worker(session_id)
                decoding_params[worker_id]['message'].append([session_id, messages[i]])
                if session_id not in decoding_params[worker_id]['memory'].keys():
                    try:
                        decoding_params[worker_id]['memory'][session_id] = session_to_dict(self.sessions[session_id])
                    except KeyError:
                        ...

            # Hand tasks to workers
            async_results = list()
            # for params in kafka_task_params:
            #     async_results.append(self.pool.apply_async(work_assigner, args=[params]))
            for params in decoding_params:
                if params['message']:
                    async_results.append(self.pool.apply_async(work_assigner, args=[params]))
            results = [{'flag': 'reader', 'value': main_conn.recv()}]
            for async_result in async_results:
                try:
                    results.append(async_result.get(timeout=32 * UPLOAD_RATE))
                except TimeoutError as e:
                    print('[WORKER-TimeoutError] Decoding of messages is taking longer than expected')
                    raise e
            events_batch, sessions_insert_batch, sessions_update_batch, session_ids, messages = self._pool_response_handler(
                pool_results=results)
            insertBatch(events_batch, sessions_insert_batch, sessions_update_batch, database_api, sessions_table_name,
                        table_name, EVENT_TYPE)
            self.save_snapshot(database_api)
            main_conn.send('CONTINUE')
        print('[WORKER-INFO] Sending close signal')
        main_conn.send('CLOSE')
        self.terminate()
        kafka_reader_process.terminate()
        print('[WORKER-SHUTDOWN] Process terminated')

    def load_checkpoint(self, database_api):
        file = database_api.load_binary(name='checkpoint')
        checkpoint = json.loads(file.getvalue().decode('utf-8'))
        file.close()
        if 'version' not in checkpoint.keys():
            sessions_cache_list = checkpoint['cache']
            reload_default_time = datetime.now().timestamp()
            self.project_filter_class.non_valid_sessions_cache = {int(sessId): reload_default_time for sessId, value in
                                                                  sessions_cache_list.items() if not value[1]}
            self.project_filter_class.sessions_lifespan.session_project = checkpoint['cached_sessions']
        elif checkpoint['version'] == 'v1.0':
            for sessionId, session_dict in checkpoint['sessions']:
                self.sessions[sessionId] = dict_to_session(session_dict)
            self.project_filter_class.sessions_lifespan.session_project = checkpoint['cached_sessions']

        else:
            raise Exception('Error in version of snapshot')

    def terminate(self, database_api):
        self.pool.close()
        self.save_snapshot(database_api)
        database_api.close()

    def save_snapshot(self, database_api):
        session_snapshot = list()
        for sessionId, session in self.sessions.items():
            session_snapshot.append([sessionId, session_to_dict(session)])
        checkpoint = {
            'version': 'v1.0',
            'sessions': session_snapshot,
            'cached_sessions': self.project_filter_class.sessions_lifespan.session_project,
        }
        database_api.save_binary(binary_data=json.dumps(checkpoint).encode('utf-8'), name='checkpoint')
