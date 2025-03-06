import logging

import clickhouse_driver
from decouple import config

logger = logging.getLogger(__name__)

settings = {}
if config('ch_timeout', cast=int, default=-1) > 0:
    logger.info(f"CH-max_execution_time set to {config('ch_timeout')}s")
    settings = {**settings, "max_execution_time": config('ch_timeout', cast=int)}

if config('ch_receive_timeout', cast=int, default=-1) > 0:
    logger.info(f"CH-receive_timeout set to {config('ch_receive_timeout')}s")
    settings = {**settings, "receive_timeout": config('ch_receive_timeout', cast=int)}


class ClickHouseClient:
    __client = None

    def __init__(self, database=None):
        extra_args = {}
        if config("CH_COMPRESSION", cast=bool, default=True):
            extra_args["compression"] = "lz4"
        self.__client = clickhouse_driver.Client(host=config("ch_host"),
                                                 database=database if database else config("ch_database",
                                                                                           default="default"),
                                                 user=config("ch_user", default="default"),
                                                 password=config("ch_password", default=""),
                                                 port=config("ch_port", cast=int),
                                                 settings=settings,
                                                 **extra_args) \
            if self.__client is None else self.__client

    def __enter__(self):
        return self

    def execute(self, query, parameters=None, **args):
        try:
            results = self.__client.execute(query=query, params=parameters, with_column_types=True, **args)
            keys = tuple(x for x, y in results[1])
            return [dict(zip(keys, i)) for i in results[0]]
        except Exception as err:
            logger.error("--------- CH EXCEPTION -----------", exc_info=err)
            logger.error("--------- CH QUERY EXCEPTION -----------")
            logger.error(self.format(query=query, parameters=parameters)
                         .replace('\n', '\\n')
                         .replace('    ', ' ')
                         .replace('        ', ' '))
            logger.error("--------------------")
            raise err

    def insert(self, query, params=None, **args):
        return self.__client.execute(query=query, params=params, **args)

    def client(self):
        return self.__client

    def format(self, query, parameters):
        if parameters is None:
            return query
        return self.__client.substitute_params(query, parameters, self.__client.connection.context)

    def __exit__(self, *args):
        pass


async def init():
    logger.info(f">CH_POOL:not defined")


async def terminate():
    pass
