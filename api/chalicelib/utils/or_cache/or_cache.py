import functools
import inspect
import json
import logging
from chalicelib.utils import pg_client
import time
from fastapi.encoders import jsonable_encoder

logger = logging.getLogger(__name__)


class CachedResponse:
    def __init__(self, table, ttl):
        self.table = table
        self.ttl = ttl

    def __call__(self, func):
        self.param_names = {i: param for i, param in enumerate(inspect.signature(func).parameters)}

        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            values = dict()
            for i, param in self.param_names.items():
                if i < len(args):
                    values[param] = args[i]
                elif param in kwargs:
                    values[param] = kwargs[param]
                else:
                    values[param] = None
            result = self.__get(values)
            if result is None or result["expired"] \
                    or result["result"] is None or len(result["result"]) == 0:
                now = time.time()
                result = func(*args, **kwargs)
                now = time.time() - now
                if result is not None and len(result) > 0:
                    self.__add(values, result, now)
                    result[0]["cached"] = False
            else:
                logger.info(f"using cached response for "
                            f"{func.__name__}({','.join([f'{key}={val}' for key, val in enumerate(values)])})")
                result = result["result"]
                result[0]["cached"] = True

            return result

        return wrapper

    def __get(self, values):
        with pg_client.PostgresClient() as cur:
            sub_constraints = []
            for key, value in values.items():
                if value is not None:
                    sub_constraints.append(f"{key}=%({key})s")
                else:
                    sub_constraints.append(f"{key} IS NULL")
            query = f"""SELECT result,
                               (%(ttl)s>0 
                                AND EXTRACT(EPOCH FROM (timezone('utc'::text, now()) - created_at - INTERVAL %(interval)s)) > 0) AS expired
                        FROM {self.table}
                        WHERE {" AND ".join(sub_constraints)}"""
            query = cur.mogrify(query, {**values, 'ttl': self.ttl, 'interval': f'{self.ttl} seconds'})
            logger.debug("------")
            logger.debug(query)
            logger.debug("------")
            cur.execute(query)
            result = cur.fetchone()
        return result

    def __add(self, values, result, execution_time):
        with pg_client.PostgresClient() as cur:
            query = f"""INSERT INTO {self.table} ({",".join(values.keys())},result,execution_time) 
                        VALUES ({",".join([f"%({param})s" for param in values.keys()])},%(result)s,%(execution_time)s) 
                        ON CONFLICT ({",".join(values.keys())}) DO UPDATE SET result=%(result)s, 
                                                  execution_time=%(execution_time)s,
                                                  created_at=timezone('utc'::text, now());"""
            query = cur.mogrify(query, {**values,
                                        "result": json.dumps(jsonable_encoder(result)),
                                        "execution_time": execution_time})
            logger.debug("------")
            logger.debug(query)
            logger.debug("------")
            cur.execute(query)
