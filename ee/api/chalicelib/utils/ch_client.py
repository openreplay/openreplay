import logging

import clickhouse_driver
from decouple import config

logging.basicConfig(level=config("LOGLEVEL", default=logging.INFO))
logging.getLogger('apscheduler').setLevel(config("LOGLEVEL", default=logging.INFO))

settings = {}
if config('ch_timeout', cast=int, default=-1) > 0:
    logging.info(f"CH-max_execution_time set to {config('ch_timeout')}s")
    settings = {**settings, "max_execution_time": config('ch_timeout', cast=int)}

if config('ch_receive_timeout', cast=int, default=-1) > 0:
    logging.info(f"CH-receive_timeout set to {config('ch_receive_timeout')}s")
    settings = {**settings, "receive_timeout": config('ch_receive_timeout', cast=int)}


class ClickHouseClient:
    __client = None

    def __init__(self):
        self.__client = clickhouse_driver.Client(host=config("ch_host"),
                                                 database="default",
                                                 port=config("ch_port", cast=int),
                                                 settings=settings) \
            if self.__client is None else self.__client

    def __enter__(self):
        return self

    def execute(self, query, params=None, **args):
        results = self.__client.execute(query=query, params=params, with_column_types=True, **args)
        keys = tuple(x for x, y in results[1])
        return [dict(zip(keys, i)) for i in results[0]]

    def insert(self, query, params=None, **args):
        return self.__client.execute(query=query, params=params, **args)

    def client(self):
        return self.__client

    def format(self, query, params):
        return self.__client.substitute_params(query, params, self.__client.connection.context)

    def __exit__(self, *args):
        pass
