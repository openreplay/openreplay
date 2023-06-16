from decouple import config, Csv
from confluent_kafka import Consumer
from datetime import datetime
from collections import defaultdict
import asyncio
from time import time, sleep
from copy import deepcopy

from msgcodec import MessageCodec
from messages import SessionEnd
from db.api import DBConnection
from db.models import events_detailed_table_name, events_table_name, sessions_table_name
from db.writer import insert_batch, update_batch
from handler import handle_message, handle_normal_message, handle_session
from utils.cache import ProjectFilter as PF
from utils import pg_client

from psycopg2 import InterfaceError
from utils.signal_handler import signal_handler

def process_message(msg, codec, sessions, batch, sessions_batch, interesting_sessions, interesting_events, EVENT_TYPE, projectFilter, broken_batchs = 0):
    if msg is None:
        return
    messages = codec.decode_detailed(msg.value())
    try:
        session_id = codec.decode_key(msg.key())
    except Exception as e:
        broken_batchs = broken_batchs + 1
        # print('[WARN] Broken sessionid')
        # print(e)
        return
    if messages is None:
        return
    elif not projectFilter.is_valid(session_id):
        # We check using projectFilter if session_id is from the selected projects
        return

    for message in messages:
        if message.__id__ in interesting_events:
            if EVENT_TYPE == 'detailed':
                n = handle_message(message)
            elif EVENT_TYPE == 'normal':
                n = handle_normal_message(message)
        if message.__id__ in interesting_sessions:

                # Here we create the session if not exists or append message event if session exists
            sessions[session_id] = handle_session(sessions[session_id], message)
            if sessions[session_id]:
                sessions[session_id].sessionid = session_id
            projectFilter.cached_sessions.add(session_id)

            if isinstance(message, SessionEnd):
                # Here only if session exists and we get sessionend we start cleanup
                if sessions[session_id].session_start_timestamp:
                    projectFilter.handle_clean()
                    old_status = projectFilter.cached_sessions.close(session_id)
                    sessions_batch.append((old_status, deepcopy(sessions[session_id])))
                    sessions_to_delete = projectFilter.cached_sessions.clear_sessions()
                    for sess_id in sessions_to_delete:
                        try:
                            del sessions[sess_id]
                        except KeyError:
                            ...
                else:
                    print('[WARN] Session not started received SessionEnd message')
                    del sessions[session_id]

        if message.__id__ in interesting_events:
            if n:
                n.sessionid = session_id
                n.received_at = int(datetime.now().timestamp() * 1000)
                n.batch_order_number = len(batch)
                batch.append(n)
            else:
                continue


def attempt_session_insert(sess_batch, db, sessions_table_name, try_=0):
    if sess_batch:
        try:
            #print("inserting sessions...")
            insert_batch(db, sess_batch, table=sessions_table_name, level='sessions')
            #print("inserted sessions succesfully")
        except TypeError as e:
            print("Type conversion error")
            print(repr(e))
        except ValueError as e:
            print("Message value could not be processed or inserted correctly")
            print(repr(e))
        except InterfaceError as e:
            if try_ < 3:
                try_ += 1
                sleep(try_*2)
                attempt_session_insert(sess_batch, db, sessions_table_name, try_)
        except Exception as e:
            print(repr(e))


def attempt_session_update(sess_batch, db, sessions_table_name):
    if sess_batch:
        try:
            #print('updating sessions')
            update_batch(db, sess_batch, table=sessions_table_name)
        except TypeError as e:
            print('Type conversion error')
            print(repr(e))
        except ValueError as e:
            print('Message value could not be processed or inserted correctly')
            print(repr(e))
        except InterfaceError as e:
            print('Error while trying to update session into datawarehouse')
            print(repr(e))
        except Exception as e:
            print(repr(e))


def attempt_batch_insert(batch, db, table_name, EVENT_TYPE, try_=0):
    # insert a batch
    try:
        #print("inserting...")
        insert_batch(db=db, batch=batch, table=table_name, level=EVENT_TYPE)
        #print("inserted succesfully")
    except TypeError as e:
        print("Type conversion error")
        print(repr(e))
    except ValueError as e:
        print("Message value could not be processed or inserted correctly")
        print(repr(e))
    except InterfaceError as e:
        if try_ < 3:
            try_ += 1
            sleep(try_*2)
            attempt_batch_insert(batch, db, table_name, EVENT_TYPE, try_)
        elif try_ == 3:
            # TODO: Restart redshift
            db.restart()
            sleep(2)
            attempt_batch_insert(batch, db, table_name, EVENT_TYPE, try_ + 1)
        else:
            print(repr(e))
    except Exception as e:
        print(repr(e))

