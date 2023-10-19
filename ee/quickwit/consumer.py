from decouple import config
from confluent_kafka import Consumer
from datetime import datetime
import os as _os
import queue
import requests
import json


from time import time, sleep
QUICKWIT_PORT = config('QUICKWIT_PORT', default=7280, cast=int)

#decryption = config('encrypted', cast=bool)
decryption = False
MessageCodec = None
max_retry=3
Fetch, FetchEvent, PageEvent, GraphQ = None, None, None, None
if decryption:
    from msgcodec.msgcodec import MessageCodec
    from msgcodec.messages import Fetch, FetchEvent, PageEvent, GraphQL
    print("Enabled decryption mode")

def _quickwit_ingest(index, data_list, retry=0):
    try:
        res = requests.post(f'http://localhost:{QUICKWIT_PORT}/api/v1/{index}/ingest', data=__jsonify_data(data_list, index))
    except requests.exceptions.ConnectionError as e:
        retry += 1
        assert retry <= max_retry, f'[ENDPOINT CONNECTION FAIL] Failed to connect to endpoint http://localhost:{QUICKWIT_PORT}/api/v1/{index}/ingest\n{e}\n'
        sleep(5*retry)
        print(f"[ENDPOINT ERROR] Failed to connect to endpoint http://localhost:{QUICKWIT_PORT}/api/v1/{index}/ingest, retrying in {5*retry} seconds..\n")
        return _quickwit_ingest(index, data_list, retry=retry)
    return res

def __jsonify_data(data_list, msg_type):
    res = list()
    i = 0
    for data in data_list:
        if msg_type == 'fetchevent':
            try:
                _tmp = data['request']
                if _tmp != '':
                    data['request'] = json.loads(_tmp)
                else:
                    data['request'] = {}
                _tmp = data['response']
                if _tmp != '':
                    data['response'] = json.loads(_tmp)
                    if data['response']['body'][:1] == '{' or data['response']['body'][:2] == '[{':
                        data['response']['body'] = json.loads(data['response']['body'])
                else:
                    data['response'] = {}
            except Exception as e:
                print(f'Error {e}\tWhile decoding fetchevent\nEvent: {data}\n')
        elif msg_type == 'graphql':
            try:
                _tmp = data['variables']
                if _tmp != '':
                    data['variables'] = json.loads(_tmp)
                else:
                    data['variables'] = {}
                _tmp = data['response']
                if _tmp != '':
                    data['response'] = json.loads(_tmp)
                else:
                    data['response'] = {}
            except Exception as e:
                print(f'Error {e}\tWhile decoding graphql\nEvent: {data}\n')
        i += 1
        res.append(json.dumps(data))
    return '\n'.join(res)

def message_type(message):
    if decryption:
        if isinstance(message, FetchEvent) or isinstance(Fetch):
            return 'fetchevent'
        elif isinstance(message, PageEvent):
            return 'pageevent'
        elif isinstance(message, GraphQL):
            return 'graphql'
        else:
            return 'default'
    else:
        if 'loaded' in message.keys():
            return 'pageevent'
        elif 'variables' in message.keys():
            return 'graphql'
        elif 'status' in message.keys():
            return 'fetchevent'
        else:
            return 'default'


class KafkaFilter():

    def __init__(self):
        kafka_sources = config('KAFKA_SERVER')
        topic = config('QUICKWIT_TOPIC')

        fetchevent_maxsize = config('fetch_maxsize', default=100, cast=int)
        graphql_maxsize = config('graphql_maxsize', default=100, cast=int)
        pageevent_maxsize = config('pageevent_maxsize', default=100, cast=int)

        if decryption:
            self.codec = MessageCodec()
            self.consumer = Consumer({
                "security.protocol": "SSL",
                "bootstrap.servers": kafka_sources,
                "group.id": config("group_id"),
                "auto.offset.reset": "earliest",
                "enable.auto.commit":False
            })
        else:
            self.consumer = Consumer({
                "security.protocol": "SSL",
                "bootstrap.servers": kafka_sources,
                "group.id": config("group_id"),
                "auto.offset.reset": "earliest",
                #value_deserializer=lambda m: json.loads(m.decode('utf-8')),
                "enable.auto.commit": False
            })
        self.consumer.subscribe([topic])
        self.queues = {'fetchevent': queue.Queue(fetchevent_maxsize),
                'graphql': queue.Queue(graphql_maxsize),
                'pageevent': queue.Queue(pageevent_maxsize)
                }

    def add_to_queue(self, message):
        associated_queue = message_type(message)
        if associated_queue == 'default':
            return
        if self.queues[associated_queue].full():
            self.flush_to_quickwit()
        self.queues[associated_queue].put(message)

    def flush_to_quickwit(self):
        for queue_name, _queue in self.queues.items():
            _list = list()
            unix_timestamp = int(datetime.now().timestamp())
            while not _queue.empty():
                msg = _queue.get()
                if decryption:
                    value = msg.__dict__
                else:
                    value = dict(msg)
                value['insertion_timestamp'] = unix_timestamp
                if queue_name == 'fetchevent' and 'message_id' not in value.keys():
                    value['message_id'] = 0
                _list.append(value)
            if len(_list) > 0:
                _quickwit_ingest(queue_name, _list)
        self.consumer.commit()

    def run(self):
        _tmp_previous = None
        repeated = False
        while True:
            msg = self.consumer.poll(1.0)
            if msg is None:
                continue
            if msg.error():
                print(f'[Consumer error] {msg.error()}')
                continue
            value = json.loads(msg.value().decode('utf-8'))
            if decryption:
                messages = self.codec.decode_detailed(value)
            else:
                messages = [value]

            if _tmp_previous is None:
                _tmp_previous = messages
                if type(messages)==list:
                    for message in messages:
                        self.add_to_queue(message)
                else:
                    self.add_to_queue(messages)
            elif _tmp_previous != messages:
                if type(messages)==list:
                    for message in messages:
                        self.add_to_queue(message)
                else:
                    self.add_to_queue(messages)
                _tmp_previous = messages
                repeated = False
            elif not repeated:
                repeated = True


if __name__ == '__main__':
    layer = KafkaFilter()
    layer.run()
