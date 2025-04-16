# note(jon): please see https://datatracker.ietf.org/doc/html/rfc7643 for details on these constants

RESOURCE_TYPES = sorted(
    [
        {
            "schemas": ["urn:ietf:params:scim:schemas:core:2.0:ResourceType"],
            "id": "User",
            "name": "User",
            "endpoint": "/Users",
            "description": "User account",
            "schema": "urn:ietf:params:scim:schemas:core:2.0:User",
        }
    ],
    key=lambda x: x["id"],
)

SCHEMAS = sorted(
    # todo(jon): add the user schema
    [
        # todo(jon): update the ResourceType schema to have the correct values
        {
            "id": "urn:ietf:params:scim:schemas:core:2.0:ResourceType",
            "name": "ResourceType",
            "description": "Represents the configuration of a SCIM resource type.",
            "attributes": [
                {
                    "name": "id",
                    "type": "string",
                    "multiValued": False,
                    "description": "The resource type's unique identifier.",
                    "required": True,
                    "caseExact": False,
                    "mutability": "readOnly",
                    "returned": "always",
                    "uniqueness": "global"
                },
                {
                    "name": "name",
                    "type": "string",
                    "multiValued": False,
                    "description": "The resource type's human‐readable name.",
                    "required": True,
                    "caseExact": False,
                    "mutability": "readOnly",
                    "returned": "always",
                    "uniqueness": "none"
                },
                {
                    "name": "description",
                    "type": "string",
                    "multiValued": False,
                    "description": "A brief description of the resource type.",
                    "required": False,
                    "caseExact": False,
                    "mutability": "readOnly",
                    "returned": "default",
                    "uniqueness": "none"
                },
                {
                    "name": "endpoint",
                    "type": "string",
                    "multiValued": False,
                    "description": "The HTTP endpoint where the resource type is exposed.",
                    "required": True,
                    "caseExact": False,
                    "mutability": "readOnly",
                    "returned": "always",
                    "uniqueness": "none"
                },
                {
                    "name": "schema",
                    "type": "string",
                    "multiValued": False,
                    "description": "The primary schema URN for the resource type.",
                    "required": True,
                    "caseExact": False,
                    "mutability": "readOnly",
                    "returned": "always",
                    "uniqueness": "none"
                },
                {
                    "name": "schemaExtensions",
                    "type": "complex",
                    "multiValued": True,
                    "description": "A list of schema extensions for the resource type.",
                    "required": False,
                    "mutability": "readOnly",
                    "returned": "default",
                    "uniqueness": "none",
                    "subAttributes": [
                        {
                            "name": "schema",
                            "type": "string",
                            "multiValued": False,
                            "description": "The URN of the extension schema.",
                            "required": True,
                            "caseExact": False,
                            "mutability": "readOnly",
                            "returned": "always",
                            "uniqueness": "none"
                        },
                        {
                            "name": "required",
                            "type": "boolean",
                            "multiValued": False,
                            "description": "A Boolean value indicating whether the extension is required.",
                            "required": True,
                            "mutability": "readOnly",
                            "returned": "always",
                            "uniqueness": "none"
                        }
                    ]
                }
            ]
        },
        # todo(jon): update the Schema schema to have the correct values
        {
            "id": "urn:ietf:params:scim:schemas:core:2.0:Schema",
            "name": "Schema",
            "description": "Defines the attributes and metadata for a SCIM resource.",
            "attributes": [
                {
                    "name": "id",
                    "type": "string",
                    "multiValued": False,
                    "description": "The unique identifier of the schema.",
                    "required": True,
                    "caseExact": False,
                    "mutability": "readOnly",
                    "returned": "always",
                    "uniqueness": "global"
                },
                {
                    "name": "name",
                    "type": "string",
                    "multiValued": False,
                    "description": "The human‐readable name of the schema.",
                    "required": True,
                    "caseExact": False,
                    "mutability": "readOnly",
                    "returned": "always",
                    "uniqueness": "none"
                },
                {
                    "name": "description",
                    "type": "string",
                    "multiValued": False,
                    "description": "A description of the schema.",
                    "required": False,
                    "caseExact": False,
                    "mutability": "readOnly",
                    "returned": "default",
                    "uniqueness": "none"
                },
                {
                    "name": "attributes",
                    "type": "complex",
                    "multiValued": True,
                    "description": "The list of attributes defined by the schema.",
                    "required": True,
                    "mutability": "readOnly",
                    "returned": "default",
                    "uniqueness": "none",
                    "subAttributes": [
                        {
                            "name": "name",
                            "type": "string",
                            "multiValued": False,
                            "description": "Attribute name.",
                            "required": True,
                            "caseExact": False,
                            "mutability": "readOnly",
                            "returned": "always",
                            "uniqueness": "none"
                        },
                        {
                            "name": "type",
                            "type": "string",
                            "multiValued": False,
                            "description": "Data type of the attribute.",
                            "required": True,
                            "caseExact": False,
                            "mutability": "readOnly",
                            "returned": "always",
                            "uniqueness": "none"
                        },
                        {
                            "name": "multiValued",
                            "type": "boolean",
                            "multiValued": False,
                            "description": "A Boolean value that indicates whether the attribute is multi-valued.",
                            "required": True,
                            "mutability": "readOnly",
                            "returned": "always",
                            "uniqueness": "none"
                        },
                        {
                            "name": "required",
                            "type": "boolean",
                            "multiValued": False,
                            "description": "A Boolean value that indicates whether the attribute is required.",
                            "required": True,
                            "mutability": "readOnly",
                            "returned": "always",
                            "uniqueness": "none"
                        },
                        {
                            "name": "caseExact",
                            "type": "boolean",
                            "multiValued": False,
                            "description": "A Boolean value that indicates whether string comparisons are case sensitive.",
                            "required": False,
                            "mutability": "readOnly",
                            "returned": "always",
                            "uniqueness": "none"
                        },
                        {
                            "name": "mutability",
                            "type": "string",
                            "multiValued": False,
                            "description": "Defines whether the attribute is readOnly, readWrite, immutable, or writeOnly.",
                            "required": True,
                            "caseExact": False,
                            "mutability": "readOnly",
                            "returned": "always",
                            "uniqueness": "none"
                        },
                        {
                            "name": "returned",
                            "type": "string",
                            "multiValued": False,
                            "description": "Specifies when the attribute is returned in a response.",
                            "required": True,
                            "caseExact": False,
                            "mutability": "readOnly",
                            "returned": "always",
                            "uniqueness": "none"
                        },
                        {
                            "name": "uniqueness",
                            "type": "string",
                            "multiValued": False,
                            "description": "Indicates whether the attribute must be unique.",
                            "required": True,
                            "caseExact": False,
                            "mutability": "readOnly",
                            "returned": "always",
                            "uniqueness": "none"
                        }
                    ]
                }
            ]
        },
        {
            "id": "urn:ietf:params:scim:schemas:core:2.0:ServiceProviderConfig",
            "name": "Service Provider Configuration",
            "description": "Schema for representing the service provider's configuration.",
            "attributes": [
                {
                    "name": "documentationUri",
                    "type": "reference",
                    "referenceTypes": ["external"],
                    "multiValued": False,
                    "description": "An HTTP-addressable URL pointing to the service provider's human consumable help documentation.",
                    "required": False,
                    "caseExact": False,
                    "mutability": "readOnly",
                    "returned": "default",
                    "uniqueness": "none",
                },
                {
                    "name": "patch",
                    "type": "complex",
                    "multiValued": False,
                    "description": "A complex type that specifies PATCH configuration options.",
                    "required": True,
                    "returned": "default",
                    "mutability": "readOnly",
                    "subAttributes": [
                        {
                            "name": "supported",
                            "type": "boolean",
                            "multiValued": False,
                            "description": "A Boolean value specifying whether or not the operation is supported.",
                            "required": True,
                            "mutability": "readOnly",
                            "returned": "default",
                        }
                    ]
                },
                {
                    "name": "bulk",
                    "type": "complex",
                    "multiValued": False,
                    "description": "A complex type that specifies bulk configuration options.",
                    "required": True,
                    "returned": "default",
                    "mutability": "readOnly",
                    "subAttributes": [
                        {
                            "name": "supported",
                            "type": "boolean",
                            "multiValued": False,
                            "description": "A Boolean value specifying whether or not the operation is supported.",
                            "required": True,
                            "mutability": "readOnly",
                            "returned": "default",
                        },
                        {
                            "name": "maxOperations",
                            "type": "integer",
                            "multiValued": False,
                            "description": "An integer value specifying the maximum number of operations.",
                            "required": True,
                            "mutability": "readOnly",
                            "returned": "default",
                            "uniqueness": "none",
                        },
                        {
                            "name": "maxPayloadSize",
                            "type": "integer",
                            "multiValued": False,
                            "description": "An integer value specifying the maximum payload size in bytes.",
                            "required": True,
                            "mutability": "readOnly",
                            "returned": "default",
                            "uniqueness": "none",
                        }
                    ]
                },
                {
                    "name": "filter",
                    "type": "complex",
                    "multiValued": False,
                    "description": "A complex type that specifies FILTER options.",
                    "required": True,
                    "returned": "default",
                    "mutability": "readOnly",
                    "subAttributes": [
                        {
                            "name": "supported",
                            "type": "boolean",
                            "multiValued": False,
                            "description": "A Boolean value specifying whether or not the operation is supported.",
                            "required": True,
                            "mutability": "readOnly",
                            "returned": "default",
                        },
                        {
                            "name": "maxResults",
                            "type": "integer",
                            "multiValued": False,
                            "description": "The integer value specifying the maximum number of resources returned in a response.",
                            "required": True,
                            "mutability": "readOnly",
                            "returned": "default",
                            "uniqueness": "none",
                        }
                    ]
                },
                {
                    "name": "changePassword",
                    "type": "complex",
                    "multiValued": False,
                    "description": "A complex type that specifies configuration options related to changing a password.",
                    "required": True,
                    "returned": "default",
                    "mutability": "readOnly",
                    "subAttributes": [
                        {
                            "name": "supported",
                            "type": "boolean",
                            "multiValued": False,
                            "description": "A Boolean value specifying whether or not the operation is supported.",
                            "required": True,
                            "mutability": "readOnly",
                            "returned": "default",
                        }
                    ],
                },
                {
                    "name": "sort",
                    "type": "complex",
                    "multiValued": False,
                    "description": "A complex type that specifies sort result options.",
                    "required": True,
                    "returned": "default",
                    "mutability": "readOnly",
                    "subAttributes": [
                        {
                            "name": "supported",
                            "type": "boolean",
                            "multiValued": False,
                            "description": "A Boolean value specifying whether or not the operation is supported.",
                            "required": True,
                            "mutability": "readOnly",
                            "returned": "default",
                        }
                    ],
                },
                {
                    "name": "etag",
                    "type": "complex",
                    "multiValued": False,
                    "description": "A complex type that specifies ETag configuration options.",
                    "required": True,
                    "returned": "default",
                    "mutability": "readOnly",
                    "subAttributes": [
                        {
                            "name": "supported",
                            "type": "boolean",
                            "multiValued": False,
                            "description": "A Boolean value specifying whether or not the operation is supported.",
                            "required": True,
                            "mutability": "readOnly",
                            "returned": "default",
                        }
                    ],
                },
                {
                    "name": "authenticationSchemes",
                    "type": "complex",
                    "multiValued": True,
                    "description": "A complex type that specifies supported authentication scheme properties.",
                    "required": True,
                    "returned": "default",
                    "mutability": "readOnly",
                    "subAttributes": [
                        {
                            "name": "type",
                            "type": "string",
                            "multiValued": False,
                            "description": "The authentication scheme.  This specification defines the values 'oauth', 'oauth2', 'oauthbearertoken', 'httpbasic', and 'httpdigest'.",
                            "required": True,
                            "caseExact": False,
                            "mutability": "readOnly",
                            "returned": "default",
                            "uniqueness": "none",
                        },
                        {
                            "name": "name",
                            "type": "string",
                            "multiValued": False,
                            "description": "The common authentication scheme name, e.g., HTTP Basic.",
                            "required": True,
                            "caseExact": False,
                            "mutability": "readOnly",
                            "returned": "default",
                            "uniqueness": "none",
                        },
                        {
                            "name": "description",
                            "type": "string",
                            "multiValued": False,
                            "description": "A description of the authentication scheme.",
                            "required": True,
                            "caseExact": False,
                            "mutability": "readOnly",
                            "returned": "default",
                            "uniqueness": "none",
                        },
                        {
                            "name": "specUri",
                            "type": "reference",
                            "referenceTypes": ["external"],
                            "multiValued": False,
                            "description": "An HTTP-addressable URL pointing to the authentication scheme's specification.",
                            "required": False,
                            "caseExact": False,
                            "mutability": "readOnly",
                            "returned": "default",
                            "uniqueness": "none",
                        },
                        {
                            "name": "documentationUri",
                            "type": "reference",
                            "referenceTypes": ["external"],
                            "multiValued": False,
                            "description": "An HTTP-addressable URL pointing to the authentication scheme's usage documentation.",
                            "required": False,
                            "caseExact": False,
                            "mutability": "readOnly",
                            "returned": "default",
                            "uniqueness": "none",
                        },
                        {
                            "name": "primary",
                            "type": "boolean",
                            "multiValued": False,
                            "description": "A Boolean value specifying whether or not the attribute is the preferred attribute value.",
                            "required": True,
                            "mutability": "readOnly",
                            "returned": "default",
                        }
                    ]
                },
                {
                    "name": "meta",
                    "type": "complex",
                    "multiValued": True,
                    "description": "A complex type that specifies resource metadata.",
                    "required": True,
                    "returned": "default",
                    "mutability": "readOnly",
                    "subAttributes": [
                        {
                            "name": "resourceType",
                            "type": "string",
                            "multiValued": False,
                            "description": "The name of the resource type of the resource.",
                            "required": True,
                            "caseExact": True,
                            "mutability": "readOnly",
                            "returned": "default",
                        },
                        {
                            "name": "created",
                            "type": "datetime",
                            "multiValued": False,
                            "description": " The 'DateTime' that the resource was added to the service provider.",
                            "required": True,
                            "mutability": "readOnly",
                            "returned": "default",
                        },
                        {
                            "name": "lastModified",
                            "type": "datetime",
                            "multiValued": False,
                            "description": "The most recent DateTime that the details of this resource were updated at the service provider.",
                            "required": True,
                            "mutability": "readOnly",
                            "returned": "default",
                        },
                        {
                            "name": "location",
                            "type": "reference",
                            "referenceTypes": ["ServiceProviderConfig"],
                            "multiValued": False,
                            "description": "The URI of the resource being returned.",
                            "required": True,
                            "mutability": "readOnly",
                            "returned": "default",
                        },
                    ]
                },                
            ]
        },
    ],
    key=lambda x: x["id"],
)

