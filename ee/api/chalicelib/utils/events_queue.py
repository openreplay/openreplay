import queue
import logging

from chalicelib.utils import pg_client

global_queue = None

class EventQueue():

    def __init__(self, test=False, queue_max_length=5):
        self.events = queue.Queue()
        self.events.maxsize = queue_max_length
        self.test = test

    def flush(self, conn):
        events = list()
        while not self.events.empty():
            project_id, user_id, element = self.events.get()
            events.append("({project_id}, '{user_id}', {timestamp}, '{action}', '{source}', '{category}', '{data}')".format(
                           project_id=project_id, user_id=user_id, timestamp=element.timestamp, action=element.action, source=element.source, category=element.category, data=element.data))
        if len(events)==0:
            return 0
        if self.test:
            print(events)
            return 1
        _base_query = 'INSERT INTO {database}.{table} (project_id, user_id, timestamp, action, source, category, data) VALUES {values_list}'
        conn.execute(_base_query.format(database='public', table='frontend_signals', values_list=', '.join(events)))
        # logging.info(_query)
        # res = 'done'
        # res = conn.fetchone()
        # res = helper.dict_to_camel_case(conn.fetchone())
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

    
