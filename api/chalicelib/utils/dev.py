from functools import wraps
from time import time
import inspect
from chalicelib.utils import helper
import logging

logger = logging.getLogger(__name__)


def timed(f):
    @wraps(f)
    def wrapper(*args, **kwds):
        if not helper.TRACK_TIME:
            return f(*args, **kwds)
        start = time()
        result = f(*args, **kwds)
        elapsed = time() - start
        if inspect.stack()[1][3] == "_view_func":
            logging.debug("%s: took %d s to finish" % (f.__name__, elapsed))
        else:
            call_stack = [i[3] for i in inspect.stack()[1:] if i[3] != "wrapper"]
            call_stack = [c for c in call_stack if
                          c not in ['__init__', '__call__', 'finish_request', 'process_request_thread',
                                    'handle_request', '_generic_handle', 'handle', '_bootstrap_inner', 'run',
                                    '_bootstrap', '_main_rest_api_handler', '_user_handler',
                                    '_get_view_function_response', 'wrapped_event', 'handle_one_request',
                                    '_global_error_handler', 'openreplay_middleware']]
            logger.debug("%s > %s took %d s to finish" % (" > ".join(call_stack), f.__name__, elapsed))
        return result

    return wrapper
