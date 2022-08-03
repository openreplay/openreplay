from decouple import config

if config("LEGACY_SEARCH", cast=bool, default=False):
    print(">>> Using legacy search")
    from . import autocomplete as autocomplete
    from . import sessions as sessions
    from . import errors as errors
else:
    from . import autocomplete_ee as autocomplete
    from . import sessions_ee as sessions
    from . import errors_ee as errors
