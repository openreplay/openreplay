import schemas
from chalicelib.core import autocomplete
from chalicelib.utils.event_filter_definition import SupportedFilter

SUPPORTED_TYPES = {
    schemas.FilterType.user_os: SupportedFilter(
        get=autocomplete.__generic_autocomplete_metas(typename=schemas.FilterType.user_os),
        query=autocomplete.__generic_autocomplete_metas(typename=schemas.FilterType.user_os)),
    schemas.FilterType.user_browser: SupportedFilter(
        get=autocomplete.__generic_autocomplete_metas(typename=schemas.FilterType.user_browser),
        query=autocomplete.__generic_autocomplete_metas(typename=schemas.FilterType.user_browser)),
    schemas.FilterType.user_device: SupportedFilter(
        get=autocomplete.__generic_autocomplete_metas(typename=schemas.FilterType.user_device),
        query=autocomplete.__generic_autocomplete_metas(typename=schemas.FilterType.user_device)),
    schemas.FilterType.user_country: SupportedFilter(
        get=autocomplete.__generic_autocomplete_metas(typename=schemas.FilterType.user_country),
        query=autocomplete.__generic_autocomplete_metas(typename=schemas.FilterType.user_country)),
    schemas.FilterType.user_id: SupportedFilter(
        get=autocomplete.__generic_autocomplete_metas(typename=schemas.FilterType.user_id),
        query=autocomplete.__generic_autocomplete_metas(typename=schemas.FilterType.user_id)),
    schemas.FilterType.user_anonymous_id: SupportedFilter(
        get=autocomplete.__generic_autocomplete_metas(typename=schemas.FilterType.user_anonymous_id),
        query=autocomplete.__generic_autocomplete_metas(typename=schemas.FilterType.user_anonymous_id)),
    schemas.FilterType.rev_id: SupportedFilter(
        get=autocomplete.__generic_autocomplete_metas(typename=schemas.FilterType.rev_id),
        query=autocomplete.__generic_autocomplete_metas(typename=schemas.FilterType.rev_id)),
    schemas.FilterType.referrer: SupportedFilter(
        get=autocomplete.__generic_autocomplete_metas(typename=schemas.FilterType.referrer),
        query=autocomplete.__generic_autocomplete_metas(typename=schemas.FilterType.referrer)),
    schemas.FilterType.utm_campaign: SupportedFilter(
        get=autocomplete.__generic_autocomplete_metas(typename=schemas.FilterType.utm_campaign),
        query=autocomplete.__generic_autocomplete_metas(typename=schemas.FilterType.utm_campaign)),
    schemas.FilterType.utm_medium: SupportedFilter(
        get=autocomplete.__generic_autocomplete_metas(typename=schemas.FilterType.utm_medium),
        query=autocomplete.__generic_autocomplete_metas(typename=schemas.FilterType.utm_medium)),
    schemas.FilterType.utm_source: SupportedFilter(
        get=autocomplete.__generic_autocomplete_metas(typename=schemas.FilterType.utm_source),
        query=autocomplete.__generic_autocomplete_metas(typename=schemas.FilterType.utm_source)),
    # IOS
    schemas.FilterType.user_os_ios: SupportedFilter(
        get=autocomplete.__generic_autocomplete_metas(typename=schemas.FilterType.user_os_ios),
        query=autocomplete.__generic_autocomplete_metas(typename=schemas.FilterType.user_os_ios)),
    schemas.FilterType.user_device_ios: SupportedFilter(
        get=autocomplete.__generic_autocomplete_metas(
            typename=schemas.FilterType.user_device_ios),
        query=autocomplete.__generic_autocomplete_metas(typename=schemas.FilterType.user_device_ios)),
    schemas.FilterType.user_country_ios: SupportedFilter(
        get=autocomplete.__generic_autocomplete_metas(typename=schemas.FilterType.user_country_ios),
        query=autocomplete.__generic_autocomplete_metas(typename=schemas.FilterType.user_country_ios)),
    schemas.FilterType.user_id_ios: SupportedFilter(
        get=autocomplete.__generic_autocomplete_metas(typename=schemas.FilterType.user_id_ios),
        query=autocomplete.__generic_autocomplete_metas(typename=schemas.FilterType.user_id_ios)),
    schemas.FilterType.user_anonymous_id_ios: SupportedFilter(
        get=autocomplete.__generic_autocomplete_metas(typename=schemas.FilterType.user_anonymous_id_ios),
        query=autocomplete.__generic_autocomplete_metas(typename=schemas.FilterType.user_anonymous_id_ios)),
    schemas.FilterType.rev_id_ios: SupportedFilter(
        get=autocomplete.__generic_autocomplete_metas(typename=schemas.FilterType.rev_id_ios),
        query=autocomplete.__generic_autocomplete_metas(typename=schemas.FilterType.rev_id_ios)),

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
