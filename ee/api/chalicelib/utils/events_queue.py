import queue
import logging
# import threading

# import schemas
# import schemas_ee

#from utils import helper
from utils import pg_client

global_queue = None

class EventQueue():

    def __init__(self, test=False, queue_max_length=5):
        self.events = queue.Queue()
        self.events.maxsize = queue_max_length
        self.test = test

    def flush(self, conn):
        events = list()
        while not self.events.empty():
            events.append(self.events.get())
        # self.events.task_done()
        if self.test:
            print(events)
            return 1
        _query = conn.mogrify("""INSERT INTO %(database)s.%(table)s (project_id, user_id, timestamp, action, source, category, data) VALUES %(events)s""",
                               {'database': 'public', 'table': 'frontend_signals', 'events': "(0, 'test', 0, 'action', 's', 'c', '{}')"})
        logging.info(_query)
        res = 'done'
        # res = conn.fetchone()
        #res = helper.dict_to_camel_case(conn.fetchone())
        return res

    def force_flush(self):
        if not self.events.empty():
            with pg_client.PostgreClient() as conn:
                self.flush(conn)

    def put(self, element):
        if self.events.full():
            with pg_client.PostgresClient() as conn:
                self.flush(conn)
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

    
