import schemas
from chalicelib.core import autocomplete
from chalicelib.utils.event_filter_definition import SupportedFilter

SUPPORTED_TYPES = {
    schemas.FilterType.USER_OS: SupportedFilter(
        get=autocomplete.__generic_autocomplete_metas(typename=schemas.FilterType.USER_OS),
        query=autocomplete.__generic_autocomplete_metas(typename=schemas.FilterType.USER_OS)),
    schemas.FilterType.USER_BROWSER: SupportedFilter(
        get=autocomplete.__generic_autocomplete_metas(typename=schemas.FilterType.USER_BROWSER),
        query=autocomplete.__generic_autocomplete_metas(typename=schemas.FilterType.USER_BROWSER)),
    schemas.FilterType.USER_DEVICE: SupportedFilter(
        get=autocomplete.__generic_autocomplete_metas(typename=schemas.FilterType.USER_DEVICE),
        query=autocomplete.__generic_autocomplete_metas(typename=schemas.FilterType.USER_DEVICE)),
    schemas.FilterType.USER_COUNTRY: SupportedFilter(
        get=autocomplete.__generic_autocomplete_metas(typename=schemas.FilterType.USER_COUNTRY),
        query=autocomplete.__generic_autocomplete_metas(typename=schemas.FilterType.USER_COUNTRY)),
    schemas.FilterType.USER_CITY: SupportedFilter(
        get=autocomplete.__generic_autocomplete_metas(typename=schemas.FilterType.USER_CITY),
        query=autocomplete.__generic_autocomplete_metas(typename=schemas.FilterType.USER_CITY)),
    schemas.FilterType.USER_STATE: SupportedFilter(
        get=autocomplete.__generic_autocomplete_metas(typename=schemas.FilterType.USER_STATE),
        query=autocomplete.__generic_autocomplete_metas(typename=schemas.FilterType.USER_STATE)),
    schemas.FilterType.USER_ID: SupportedFilter(
        get=autocomplete.__generic_autocomplete_metas(typename=schemas.FilterType.USER_ID),
        query=autocomplete.__generic_autocomplete_metas(typename=schemas.FilterType.USER_ID)),
    schemas.FilterType.USER_ANONYMOUS_ID: SupportedFilter(
        get=autocomplete.__generic_autocomplete_metas(typename=schemas.FilterType.USER_ANONYMOUS_ID),
        query=autocomplete.__generic_autocomplete_metas(typename=schemas.FilterType.USER_ANONYMOUS_ID)),
    schemas.FilterType.REV_ID: SupportedFilter(
        get=autocomplete.__generic_autocomplete_metas(typename=schemas.FilterType.REV_ID),
        query=autocomplete.__generic_autocomplete_metas(typename=schemas.FilterType.REV_ID)),
    schemas.FilterType.REFERRER: SupportedFilter(
        get=autocomplete.__generic_autocomplete_metas(typename=schemas.FilterType.REFERRER),
        query=autocomplete.__generic_autocomplete_metas(typename=schemas.FilterType.REFERRER)),
    schemas.FilterType.UTM_CAMPAIGN: SupportedFilter(
        get=autocomplete.__generic_autocomplete_metas(typename=schemas.FilterType.UTM_CAMPAIGN),
        query=autocomplete.__generic_autocomplete_metas(typename=schemas.FilterType.UTM_CAMPAIGN)),
    schemas.FilterType.UTM_MEDIUM: SupportedFilter(
        get=autocomplete.__generic_autocomplete_metas(typename=schemas.FilterType.UTM_MEDIUM),
        query=autocomplete.__generic_autocomplete_metas(typename=schemas.FilterType.UTM_MEDIUM)),
    schemas.FilterType.UTM_SOURCE: SupportedFilter(
        get=autocomplete.__generic_autocomplete_metas(typename=schemas.FilterType.UTM_SOURCE),
        query=autocomplete.__generic_autocomplete_metas(typename=schemas.FilterType.UTM_SOURCE)),
    # IOS
    schemas.FilterType.USER_OS_MOBILE: SupportedFilter(
        get=autocomplete.__generic_autocomplete_metas(typename=schemas.FilterType.USER_OS_MOBILE),
        query=autocomplete.__generic_autocomplete_metas(typename=schemas.FilterType.USER_OS_MOBILE)),
    schemas.FilterType.USER_DEVICE_MOBILE: SupportedFilter(
        get=autocomplete.__generic_autocomplete_metas(
            typename=schemas.FilterType.USER_DEVICE_MOBILE),
        query=autocomplete.__generic_autocomplete_metas(typename=schemas.FilterType.USER_DEVICE_MOBILE)),
    schemas.FilterType.USER_COUNTRY_MOBILE: SupportedFilter(
        get=autocomplete.__generic_autocomplete_metas(typename=schemas.FilterType.USER_COUNTRY_MOBILE),
        query=autocomplete.__generic_autocomplete_metas(typename=schemas.FilterType.USER_COUNTRY_MOBILE)),
    schemas.FilterType.USER_ID_MOBILE: SupportedFilter(
        get=autocomplete.__generic_autocomplete_metas(typename=schemas.FilterType.USER_ID_MOBILE),
        query=autocomplete.__generic_autocomplete_metas(typename=schemas.FilterType.USER_ID_MOBILE)),
    schemas.FilterType.USER_ANONYMOUS_ID_MOBILE: SupportedFilter(
        get=autocomplete.__generic_autocomplete_metas(typename=schemas.FilterType.USER_ANONYMOUS_ID_MOBILE),
        query=autocomplete.__generic_autocomplete_metas(typename=schemas.FilterType.USER_ANONYMOUS_ID_MOBILE)),
    schemas.FilterType.REV_ID_MOBILE: SupportedFilter(
        get=autocomplete.__generic_autocomplete_metas(typename=schemas.FilterType.REV_ID_MOBILE),
        query=autocomplete.__generic_autocomplete_metas(typename=schemas.FilterType.REV_ID_MOBILE)),

}


def search(text: str, meta_type: schemas.FilterType, project_id: int):
    rows = []
    if meta_type not in list(SUPPORTED_TYPES.keys()):
        return {"errors": ["unsupported type"]}
    rows += SUPPORTED_TYPES[meta_type].get(project_id=project_id, text=text)
    # for IOS events autocomplete
    # if meta_type + "_IOS" in list(SUPPORTED_TYPES.keys()):
    #     rows += SUPPORTED_TYPES[meta_type + "_IOS"].get(project_id=project_id, text=text)
    return {"data": rows}
