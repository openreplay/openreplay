import schemas


def get_sessions_filters(project_id: int):
    return {"total": 13,
            "list": [
                {
                    "id": "sf_1",
                    "name": schemas.FilterType.REFERRER,
                    "displayName": "Referrer",
                    "possibleTypes": [
                        "String"
                    ],
                    "autoCaptured": True
                },
                {
                    "id": "sf_2",
                    "name": schemas.FilterType.DURATION,
                    "displayName": "Duration",
                    "possibleTypes": [
                        "int"
                    ],
                    "autoCaptured": True
                },
                {
                    "id": "sf_3",
                    "name": schemas.FilterType.UTM_SOURCE,
                    "displayName": "UTM Source",
                    "possibleTypes": [
                        "string"
                    ],
                    "autoCaptured": True
                },
                {
                    "id": "sf_4",
                    "name": schemas.FilterType.UTM_MEDIUM,
                    "displayName": "UTM Medium",
                    "possibleTypes": [
                        "string"
                    ],
                    "autoCaptured": True
                },
                {
                    "id": "sf_5",
                    "name": schemas.FilterType.UTM_CAMPAIGN,
                    "displayName": "UTM Campaign",
                    "possibleTypes": [
                        "string"
                    ],
                    "autoCaptured": True
                },
                {
                    "id": "sf_6",
                    "name": schemas.FilterType.USER_COUNTRY,
                    "displayName": "Country",
                    "possibleTypes": [
                        "string"
                    ],
                    "autoCaptured": True
                },
                {
                    "id": "sf_7",
                    "name": schemas.FilterType.USER_CITY,
                    "displayName": "City",
                    "possibleTypes": [
                        "string"
                    ],
                    "autoCaptured": True
                },
                {
                    "id": "sf_8",
                    "name": schemas.FilterType.USER_STATE,
                    "displayName": "State / Province",
                    "possibleTypes": [
                        "string"
                    ],
                    "autoCaptured": True
                },
                {
                    "id": "sf_9",
                    "name": schemas.FilterType.USER_OS,
                    "displayName": "OS",
                    "possibleTypes": [
                        "string"
                    ],
                    "autoCaptured": True
                },
                {
                    "id": "sf_10",
                    "name": schemas.FilterType.USER_BROWSER,
                    "displayName": "Browser",
                    "possibleTypes": [
                        "string"
                    ],
                    "autoCaptured": True
                },
                {
                    "id": "sf_11",
                    "name": schemas.FilterType.USER_DEVICE,
                    "displayName": "Device",
                    "possibleTypes": [
                        "string"
                    ],
                    "autoCaptured": True
                },
                {
                    "id": "sf_12",
                    "name": schemas.FilterType.PLATFORM,
                    "displayName": "Platform",
                    "possibleTypes": [
                        "string"
                    ],
                    "autoCaptured": True
                },
                {
                    "id": "sf_13",
                    "name": schemas.FilterType.REV_ID,
                    "displayName": "Version ID",
                    "possibleTypes": [
                        "string"
                    ],
                    "autoCaptured": True
                }
            ]}


def get_users_filters(project_id: int):
    return {"total": 2,
            "list": [
                {
                    "id": "uf_1",
                    "name": schemas.FilterType.USER_ID,
                    "displayName": "User ID",
                    "possibleTypes": [
                        "string"
                    ],
                    "autoCaptured": False
                },
                {
                    "id": "uf_2",
                    "name": schemas.FilterType.USER_ANONYMOUS_ID,
                    "displayName": "User Anonymous ID",
                    "possibleTypes": [
                        "string"
                    ],
                    "autoCaptured": False
                }
            ]}
