from decouple import config

if config("LEGACY_SEARCH", cast=bool, default=True):
    from . import autocomplete as autocomplete
else:
    from . import autocomplete_ee as autocomplete
