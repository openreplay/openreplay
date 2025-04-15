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
            "name": "ServiceProviderConfig",
            "description": "Defines the configuration options for the SCIM service provider.",
            "attributes": [
                {
                    "name": "documentationUri",
                    "type": "string",
                    "multiValued": False,
                    "description": "The base or canonical URL of the service provider's documentation.",
                    "required": False,
                    "caseExact": False,
                    "mutability": "readWrite",
                    "returned": "default",
                    "uniqueness": "none"
                },
                {
                    "name": "patch",
                    "type": "complex",
                    "multiValued": False,
                    "description": "A complex attribute indicating the service provider's support for PATCH requests.",
                    "required": False,
                    "mutability": "readOnly",
                    "returned": "default",
                    "uniqueness": "none",
                    "subAttributes": [
                        {
                            "name": "supported",
                            "type": "boolean",
                            "multiValued": False,
                            "description": "A Boolean value that indicates whether PATCH is supported.",
                            "required": False,
                            "mutability": "readOnly",
                            "returned": "default",
                            "uniqueness": "none"
                        }
                    ]
                },
                {
                    "name": "bulk",
                    "type": "complex",
                    "multiValued": False,
                    "description": "A complex attribute that indicates the service provider's support for bulk operations.",
                    "required": False,
                    "mutability": "readOnly",
                    "returned": "default",
                    "uniqueness": "none",
                    "subAttributes": [
                        {
                            "name": "supported",
                            "type": "boolean",
                            "multiValued": False,
                            "description": "A Boolean value that indicates whether bulk operations are supported.",
                            "required": False,
                            "mutability": "readOnly",
                            "returned": "default",
                            "uniqueness": "none"
                        },
                        {
                            "name": "maxOperations",
                            "type": "integer",
                            "multiValued": False,
                            "description": "The maximum number of operations that can be performed in a bulk request.",
                            "required": False,
                            "mutability": "readOnly",
                            "returned": "default",
                            "uniqueness": "none"
                        },
                        {
                            "name": "maxPayloadSize",
                            "type": "integer",
                            "multiValued": False,
                            "description": "The maximum payload size in bytes for a bulk request.",
                            "required": False,
                            "mutability": "readOnly",
                            "returned": "default",
                            "uniqueness": "none"
                        }
                    ]
                },
                {
                    "name": "filter",
                    "type": "complex",
                    "multiValued": False,
                    "description": "A complex attribute that indicates the service provider's support for filtering.",
                    "required": False,
                    "mutability": "readOnly",
                    "returned": "default",
                    "uniqueness": "none",
                    "subAttributes": [
                        {
                            "name": "supported",
                            "type": "boolean",
                            "multiValued": False,
                            "description": "A Boolean value that indicates whether filtering is supported.",
                            "required": False,
                            "mutability": "readOnly",
                            "returned": "default",
                            "uniqueness": "none"
                        },
                        {
                            "name": "maxResults",
                            "type": "integer",
                            "multiValued": False,
                            "description": "The maximum number of resources returned in a search response.",
                            "required": False,
                            "mutability": "readOnly",
                            "returned": "default",
                            "uniqueness": "none"
                        }
                    ]
                },
                {
                    "name": "changePassword",
                    "type": "complex",
                    "multiValued": False,
                    "description": "A complex attribute that indicates the service provider's support for change password requests.",
                    "required": False,
                    "mutability": "readOnly",
                    "returned": "default",
                    "uniqueness": "none",
                    "subAttributes": [
                        {
                            "name": "supported",
                            "type": "boolean",
                            "multiValued": False,
                            "description": "A Boolean value that indicates whether the change password operation is supported.",
                            "required": False,
                            "mutability": "readOnly",
                            "returned": "default",
                            "uniqueness": "none"
                        }
                    ]
                },
                {
                    "name": "sort",
                    "type": "complex",
                    "multiValued": False,
                    "description": "A complex attribute that indicates the service provider's support for sorting.",
                    "required": False,
                    "mutability": "readOnly",
                    "returned": "default",
                    "uniqueness": "none",
                    "subAttributes": [
                        {
                            "name": "supported",
                            "type": "boolean",
                            "multiValued": False,
                            "description": "A Boolean value that indicates whether sorting is supported.",
                            "required": False,
                            "mutability": "readOnly",
                            "returned": "default",
                            "uniqueness": "none"
                        }
                    ]
                },
                {
                    "name": "etag",
                    "type": "complex",
                    "multiValued": False,
                    "description": "A complex attribute that indicates the service provider's support for ETag in responses.",
                    "required": False,
                    "mutability": "readOnly",
                    "returned": "default",
                    "uniqueness": "none",
                    "subAttributes": [
                        {
                            "name": "supported",
                            "type": "boolean",
                            "multiValued": False,
                            "description": "A Boolean value that indicates whether ETag is supported.",
                            "required": False,
                            "mutability": "readOnly",
                            "returned": "default",
                            "uniqueness": "none"
                        }
                    ]
                },
                {
                    "name": "authenticationSchemes",
                    "type": "complex",
                    "multiValued": True,
                    "description": "A multi-valued complex attribute that defines the authentication schemes supported by the service provider.",
                    "required": False,
                    "mutability": "readOnly",
                    "returned": "default",
                    "uniqueness": "none",
                    "subAttributes": [
                        {
                            "name": "type",
                            "type": "string",
                            "multiValued": False,
                            "description": "The type of the authentication scheme.",
                            "required": False,
                            "caseExact": False,
                            "mutability": "readOnly",
                            "returned": "default",
                            "uniqueness": "none"
                        },
                        {
                            "name": "name",
                            "type": "string",
                            "multiValued": False,
                            "description": "The common name of the authentication scheme.",
                            "required": False,
                            "caseExact": False,
                            "mutability": "readOnly",
                            "returned": "default",
                            "uniqueness": "none"
                        },
                        {
                            "name": "description",
                            "type": "string",
                            "multiValued": False,
                            "description": "A description of the authentication scheme.",
                            "required": False,
                            "caseExact": False,
                            "mutability": "readOnly",
                            "returned": "default",
                            "uniqueness": "none"
                        },
                        {
                            "name": "specUri",
                            "type": "string",
                            "multiValued": False,
                            "description": "A URI that points to the authentication scheme's specification.",
                            "required": False,
                            "caseExact": False,
                            "mutability": "readOnly",
                            "returned": "default",
                            "uniqueness": "none"
                        },
                        {
                            "name": "documentationUri",
                            "type": "string",
                            "multiValued": False,
                            "description": "A URI that points to the documentation for this scheme.",
                            "required": False,
                            "caseExact": False,
                            "mutability": "readOnly",
                            "returned": "default",
                            "uniqueness": "none"
                        }
                    ]
                }
            ]
        },
    ],
    key=lambda x: x["id"],
)
