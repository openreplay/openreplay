from decouple import config

if config("LEGACY_SEARCH", cast=bool, default=False):
    print(">>> Using legacy search")
    from . import autocomplete as autocomplete
    from . import sessions as sessions
else:
    from . import autocomplete_ee as autocomplete
    from . import sessions_ee as sessions
