from decouple import config
from confluent_kafka import Consumer
from datetime import datetime
from collections import defaultdict
import json
import asyncio
from time import time
from copy import deepcopy

#from msgcodec.codec import MessageCodec
from msgcodec.msgcodec import MessageCodec
from msgcodec.messages import SessionEnd
print('[INFO] Importing DBConnection...')
from db.api import DBConnection
print('[INFO] Importing from models..')
from db.models import events_detailed_table_name, events_table_name, sessions_table_name
print('[INFO] Importing from writer..')
from db.writer import insert_batch
print('[INFO] Importing from handler..')
from handler import handle_message, handle_normal_message, handle_session

DATABASE = config('DATABASE_NAME')
LEVEL = config('LEVEL')

print(f'[INFO] Connecting to database {DATABASE}')
#db = DBConnection(DATABASE)
print('Connected successfully')

if LEVEL == 'detailed':
    table_name = events_detailed_table_name
elif LEVEL == 'normal':
    table_name = events_table_name

def process_message(msg, codec, sessions, batch, sessions_batch, interesting_sessions, interesting_events):
    if msg is None:
        return
    #value = json.loads(msg.value().decode('utf-8'))
    messages = codec.decode_detailed(msg.value())
    session_id = codec.decode_key(msg.key())
    if messages is None:
        print('-')
        return

    for message in messages:
        if message.__id__ in interesting_events:
            if LEVEL == 'detailed':
                n = handle_message(message)
            elif LEVEL == 'normal':
                n = handle_normal_message(message)
        if message.__id__ in interesting_sessions:
            sessions[session_id] = handle_session(sessions[session_id], message)
            if sessions[session_id]:
                sessions[session_id].sessionid = session_id

                # put in a batch for insertion if received a SessionEnd
            if isinstance(message, SessionEnd):
                if sessions[session_id]:
                    sessions_batch.append(deepcopy(sessions[session_id]))
                    del sessions[session_id]

        if message.__id__ in interesting_events:
            if n:
                n.sessionid = session_id
                n.received_at = int(datetime.now().timestamp() * 1000)
                n.batch_order_number = len(batch)
                batch.append(n)
            else:
                continue


def attempt_session_insert(sess_batch, db, sessions_table_name):
    if sess_batch:
        try:
            print("inserting sessions...")
            insert_batch(db, sess_batch, table=sessions_table_name, level='sessions')
            print("inserted sessions succesfully")
        except TypeError as e:
            print("Type conversion error")
            print(repr(e))
        except ValueError as e:
            print("Message value could not be processed or inserted correctly")
            print(repr(e))
        except Exception as e:
            print(repr(e))


def attempt_batch_insert(batch, db, table_name, LEVEL):
    # insert a batch
    try:
        print("inserting...")
        insert_batch(db=db, batch=batch, table=table_name, level=LEVEL)
        print("inserted succesfully")
    except TypeError as e:
        print("Type conversion error")
        print(repr(e))
    except ValueError as e:
        print("Message value could not be processed or inserted correctly")
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
        raise UnicodeDecodeError(f"Error while decoding message key (SessionID) from {b}\n{e}")
    return decoded

        
async def main():
    #bg_tasks = list()
    #batch_size = config('events_batch_size', default=4000, cast=int)
    #sessions_batch_size = config('sessions_batch_size', default=400, cast=int)

    DATABASE = config('DATABASE_NAME')
    LEVEL = config('LEVEL')

    print(f'[INFO] Connecting to database {DATABASE}')
    #db = None
    db = DBConnection(DATABASE)
    print('Connected successfully')
    upload_rate = config('upload_rate', default=30, cast=int)

    if LEVEL == 'detailed':
        table_name = events_detailed_table_name
    elif LEVEL == 'normal':
        table_name = events_table_name

    batch = []
    sessions = defaultdict(lambda: None)
    sessions_batch = []

    sessions_events_selection = [1,3,25,28,29,30,31,32,56,54,62,69,78,125,126]
    selected_events = [3,21,27,64,78,125]
    filter_events = list(set(sessions_events_selection+selected_events))

    codec = MessageCodec(filter_events)
    ssl_protocol = config('SSL_ENABLED', default=True, cast=bool)
    consumer_settings = {
        "bootstrap.servers": config('KAFKA_SERVER'),
        "group.id": f"connector_{DATABASE}",
        "auto.offset.reset": "earliest",
        "enable.auto.commit": False
        }
    if ssl_protocol:
        consumer_settings['security.protocol'] = 'SSL'
    consumer = Consumer(consumer_settings)

    consumer.subscribe(config("topics", default="saas-raw").split(','))
    print("[INFO] Kafka consumer subscribed")

    c_time = time()
    read_msgs = 0
    while True:
        msg = consumer.poll(1.0)
        process_message(msg, codec, sessions, batch, sessions_batch, sessions_events_selection, selected_events)
        read_msgs += 1
        if time() - c_time > upload_rate:
            print(f'[INFO] {read_msgs} kafka messages read in {upload_rate} seconds')
            await insertBatch(deepcopy(sessions_batch), deepcopy(batch), db, sessions_table_name, table_name, LEVEL)
            consumer.commit()
            sessions_batch = []
            batch = []
            read_msgs = 0
            c_time = time()



async def insertBatch(sessions_batch, batch, db, sessions_table_name, table_name, LEVEL):
    t1 = time()
    print(f'[BG-INFO] Number of events to add {len(batch)}, number of sessions to add {len(sessions_batch)}')
    if sessions_batch != []:
        attempt_session_insert(sessions_batch, db, sessions_table_name)
        print('[BG-INFO] Events uploaded to redshift')
        #sessions_batch = []

    # insert a batch of events
    if batch != []:
        attempt_batch_insert(batch, db, table_name, LEVEL)
        #batch = []
        print('[GB-INFO] Sessions uploaded to redshift')
    print(f'[BG-INFO] Uploaded into S3 in {time()-t1} secons')


if __name__ == '__main__':
    asyncio.run(main())
