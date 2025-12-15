import schemas

from chalicelib.core.issues import issues
from chalicelib.utils import helper


def get_sessions_filters(project_id: int):
    return {
        "total": 13,
        "displayName": "Session Filters",
        "scope": ["sessions", "events", "users"],
        "list": [
            {
                "id": helper.string_to_id(f'sf_{schemas.FilterType.REFERRER}'),
                "name": schemas.FilterType.REFERRER,
                "displayName": "Referrer",
                "possibleTypes": ["string"],
                "dataType": "string",
                "autoCaptured": True,
                "isPredefined": False,
                "possibleValues": [],
                "isConditional": False
            },
            {
                "id": helper.string_to_id(f'sf_{schemas.FilterType.DURATION}'),
                "name": schemas.FilterType.DURATION,
                "displayName": "Duration",
                "possibleTypes": ["int"],
                "dataType": "int",
                "autoCaptured": True,
                "isPredefined": False,
                "possibleValues": [],
                "isConditional": True
            },
            {
                "id": helper.string_to_id(f'sf_{schemas.FilterType.UTM_SOURCE}'),
                "name": schemas.FilterType.UTM_SOURCE,
                "displayName": "UTM Source",
                "possibleTypes": ["string"],
                "dataType": "string",
                "autoCaptured": True,
                "isPredefined": False,
                "possibleValues": [],
                "isConditional": False
            },
            {
                "id": helper.string_to_id(f'sf_{schemas.FilterType.UTM_MEDIUM}'),
                "name": schemas.FilterType.UTM_MEDIUM,
                "displayName": "UTM Medium",
                "possibleTypes": ["string"],
                "dataType": "string",
                "autoCaptured": True,
                "isPredefined": False,
                "possibleValues": [],
                "isConditional": False
            },
            {
                "id": helper.string_to_id(f'sf_{schemas.FilterType.UTM_CAMPAIGN}'),
                "name": schemas.FilterType.UTM_CAMPAIGN,
                "displayName": "UTM Campaign",
                "possibleTypes": ["string"],
                "dataType": "string",
                "autoCaptured": True,
                "isPredefined": False,
                "possibleValues": [],
                "isConditional": False
            },
            {
                "id": helper.string_to_id(f'sf_{schemas.FilterType.USER_COUNTRY}'),
                "name": schemas.FilterType.USER_COUNTRY,
                "displayName": "Country",
                "possibleTypes": ["string"],
                "dataType": "string",
                "autoCaptured": True,
                "isPredefined": True,
                "possibleValues": [
                    "AF", "AX", "AL", "DZ", "AS", "AD", "AO", "AI", "AQ", "AG", "AR", "AM",
                    "AW", "AU", "AT", "AZ", "BS", "BH", "BD", "BB", "BY", "BE", "BZ", "BJ",
                    "BM", "BT", "BO", "BQ", "BA", "BW", "BV", "BR", "IO", "BN", "BG", "BF",
                    "BI", "CV", "KH", "CM", "CA", "KY", "CF", "TD", "CL", "CN", "CX", "CC",
                    "CO", "KM", "CG", "CD", "CK", "CR", "CI", "HR", "CU", "CW", "CY", "CZ",
                    "DK", "DJ", "DM", "DO", "EC", "EG", "SV", "GQ", "ER", "EE", "SZ", "ET",
                    "FK", "FO", "FJ", "FI", "FR", "GF", "PF", "TF", "GA", "GM", "GE", "DE",
                    "GH", "GI", "GR", "GL", "GD", "GP", "GU", "GT", "GG", "GN", "GW", "GY",
                    "HT", "HM", "VA", "HN", "HK", "HU", "IS", "IN", "ID", "IR", "IQ", "IE",
                    "IM", "IL", "IT", "JM", "JP", "JE", "JO", "KZ", "KE", "KI", "KP", "KR",
                    "KW", "KG", "LA", "LV", "LB", "LS", "LR", "LY", "LI", "LT", "LU", "MO",
                    "MG", "MW", "MY", "MV", "ML", "MT", "MH", "MQ", "MR", "MU", "YT", "MX",
                    "FM", "MD", "MC", "MN", "ME", "MS", "MA", "MZ", "MM", "NA", "NR", "NP",
                    "NL", "NC", "NZ", "NI", "NE", "NG", "NU", "NF", "MK", "MP", "NO", "OM",
                    "PK", "PW", "PS", "PA", "PG", "PY", "PE", "PH", "PN", "PL", "PT", "PR",
                    "QA", "RE", "RO", "RU", "RW", "BL", "SH", "KN", "LC", "MF", "PM", "VC",
                    "WS", "SM", "ST", "SA", "SN", "RS", "SC", "SL", "SG", "SX", "SK", "SI",
                    "SB", "SO", "ZA", "GS", "SS", "ES", "LK", "SD", "SR", "SJ", "SE", "CH",
                    "SY", "TW", "TJ", "TZ", "TH", "TL", "TG", "TK", "TO", "TT", "TN", "TR",
                    "TM", "TC", "TV", "UG", "UA", "AE", "GB", "US", "UM", "UY", "UZ", "VU",
                    "VE", "VN", "VG", "VI", "WF", "EH", "YE", "ZM", "ZW"
                ],
                "isConditional": True
            },
            {
                "id": helper.string_to_id(f'sf_{schemas.FilterType.USER_CITY}'),
                "name": schemas.FilterType.USER_CITY,
                "displayName": "City",
                "possibleTypes": ["string"],
                "dataType": "string",
                "autoCaptured": True,
                "isPredefined": False,
                "possibleValues": [],
                "isConditional": False
            },
            {
                "id": helper.string_to_id(f'sf_{schemas.FilterType.USER_STATE}'),
                "name": schemas.FilterType.USER_STATE,
                "displayName": "State / Province",
                "possibleTypes": ["string"],
                "dataType": "string",
                "autoCaptured": True,
                "isPredefined": False,
                "possibleValues": [],
                "isConditional": False
            },
            {
                "id": helper.string_to_id(f'sf_{schemas.FilterType.USER_OS}'),
                "name": schemas.FilterType.USER_OS,
                "displayName": "OS",
                "possibleTypes": ["string"],
                "dataType": "string",
                "autoCaptured": True,
                "isPredefined": False,
                "possibleValues": [],
                "isConditional": True
            },
            {
                "id": helper.string_to_id(f'sf_{schemas.FilterType.USER_BROWSER}'),
                "name": schemas.FilterType.USER_BROWSER,
                "displayName": "Browser",
                "possibleTypes": ["string"],
                "dataType": "string",
                "autoCaptured": True,
                "isPredefined": False,
                "possibleValues": [],
                "isConditional": True
            },
            {
                "id": helper.string_to_id(f'sf_{schemas.FilterType.USER_DEVICE}'),
                "name": schemas.FilterType.USER_DEVICE,
                "displayName": "Device",
                "possibleTypes": ["string"],
                "dataType": "string",
                "autoCaptured": True,
                "isPredefined": False,
                "possibleValues": [],
                "isConditional": True
            },
            {
                "id": helper.string_to_id(f'sf_{schemas.FilterType.PLATFORM}'),
                "name": schemas.FilterType.PLATFORM,
                "displayName": "Platform",
                "possibleTypes": ["string"],
                "dataType": "string",
                "autoCaptured": True,
                "isPredefined": True,
                "possibleValues": ["web", "mobile"],
                "isConditional": False
            },
            {
                "id": helper.string_to_id(f'sf_{schemas.FilterType.REV_ID}'),
                "name": schemas.FilterType.REV_ID,
                "displayName": "Version ID",
                "possibleTypes": ["string"],
                "dataType": "string",
                "autoCaptured": True,
                "isPredefined": False,
                "possibleValues": [],
                "isConditional": False
            },
            {
                "id": helper.string_to_id(f'sf_{schemas.FilterType.ISSUE}'),
                "name": schemas.FilterType.ISSUE,
                "displayName": "Issue",
                "possibleTypes": ["string"],
                "dataType": "string",
                "autoCaptured": True,
                "isPredefined": True,
                "possibleValues": [{"id": i["type"], "name": i["name"], "autoCaptured": i["autoCaptured"]}
                                   for i in issues.get_all_types()],
                "isConditional": False
            },
            {
                "id": helper.string_to_id(f'sf_screenHeight'),
                "name": "screenHeight",
                "displayName": "Screen Height",
                "possibleTypes": ["UInt16"],
                "dataType": "UInt16",
                "autoCaptured": True,
                "isPredefined": False,
                "possibleValues": [],
                "isConditional": False
            },
            {
                "id": helper.string_to_id(f'sf_screenWidth'),
                "name": "screenWidth",
                "displayName": "Screen Width",
                "possibleTypes": ["UInt16"],
                "dataType": "UInt16",
                "autoCaptured": True,
                "isPredefined": False,
                "possibleValues": [],
                "isConditional": False
            },
        ]
    }