def decode_key(b) -> int:
    """
    Decode the message key (encoded with little endian)
    """
    try:
        decoded = int.from_bytes(b, "little", signed=False)
    except Exception as e:
        print(f'Error while decoding message key (SessionId) from {b}')
        raise e
    return decoded

        
async def main():
    await pg_client.init()
    DATABASE = config('CLOUD_SERVICE')
    EVENT_TYPE = config('EVENT_TYPE')

    db = DBConnection(DATABASE)
    upload_rate = config('upload_rate', default=30, cast=int)

    if EVENT_TYPE == 'detailed':
        table_name = events_detailed_table_name
    elif EVENT_TYPE == 'normal':
        table_name = events_table_name

    batch = []
    sessions = defaultdict(lambda: None)
    sessions_batch = []

    sessions_events_selection = [1,25,28,29,30,31,32,54,56,62,69,78,125,126]
    if EVENT_TYPE == 'normal':
        selected_events = [21,22,25,27,64,78,125]
    elif EVENT_TYPE == 'detailed':
        selected_events = [1,4,21,22,25,27,31,32,39,48,59,64,69,78,125,126]
    filter_events = list(set(sessions_events_selection+selected_events))

    allowed_projects = config('PROJECT_IDS', default=None, cast=Csv(int))
    project_filter = PF(allowed_projects)
    try:
        project_filter.load_checkpoint(db)
    except Exception as e:
        print('[WARN] Checkpoint not found')
        print(repr(e))
    codec = MessageCodec(filter_events)
    ssl_protocol = config('KAFKA_USE_SSL', default=True, cast=bool)
    consumer_settings = {
        "bootstrap.servers": config('KAFKA_SERVERS'),
        "group.id": f"connector_{DATABASE}",
        "auto.offset.reset": "earliest",
        "enable.auto.commit": False
        }
    if ssl_protocol:
        consumer_settings['security.protocol'] = 'SSL'
    consumer = Consumer(consumer_settings)

    consumer.subscribe(config("TOPICS", default="saas-raw").split(','))
    print("[INFO] Kafka consumer subscribed")

    c_time = time()
    read_msgs = 0
    broken_batchs = 0
    while signal_handler.KEEP_PROCESSING:
        msg = consumer.poll(1.0)
        process_message(msg, codec, sessions, batch, sessions_batch, sessions_events_selection, selected_events, EVENT_TYPE, project_filter, broken_batchs)
        read_msgs += 1
        if time() - c_time > upload_rate:
            #print(f'[INFO] {read_msgs} kafka messages read in {upload_rate} seconds')
            if broken_batchs > 0:
                print(f'[WARN] {broken_batchs} broken sessionIds')
                broken_batchs = 0
            await insertBatch(deepcopy(sessions_batch), deepcopy(batch), db, sessions_table_name, table_name, EVENT_TYPE)
            consumer.commit()
            try:
                project_filter.save_checkpoint(db)
            except Exception as e:
                print("[Error] Error while saving checkpoint")
                print(repr(e))
            sessions_batch = []
            batch = []
            read_msgs = 0
            c_time = time()
    project_filter.terminate(db)



async def insertBatch(sessions_batch, batch, db, sessions_table_name, table_name, EVENT_TYPE):
    t1 = time()
    print(f'[BG-INFO] Number of events to add {len(batch)}, number of sessions to add {len(sessions_batch)}')
    new_sessions = list()
    updated_sessions = list()
    for old_status, session_in_batch in sessions_batch:
        if old_status == 'UPDATE':
            updated_sessions.append(session_in_batch)
        else:
            new_sessions.append(session_in_batch)
    #print(f'[DEBUG] Number of new sessions {len(new_sessions)}, number of sessions to update {len(updated_sessions)}')
    if new_sessions != []:
        attempt_session_insert(new_sessions, db, sessions_table_name)

    if updated_sessions != []:
        attempt_session_update(updated_sessions, db, sessions_table_name)

    # insert a batch of events
    if batch != []:
        attempt_batch_insert(batch, db, table_name, EVENT_TYPE)
    print(f'[BG-INFO] Uploaded into S3 in {time()-t1} seconds')


if __name__ == '__main__':
    asyncio.run(main())
