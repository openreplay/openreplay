import clickhouse_driver
from decouple import config

settings = None
if config('pg_timeout', cast=int, default=-1) <= 0:
    settings = {"max_execution_time": config('pg_timeout', cast=int)}


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
