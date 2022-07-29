import os
from time import sleep
from kafka import KafkaConsumer, KafkaProducer
from datetime import datetime
from collections import defaultdict

from msgcodec.codec import MessageCodec
from msgcodec.messages import Fetch, FetchEvent, PageEvent, GraphQL
import json

import getopt, sys

n = 0
def transform_fetch(data):
    global n
    n += 1
    return {
            'method': data.method, 'url': data.url, 'request': data.url, 'response': data.request,
            'status': data.status, 'timestamp': data.timestamp, 'duration': data.duration
            }

def transform_graphql(data):
    global n
    n += 1
    return {
            'operation_kind': data.operation_kind, 'operation_name': data.operation_name,
            'variables': data.variables, 'response': data.response
            }

def transform_pageevent(data):
    global n
    n += 1
    return {'massage_id': data.message_id, 'timestamp': data.timestamp, 'url': data.timestamp,
            'referrer': data.referrer, 'loaded': data.loaded, 'request_start': data.request_start,
            'response_start': data.response_start, 'response_end': data.response_end,
            'dom_content_loaded_event_start': data.dom_content_loaded_event_start,
            'dom_content_loaded_event_end': data.dom_content_loaded_event_end,
            'load_event_start': data.load_event_start, 'load_event_end': data.load_event_end,
            'first_paint': data.first_paint, 'first_contentful_paint': data.first_contentful_paint,
            'speed_index': data.speed_index, 'visually_complete': data.visually_complete,
            'time_to_interactive': data.time_to_interactive
            }

def create_producer():
    producer = KafkaProducer(#security_protocol="SSL",
                             bootstrap_servers=os.environ['KAFKA_SERVER_2'],
                                               # os.environ['KAFKA_SERVER_1']],
                             #ssl_cafile="./ca.pem",
                             #ssl_certfile="./service.cert",
                             #ssl_keyfile="./service.key",
                             value_serializer=lambda v: json.dumps(v).encode('ascii')
                             )
    return producer

def create_consumer():
    consumer = KafkaConsumer(#security_protocol="SSL",
                             bootstrap_servers=os.environ['KAFKA_SERVER_2'],
                                               # os.environ['KAFKA_SERVER_1']],
                             group_id=f"quickwit_connector2",
                             auto_offset_reset="earliest",
                             enable_auto_commit=False
                             )
    return consumer


def consumer_producer_end():
    global n

    codec = MessageCodec()
    consumer = create_consumer()
    producer = create_producer()

    consumer.subscribe(topics=["raw", "raw_ios"])
    print("Kafka consumer subscribed")
    escape = 0
    for msg in consumer:
        messages = codec.decode_detailed(msg.value)
        session_id = codec.decode_key(msg.key)
        if messages is None:
            print('-')
        for message in messages:
            send = False
            if isinstance(message, Fetch) or isinstance(message, FetchEvent):
                producer.send('quickwit-kafka', value=transform_fetch(message))
                print(f'added message {n} type Fetch')
                sleep(5)
            if isinstance(message, GraphQL):
                producer.send('quickwit-kafka', value=transform_graphql(message))
                print(f'added message {n} type GraphQL')
                sleep(5)
            if isinstance(message, PageEvent):
                producer.send('quickwit-kafka', value=transform_pageevent(message))
                print(f'added message {n} type PageEvent')
                sleep(5)


def consumer_end():
    consumer = create_consumer()
    consumer.subscribe(topics=['quickwit-kafka'])
    for msg in consumer:
        print(msg)


def handle_args():
    arguments = len(sys.argv)-1
    argument_list = sys.argv[1:]
    pos = 1
    short_options = 'hm:'
    long_options = ['help', 'method=']
    try:
        arguments, values = getopt.getopt(argument_list, short_options, long_options)
    except getopt.error as err:
        print(str(err))
        sys.exit(2)
    
    for arg, argv in arguments:
        if arg in ('-h', '--help'):
            print(""" Methods
--method, -m      available methods: consumer, producer
--help, -h        show help
                  """)
        elif arg in ('-m', '--method'):
            if argv == 'consumer':
                consumer_end()
            elif argv == 'producer':
                consumer_producer_end()
            else:
                print('Method not found. Available methods: consumer, producer')


if __name__ == '__main__':
    handle_args()
