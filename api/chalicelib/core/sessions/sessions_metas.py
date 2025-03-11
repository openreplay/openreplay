from functools import cache

import schemas
from chalicelib.core.autocomplete import autocomplete
from chalicelib.utils.event_filter_definition import SupportedFilter


@cache
def supported_types():
    return {
        schemas.FilterType.USER_OS: SupportedFilter(
            get=autocomplete.generic_autocomplete_metas(typename=schemas.FilterType.USER_OS),
            query=autocomplete.generic_autocomplete_metas(typename=schemas.FilterType.USER_OS)),
        schemas.FilterType.USER_BROWSER: SupportedFilter(
            get=autocomplete.generic_autocomplete_metas(typename=schemas.FilterType.USER_BROWSER),
            query=autocomplete.generic_autocomplete_metas(typename=schemas.FilterType.USER_BROWSER)),
        schemas.FilterType.USER_DEVICE: SupportedFilter(
            get=autocomplete.generic_autocomplete_metas(typename=schemas.FilterType.USER_DEVICE),
            query=autocomplete.generic_autocomplete_metas(typename=schemas.FilterType.USER_DEVICE)),
        schemas.FilterType.USER_COUNTRY: SupportedFilter(
            get=autocomplete.generic_autocomplete_metas(typename=schemas.FilterType.USER_COUNTRY),
            query=autocomplete.generic_autocomplete_metas(typename=schemas.FilterType.USER_COUNTRY)),
        schemas.FilterType.USER_CITY: SupportedFilter(
            get=autocomplete.generic_autocomplete_metas(typename=schemas.FilterType.USER_CITY),
            query=autocomplete.generic_autocomplete_metas(typename=schemas.FilterType.USER_CITY)),
        schemas.FilterType.USER_STATE: SupportedFilter(
            get=autocomplete.generic_autocomplete_metas(typename=schemas.FilterType.USER_STATE),
            query=autocomplete.generic_autocomplete_metas(typename=schemas.FilterType.USER_STATE)),
        schemas.FilterType.USER_ID: SupportedFilter(
            get=autocomplete.generic_autocomplete_metas(typename=schemas.FilterType.USER_ID),
            query=autocomplete.generic_autocomplete_metas(typename=schemas.FilterType.USER_ID)),
        schemas.FilterType.USER_ANONYMOUS_ID: SupportedFilter(
            get=autocomplete.generic_autocomplete_metas(typename=schemas.FilterType.USER_ANONYMOUS_ID),
            query=autocomplete.generic_autocomplete_metas(typename=schemas.FilterType.USER_ANONYMOUS_ID)),
        schemas.FilterType.REV_ID: SupportedFilter(
            get=autocomplete.generic_autocomplete_metas(typename=schemas.FilterType.REV_ID),
            query=autocomplete.generic_autocomplete_metas(typename=schemas.FilterType.REV_ID)),
        schemas.FilterType.REFERRER: SupportedFilter(
            get=autocomplete.generic_autocomplete_metas(typename=schemas.FilterType.REFERRER),
            query=autocomplete.generic_autocomplete_metas(typename=schemas.FilterType.REFERRER)),
        schemas.FilterType.UTM_CAMPAIGN: SupportedFilter(
            get=autocomplete.generic_autocomplete_metas(typename=schemas.FilterType.UTM_CAMPAIGN),
            query=autocomplete.generic_autocomplete_metas(typename=schemas.FilterType.UTM_CAMPAIGN)),
        schemas.FilterType.UTM_MEDIUM: SupportedFilter(
            get=autocomplete.generic_autocomplete_metas(typename=schemas.FilterType.UTM_MEDIUM),
            query=autocomplete.generic_autocomplete_metas(typename=schemas.FilterType.UTM_MEDIUM)),
        schemas.FilterType.UTM_SOURCE: SupportedFilter(
            get=autocomplete.generic_autocomplete_metas(typename=schemas.FilterType.UTM_SOURCE),
            query=autocomplete.generic_autocomplete_metas(typename=schemas.FilterType.UTM_SOURCE)),
        # Mobile
        schemas.FilterType.USER_OS_MOBILE: SupportedFilter(
            get=autocomplete.generic_autocomplete_metas(typename=schemas.FilterType.USER_OS_MOBILE),
            query=autocomplete.generic_autocomplete_metas(typename=schemas.FilterType.USER_OS_MOBILE)),
        schemas.FilterType.USER_DEVICE_MOBILE: SupportedFilter(
            get=autocomplete.generic_autocomplete_metas(
                typename=schemas.FilterType.USER_DEVICE_MOBILE),
            query=autocomplete.generic_autocomplete_metas(typename=schemas.FilterType.USER_DEVICE_MOBILE)),
        schemas.FilterType.USER_COUNTRY_MOBILE: SupportedFilter(
            get=autocomplete.generic_autocomplete_metas(typename=schemas.FilterType.USER_COUNTRY_MOBILE),
            query=autocomplete.generic_autocomplete_metas(typename=schemas.FilterType.USER_COUNTRY_MOBILE)),
        schemas.FilterType.USER_ID_MOBILE: SupportedFilter(
            get=autocomplete.generic_autocomplete_metas(typename=schemas.FilterType.USER_ID_MOBILE),
            query=autocomplete.generic_autocomplete_metas(typename=schemas.FilterType.USER_ID_MOBILE)),
        schemas.FilterType.USER_ANONYMOUS_ID_MOBILE: SupportedFilter(
            get=autocomplete.generic_autocomplete_metas(typename=schemas.FilterType.USER_ANONYMOUS_ID_MOBILE),
            query=autocomplete.generic_autocomplete_metas(typename=schemas.FilterType.USER_ANONYMOUS_ID_MOBILE)),
        schemas.FilterType.REV_ID_MOBILE: SupportedFilter(
            get=autocomplete.generic_autocomplete_metas(typename=schemas.FilterType.REV_ID_MOBILE),
            query=autocomplete.generic_autocomplete_metas(typename=schemas.FilterType.REV_ID_MOBILE)),

    }


def search(text: str, meta_type: schemas.FilterType, project_id: int):
    rows = []
    if meta_type not in list(supported_types().keys()):
        return {"errors": ["unsupported type"]}
    rows += supported_types()[meta_type].get(project_id=project_id, text=text)
    # for IOS events autocomplete
    # if meta_type + "_IOS" in list(SUPPORTED_TYPES.keys()):
    #     rows += SUPPORTED_TYPES[meta_type + "_IOS"].get(project_id=project_id, text=text)
    return {"data": rows}
