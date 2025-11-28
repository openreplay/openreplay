class PrefixMiddleware:
    def __init__(self, app, prefix: str):
        self.app = app
        self.prefix = prefix.rstrip("/")

    def __call__(self, environ, start_response):
        script_name = environ.get("SCRIPT_NAME", "")
        path_info = environ.get("PATH_INFO", "")

        if path_info.startswith(self.prefix):
            environ["SCRIPT_NAME"] = script_name + self.prefix
            environ["PATH_INFO"] = path_info[len(self.prefix):] or "/"

        return self.app(environ, start_response)
