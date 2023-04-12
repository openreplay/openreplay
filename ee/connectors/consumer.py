from decouple import config
from confluent_kafka import Consumer
from datetime import datetime
from collections import defaultdict
import json
from time import time

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
db = DBConnection(DATABASE)
print('Connected successfully')

if LEVEL == 'detailed':
    table_name = events_detailed_table_name
elif LEVEL == 'normal':
    table_name = events_table_name


def main():
    batch_size = config('events_batch_size', default=4000, cast=int)
    sessions_batch_size = config('sessions_batch_size', default=400, cast=int)
    batch = []
    sessions = defaultdict(lambda: None)
    sessions_batch = []

    codec = MessageCodec()
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

    consumer.subscribe([config("topic", default="saas-raw")])
    print("Kafka consumer subscribed")
    t_ = time()
    while True:
        msg = consumer.poll(1.0)
        if msg is None:
            continue
        #value = json.loads(msg.value().decode('utf-8'))
        messages = codec.decode_detailed(msg.value())
        session_id = codec.decode_key(msg.key())
        if messages is None:
            print('-')
            continue

        for message in messages:
            if LEVEL == 'detailed':
                n = handle_message(message)
            elif LEVEL == 'normal':
                n = handle_normal_message(message)

            #session_id = codec.decode_key(msg.key)
            sessions[session_id] = handle_session(sessions[session_id], message)
            if sessions[session_id]:
                sessions[session_id].sessionid = session_id

            # put in a batch for insertion if received a SessionEnd
            if isinstance(message, SessionEnd):
                if sessions[session_id]:
                    sessions_batch.append(sessions[session_id])

            # try to insert sessions
            if len(sessions_batch) >= sessions_batch_size:
                t2 = time()
                attempt_session_insert(sessions_batch)
                t2_ = time()
                print(f'[INFO] Inserted sessions into Redshift - time spent: {t2_-t2}')
                t_ += t2_-t2
                for s in sessions_batch:
                    try:
                        del sessions[s.sessionid]
                    except KeyError  as e:
                        print(repr(e))
                sessions_batch = []

            if n:
                n.sessionid = session_id
                n.received_at = int(datetime.now().timestamp() * 1000)
                n.batch_order_number = len(batch)
                batch.append(n)
            else:
                continue

            # insert a batch of events
            if len(batch) >= batch_size:
                t1 = time()
                print(f'[INFO] Spent time filling ({batch_size})-batch: {t1-t_}')
                attempt_batch_insert(batch)
                t1_ = time()
                t_ = t1_
                print(f'[INFO] Inserted events into Redshift - time spent: {t1_-t1}')
                batch = []
                consumer.commit()
                print("[INFO] sessions in cache:", len(sessions))


def attempt_session_insert(sess_batch):
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


def attempt_batch_insert(batch):
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

if __name__ == '__main__':
    print('[INFO] Setup complete')
    print('[INFO] Starting script')
    main()
