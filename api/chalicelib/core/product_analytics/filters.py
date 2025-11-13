import schemas

from chalicelib.core.issues import issues


def get_sessions_filters(project_id: int):
    return {
        "total": 13,
        "displayName": "Session Filters",
        "list": [
            {
                "id": "sf_1",
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
                "id": "sf_2",
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
                "id": "sf_3",
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
                "id": "sf_4",
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
                "id": "sf_5",
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
                "id": "sf_6",
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
                "id": "sf_7",
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
                "id": "sf_8",
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
                "id": "sf_9",
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
                "id": "sf_10",
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
                "id": "sf_11",
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
                "id": "sf_12",
                "name": schemas.FilterType.PLATFORM,
                "displayName": "Platform",
                "possibleTypes": ["string"],
                "dataType": "string",
                "autoCaptured": True,
                "isPredefined": True,
                "possibleValues": ["web", "ios", "android"],
                "isConditional": False
            },
            {
                "id": "sf_13",
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
                "id": "sf_14",
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
                "id": "sf_15",
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
                "id": "sf_16",
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
        "list": [
            {
                "id": "uf_1",
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
                "id": "uf_2",
                "name": schemas.FilterType.USER_ANONYMOUS_ID,
                "displayName": "User Anonymous ID",
                "possibleTypes": ["string"],
                "dataType": "string",
                "autoCaptured": True,
                "isPredefined": False,
                "possibleValues": [],
                "isConditional": True
            }
        ]}


def get_global_filters(project_id: int):
    r = get_sessions_filters(project_id)
    r = r["list"]
    for f in r:
        f["defaultProperty"] = False
        f["category"] = "session"
    return r
