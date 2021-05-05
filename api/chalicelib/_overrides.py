from chalice import Chalice, CORSConfig
from chalicelib.blueprints import bp_authorizers
from chalicelib.core import authorizers

import sched
import threading
import time
from datetime import datetime
import pytz
from croniter import croniter

base_time = datetime.now(pytz.utc)

cors_config = CORSConfig(
    allow_origin='*',
    allow_headers=['vnd.asayer.io.sid'],
    # max_age=600,
    # expose_headers=['X-Special-Header'],
    allow_credentials=True
)


def chalice_app(app):
    def app_route(self, path, **kwargs):
        kwargs.setdefault('cors', cors_config)
        kwargs.setdefault('authorizer', bp_authorizers.jwt_authorizer)
        handler_type = 'route'
        name = kwargs.pop('name', None)
        registration_kwargs = {'path': path, 'kwargs': kwargs, 'authorizer': kwargs.get("authorizer")}

        def _register_handler(user_handler):
            handler_name = name
            if handler_name is None:
                handler_name = user_handler.__name__
            if registration_kwargs is not None:
                kwargs = registration_kwargs
            else:
                kwargs = {}

            if kwargs['authorizer'] == bp_authorizers.jwt_authorizer \
                    or kwargs['authorizer'] == bp_authorizers.api_key_authorizer:
                def _user_handler(context=None, **args):
                    if context is not None:
                        args['context'] = context
                    else:
                        authorizer_context = app.current_request.context['authorizer']
                        if kwargs['authorizer'] == bp_authorizers.jwt_authorizer:
                            args['context'] = authorizers.jwt_context(authorizer_context)
                        else:
                            args['context'] = authorizer_context
                    return user_handler(**args)

                wrapped = self._wrap_handler(handler_type, handler_name, _user_handler)
                self._register_handler(handler_type, handler_name, _user_handler, wrapped, kwargs)
            else:
                wrapped = self._wrap_handler(handler_type, handler_name, user_handler)
                self._register_handler(handler_type, handler_name, user_handler, wrapped, kwargs)
            return wrapped

        return _register_handler

    app.route = app_route.__get__(app, Chalice)

    def app_schedule(self, expression, name=None, description=''):
        handler_type = 'schedule'
        registration_kwargs = {'expression': expression,
                               'description': description}

        def _register_handler(user_handler):
            handler_name = name
            if handler_name is None:
                handler_name = user_handler.__name__
            kwargs = registration_kwargs
            cron_expression = kwargs["expression"].to_string()[len("cron("):-1]
            if len(cron_expression.split(" ")) > 5:
                cron_expression = " ".join(cron_expression.split(" ")[:-1])
                cron_expression = cron_expression.replace("?", "*")
            cron_shell(user_handler, cron_expression)

            wrapped = self._wrap_handler(handler_type, handler_name, user_handler)
            self._register_handler(handler_type, handler_name, user_handler, wrapped, kwargs)
            return wrapped

        return _register_handler

    app.schedule = app_schedule.__get__(app, Chalice)

    def spawn(function, args):
        th = threading.Thread(target=function, kwargs=args)
        th.setDaemon(True)
        th.start()

    def cron_shell(function, cron_expression):
        def to_start():
            scheduler = sched.scheduler(time.time, time.sleep)
            citer = croniter(cron_expression, base_time)
            while True:
                next_execution = citer.get_next(datetime)
                print(f"{function.__name__} next execution: {next_execution}")
                scheduler.enterabs(next_execution.timestamp(), 1, function, argument=(None,))
                scheduler.run()
                print(f"{function.__name__} executed: {next_execution}")

        spawn(to_start, None)