def get_users_filters(project_id: int):
    return {
        "total": 2,
        "displayName": "User Filters",
        "scope": ["sessions"],
        "list": [
            {
                "id": helper.string_to_id(f'uf_{schemas.FilterType.USER_ID}'),
                "name": schemas.FilterType.USER_ID,
                "displayName": "User ID",
                "possibleTypes": ["string"],
                "dataType": "string",
                "autoCaptured": True,
                "isPredefined": False,
                "possibleValues": [],
                "isConditional": True
            },
            {
                "id": helper.string_to_id(f'uf_{schemas.FilterType.DISTINCT_ID}'),
                "name": schemas.FilterType.DISTINCT_ID,
                "displayName": "User Distinct ID",
                "possibleTypes": ["string"],
                "dataType": "string",
                "autoCaptured": True,
                "isPredefined": False,
                "possibleValues": [],
                "isConditional": True
            },
            # {
            #     "id": helper.string_to_id(f'uf_{schemas.FilterType.USER_ANONYMOUS_ID}'),
            #     "name": schemas.FilterType.USER_ANONYMOUS_ID,
            #     "displayName": "User Anonymous ID",
            #     "possibleTypes": ["string"],
            #     "dataType": "string",
            #     "autoCaptured": True,
            #     "isPredefined": False,
            #     "possibleValues": [],
            #     "isConditional": True
            # }
        ]}


