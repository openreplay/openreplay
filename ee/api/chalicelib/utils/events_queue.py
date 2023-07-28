import json
import queue
import logging

from chalicelib.utils import pg_client

global_queue = None

class EventQueue():

    def __init__(self, test=False, queue_max_length=100):
        self.events = queue.Queue()
        self.events.maxsize = queue_max_length
        self.test = test

    def flush(self, conn):
        events = list()
        params = dict()
        # while not self.events.empty():
        #     project_id, user_id, element = self.events.get()
        #     events.append("({project_id}, {user_id}, {timestamp}, '{action}', '{source}', '{category}', '{data}')".format(
        #                    project_id=project_id, user_id=user_id, timestamp=element.timestamp, action=element.action, source=element.source, category=element.category, data=json.dumps(element.data)))
        i = 0
        while not self.events.empty():
            project_id, user_id, element = self.events.get()
            params[f'project_id_{i}'] = project_id
            params[f'user_id_{i}'] = user_id
            for _key, _val in element.model_dump().items():
                if _key == 'data':
                    params[f'{_key}_{i}'] = json.dumps(_val)
                    if 'sessionId' in _val.keys():
                        params[f'session_id_{i}'] = int(_val['sessionId'])
                    else:
                        params[f'session_id_{i}'] = None
                else:
                    params[f'{_key}_{i}'] = _val
            events.append(f"(%(project_id_{i})s, %(user_id_{i})s, %(timestamp_{i})s, %(action_{i})s, %(source_{i})s, %(category_{i})s, %(data_{i})s::jsonb, %(session_id_{i})s)")
            i += 1
        if i == 0:
            return 0
        if self.test:
            print(events)
            return 1
        conn.execute(
            conn.mogrify(f"""INSERT INTO public.frontend_signals (project_id, user_id, timestamp, action, source, category, data, session_id)
                        VALUES {' , '.join(events)}""", params)
        )
        return 1

    def force_flush(self):
        if not self.events.empty():
            try:
                with pg_client.PostgresClient() as conn:
                    self.flush(conn)
            except Exception as e:
                logging.info(f'Error: {e}')

    def put(self, element):
        if self.events.full():
            try:
                with pg_client.PostgresClient() as conn:
                    self.flush(conn)
            except Exception as e:
                logging.info(f'Error: {e}')
        self.events.put(element)
        self.events.task_done()

async def init(test=False):
    global global_queue
    global_queue = EventQueue(test=test)
    logging.info("> queue initialized")
    
async def terminate():
    global global_queue
    if global_queue is not None:
        global_queue.force_flush()
        logging.info('> queue fulshed')

# def __process_schema(trace):
#     data = trace.model_dump()
#     data["parameters"] = json.dumps(trace.parameters) if trace.parameters is not None and len(
#         trace.parameters.keys()) > 0 else None
#     data["payload"] = json.dumps(trace.payload) if trace.payload is not None and len(trace.payload.keys()) > 0 else None
#     return data
