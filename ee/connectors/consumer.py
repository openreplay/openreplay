import os
from kafka import KafkaConsumer
from datetime import datetime
from collections import defaultdict

from msgcodec.msgcodec import MessageCodec
from msgcodec.messages import SessionEnd
from db.api import DBConnection
from db.models import events_detailed_table_name, events_table_name, sessions_table_name
from db.writer import insert_batch
from handler import handle_message, handle_normal_message, handle_session

DATABASE = os.environ['DATABASE_NAME']
LEVEL = os.environ['level']

db = DBConnection(DATABASE)

if LEVEL == 'detailed':
    table_name = events_detailed_table_name
elif LEVEL == 'normal':
    table_name = events_table_name


def main():
    batch_size = 4000
    sessions_batch_size = 400
    batch = []
    sessions = defaultdict(lambda: None)
    sessions_batch = []

    codec = MessageCodec()
    consumer = KafkaConsumer(security_protocol="SSL",
                             bootstrap_servers=[os.environ['KAFKA_SERVER_2'],
                                                os.environ['KAFKA_SERVER_1']],
                             group_id=f"my_test3_connector_{DATABASE}",
                             auto_offset_reset="earliest",
                             enable_auto_commit=False
                             )

    consumer.subscribe(topics=["raw", "raw_ios"])
    print("Kafka consumer subscribed")
    for msg in consumer:
        messages = codec.decode_detailed(msg.value)
        session_id = codec.decode_key(msg.key)
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
                attempt_session_insert(sessions_batch)
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
                attempt_batch_insert(batch)
                batch = []
                consumer.commit()
                print("sessions in cache:", len(sessions))


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
    main()