SERVICE_PROVIDER_CONFIG = {
    "schemas": ["urn:ietf:params:scim:schemas:core:2.0:ServiceProviderConfig"],
    "patch": {
        # todo(jon): this needs to be updated to True once we properly implement patching for users and groups
        "supported": False,
    },
    "bulk": {
        "supported": False,
        "maxOperations": 0,
        "maxPayloadSize": 0,
    },
    "filter": {
        # todo(jon): this needs to be updated to True once we properly implement filtering for users and groups
        "supported": False,
        "maxResults": 0,
    },
    "changePassword": {
        "supported": False,
    },
    "sort": {
        "supported": False,
    },
    "etag": {
        "supported": False,
    },
    "authenticationSchemes": [
        {
            "type": "oauthbearertoken",
            "name": "OAuth Bearer Token",
            "description": "Authentication scheme using the OAuth Bearer Token Standard. The access token should be sent in the 'Authorization' header using the Bearer schema.",
            "specUri": "https://tools.ietf.org/html/rfc6750",
            # todo(jon): see if we have our own documentation for this
            # "documentationUri": "", # optional
            "primary": True,
        },
    ],
    "meta": {
        "resourceType": "ServiceProviderConfig",
        "created": "2025-04-15T15:45",
        # note(jon): we might want to think about adding this resource as part of our db
        # and then updating these timestamps from an api and such. for now, if we update
        # the configuration, we should update the timestamp here.
        "lastModified": "2025-04-15T15:45",
        "location": "", # note(jon): this field will be computed in the /ServiceProviderConfig endpoint
    },
}