def get_users_filters_identified(project_id: int):
    filters_config = [
        ("$user_id", "User ID", "string", False),
        ("$email", "Email", "string", False),
        ("$name", "Name", "string", False),
        ("$first_name", "First Name", "string", False),
        ("$last_name", "Last Name", "string", False),
        ("$phone", "Phone", "string", False),
        ("$avatar", "Avatar", "string", False),
        ("$sdk_edition", "SDK Edition", "string", False),
        ("$sdk_version", "SDK Version", "string", False),
        ("$current_url", "Current URL", "string", False),
        ("$current_path", "Current Path", "string", False),
        ("$initial_referrer", "Initial Referrer", "string", False),
        ("$referring_domain", "Referring Domain", "string", False),
        ("initial_utm_source", "Initial UTM Source", "string", False),
        ("initial_utm_medium", "Initial UTM Medium", "string", False),
        ("initial_utm_campaign", "Initial UTM Campaign", "string", False),
        ("$country", "Country", "string", False),
        ("$state", "State", "string", False),
        ("$city", "City", "string", False),
        ("$or_api_endpoint", "OR API Endpoint", "string", False),
        # ("$created_at", "Created At", "timestamp", False),
        # ("$first_event_at", "First Event At", "timestamp", False),
        # ("$last_seen", "Last Seen", "timestamp", False),
    ]
    
    filter_list = []
    for name, display_name, data_type, is_conditional in filters_config:
        filter_list.append({
            "id": helper.string_to_id(f'uif_{name}'),
            "name": name,
            "displayName": display_name,
            "possibleTypes": [data_type],
            "dataType": data_type,
            "autoCaptured": True,
            "isPredefined": False,
            "possibleValues": [],
            "isConditional": is_conditional
        })
    
    return {
        "total": len(filter_list),
        "displayName": "Identified User Filters",
        "scope": ["events", "users"],
        "list": filter_list
    }


def get_global_filters(project_id: int):
    r = get_sessions_filters(project_id)
    r = r["list"]
    for f in r:
        f["defaultProperty"] = False
        f["category"] = "session"
    return r
