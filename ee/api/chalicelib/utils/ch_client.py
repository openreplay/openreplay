import clickhouse_driver
from chalicelib.utils.helper import environ


class ClickHouseClient:
    __client = None

    def __init__(self):
        self.__client = clickhouse_driver.Client(host=environ["ch_host"],
                                                 database="default",
                                                 port=int(environ["ch_port"])) \
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

    def __exit__(self, *args):
        pass
