# note(jon): please see https://datatracker.ietf.org/doc/html/rfc7643 for details on these constants
from typing import Any, Literal


def _attribute_characteristics(
        name: str,
        description: str,
        type: str="string",
        sub_attributes: dict[str, Any] | None=None,
        # note(jon): no default for multiValued is defined in the docs and it is marked as optional.
        # from our side, we'll default it to False.
        multi_valued: bool=False,
        required: bool=False,
        canonical_values: list[str] | None=None,
        case_exact: bool=False,
        mutability: str="readWrite",
        returned: str="default",
        uniqueness: str="none",
        reference_types: list[str] | None=None,
):
    characteristics = {
        "name": name,
        "type": type,
        "subAttributes": sub_attributes,
        "multiValued": multi_valued,
        "description": description,
        "required": required,
        "canonicalValues": canonical_values,
        "caseExact": case_exact,
        "mutability": mutability,
        "returned": returned,
        "uniqueness": uniqueness,
        "referenceTypes": reference_types,
    }
    characteristics_without_none = {
        key: value
        for key, value in characteristics.items()
        if value is not None
    }
    return characteristics_without_none


def _multi_valued_attributes(type_canonical_values: list[str], type_required: bool=False, type_mutability="readWrite"):
    return [
        _attribute_characteristics(
            name="type",
            description="A label indicating the attribute's function.",
            canonical_values=type_canonical_values,
            case_exact=True,
            required=type_required,
            mutability=type_mutability,
        ),
        _attribute_characteristics(
            name="primary",
            type="boolean",
            description="A Boolean value indicating the 'primary' or preferred attribute value for this attribute.",
        ),
        _attribute_characteristics(
            name="display",
            description="A human-readable name.",
            mutability="immutable",
        ),
        _attribute_characteristics(
            name="value",
            description="The attribute's significant value.",
        ),
        _attribute_characteristics(
            name="$ref",
            type="reference",
            reference_types=["uri"],
            description="The reference URI of a target resource."
        ),
    ]


# note(jon): the docs are a little confusing regarding this, but
# in section 3.1 of RFC7643, it is specified that ResourceType and
# ServiceProviderConfig are not included in the common attributes. but
# in other references, they treat them as a resource.
def _common_resource_attributes(id_required: bool=True, id_uniqueness: str="none"):
    return [
        _attribute_characteristics(
            name="id",
            description="A unique identifier for the SCIM resource.",
            case_exact=True,
            mutability="readOnly",
            returned="always",
            required=id_required,
            uniqueness=id_uniqueness,
        ),
        _attribute_characteristics(
            name="externalId",
            description="A String that is an identifier for the resource as defined by the provisioning client.",
            case_exact=True,
        ),
        _attribute_characteristics(
            name="schemas",
            type="reference",
            reference_types=["uri"],
            description="An array of Strings containing URI that are used to indicate the namespaces of the SCIM schemas that define the attributes present in the current JSON structure.",
            multi_valued=True,
            canonical_values=[
                "urn:ietf:params:scim:schemas:core:2.0:ServiceProviderConfig",
                "urn:ietf:params:scim:schemas:core:2.0:ResourceType",
                "urn:ietf:params:scim:schemas:core:2.0:Schema",
                "urn:ietf:params:scim:schemas:core:2.0:User",
            ],
            case_exact=True,
            mutability="readOnly",
            required=True,
            returned="always",
        ),
        _attribute_characteristics(
            name="meta",
            type="complex",
            description="A complex attribute containing resource metadata.",
            required=True,
            sub_attributes=[
                _attribute_characteristics(
                    name="resourceType",
                    description="The name of the resource type of the resource.",
                    mutability="readOnly",
                    case_exact=True,
                    required=True,
                ),
                _attribute_characteristics(
                    name="created",
                    type="dateTime",
                    description="The 'DateTime' that the resource was added to the service provider.",
                    mutability="readOnly",
                    required=True,
                ),
                _attribute_characteristics(
                    name="lastModified",
                    type="dateTime",
                    description="The most recent DateTime that the details of this resource were updated at the service provider.",
                    mutability="readOnly",
                    required=True,
                ),
                _attribute_characteristics(
                    name="location",
                    type="reference",
                    reference_types=["uri"],
                    description="The URI of the resource being returned.",
                    mutability="readOnly",
                    required=True,
                ),
                # todo(jon): decide if we'll handle versioning. for now, we won't do it.
            ],
        ),
    ]



SERVICE_PROVIDER_CONFIG_SCHEMA = {
    "schemas": ["urn:ietf:params:scim:schemas:core:2.0:Schema"],
    "id": "urn:ietf:params:scim:schemas:core:2.0:ServiceProviderConfig",
    "name": "Service Provider Configuration",
    "description": "Schema for representing the service provider's configuration.",
    "meta": {
        "resourceType": "Schema",
        "created": "2025-04-16T14:48:00Z",
        # note(jon): we might want to think about adding this resource as part of our db
        # and then updating these timestamps from an api and such. for now, if we update
        # the configuration, we should update the timestamp here.
        "lastModified": "2025-04-16T14:48:00Z",
        "location": "Schemas/urn:ietf:params:scim:schemas:core:2.0:ServiceProviderConfig",
    },
    "attributes": [
        *_common_resource_attributes(id_required=False),
        _attribute_characteristics(
            name="documentationUri",
            type="reference",
            reference_types=["external"],
            description="An HTTP-addressable URL pointing to the service provider's human-consumable help documentation.",
            mutability="readOnly",
        ),
        _attribute_characteristics(
            name="patch",
            type="complex",
            description="A complex type that specifies PATCH configuration options.",
            required=True,
            mutability="readOnly",
            sub_attributes=[
                _attribute_characteristics(
                    name="supported",
                    type="boolean",
                    description="A Boolean value specifying whether or not the operation is supported.",
                    required=True,
                    mutability="readOnly",
                ),
            ],
        ),
        _attribute_characteristics(
            name="bulk",
            type="complex",
            description="A complex type that specifies bulk configuration options.",
            required=True,
            mutability="readOnly",
            sub_attributes=[
                _attribute_characteristics(
                    name="supported",
                    type="boolean",
                    description="A Boolean value specifying whether or not the operation is supported.",
                    required=True,
                    mutability="readOnly",
                ),
                _attribute_characteristics(
                    name="maxOperations",
                    type="integer",
                    description="An integer value specifying the maximum number of operations.",
                    required=True,
                    mutability="readOnly",
                ),
                _attribute_characteristics(
                    name="maxPayloadSize",
                    type="integer",
                    description="An integer value specifying the maximum payload size in bytes.",
                    required=True,
                    mutability="readOnly",
                ),
            ],
        ),
        _attribute_characteristics(
            name="filter",
            type="complex",
            description="A complex type that specifies FILTER options.",
            required=True,
            mutability="readOnly",
            sub_attributes=[
                _attribute_characteristics(
                    name="supported",
                    type="boolean",
                    description="A Boolean value specifying whether or not the operation is supported.",
                    required=True,
                    mutability="readOnly",
                ),
                _attribute_characteristics(
                    name="maxResults",
                    type="integer",
                    description="The integer value specifying the maximum number of resources returned in a response.",
                    required=True,
                    mutability="readOnly",
                ),
            ],
        ),
        _attribute_characteristics(
            name="changePassword",
            type="complex",
            description="A complex type that specifies configuration options related to changing a password.",
            required=True,
            mutability="readOnly",
            sub_attributes=[
                _attribute_characteristics(
                    name="supported",
                    type="boolean",
                    description="A Boolean value specifying whether or not the operation is supported.",
                    required=True,
                    mutability="readOnly",
                ),
            ],
        ),
        _attribute_characteristics(
            name="sort",
            type="complex",
            description="A complex type that specifies sort result options.",
            required=True,
            mutability="readOnly",
            sub_attributes=[
                _attribute_characteristics(
                    name="supported",
                    type="boolean",
                    description="A Boolean value specifying whether or not the operation is supported.",
                    required=True,
                    mutability="readOnly",
                ),
            ],
        ),
        _attribute_characteristics(
            name="etag",
            type="complex",
            description="A complex type that specifies ETag configuration options.",
            required=True,
            mutability="readOnly",
            sub_attributes=[
                _attribute_characteristics(
                    name="supported",
                    type="boolean",
                    description="A Boolean value specifying whether or not the operation is supported.",
                    required=True,
                    mutability="readOnly",
                ),
            ],
        ),
        _attribute_characteristics(
            name="authenticationSchemes",
            type="complex",
            multi_valued=True,
            description="A complex type that specifies supported authentication scheme properties.",
            required=True,
            mutability="readOnly",
            sub_attributes=[
                *_multi_valued_attributes(
                    type_canonical_values=[
                        "oauth",
                        "oauth2",
                        "oauthbearertoken",
                        "httpbasic",
                        "httpdigest",
                    ],
                    type_required=True,
                    type_mutability="readOnly",
                ),
                _attribute_characteristics(
                    name="name",
                    description="The common authentication scheme name, e.g., HTTP Basic.",
                    required=True,
                    mutability="readOnly",
                ),
                _attribute_characteristics(
                    name="description",
                    description="A description of the authentication scheme.",
                    required=True,
                    mutability="readOnly",
                ),
                _attribute_characteristics(
                    name="specUri",
                    type="reference",
                    reference_types=["external"],
                    description="An HTTP-addressable URL pointing to the authentication scheme's specification.",
                    mutability="readOnly",
                ),
                _attribute_characteristics(
                    name="documentationUri",
                    type="reference",
                    reference_types=["external"],
                    description="An HTTP-addressable URL pointing to the authentication scheme's usage documentation.",
                    mutability="readOnly",
                ),
            ],
        ),
    ]
}


RESOURCE_TYPE_SCHEMA = {
    "schemas": ["urn:ietf:params:scim:schemas:core:2.0:Schema"],
    "id": "urn:ietf:params:scim:schemas:core:2.0:ResourceType",
    "name": "Resource Type",
    "description": "Specifies the schema that describes a SCIM resource type.",
    "meta": {
        "resourceType": "Schema",
        "created": "2025-04-16T14:48:00Z",
        # note(jon): we might want to think about adding this resource as part of our db
        # and then updating these timestamps from an api and such. for now, if we update
        # the configuration, we should update the timestamp here.
        "lastModified": "2025-04-16T14:48:00Z",
        "location": "Schemas/urn:ietf:params:scim:schemas:core:2.0:ResourceType",
    },
    "attributes": [
        *_common_resource_attributes(id_required=False, id_uniqueness="global"),
        _attribute_characteristics(
            name="name",
            description="The resource type name.",
            required=True,
            mutability="readOnly",
        ),
        _attribute_characteristics(
            name="description",
            description="The resource type's human-readable description.",
            mutability="readOnly",
        ),
        # todo(jon): figure out what the correct type/reference_type is here
        _attribute_characteristics(
            name="endpoint",
            type="reference",
            reference_types=["uri"],
            description="The resource type's HTTP-addressable endpoint relative to the Base URL of the service provider.",
            required=True,
            mutability="readOnly",
        ),
        _attribute_characteristics(
            name="schema",
            type="reference",
            reference_types=["uri"],
            description="The resource type's primary/base schema URI.",
            required=True,
            mutability="readOnly",
        ),
        _attribute_characteristics(
            name="schemaExtensions",
            type="complex",
            multi_valued=True,
            description="A list of URIs of the resource type's schema extensions.",
            mutability="readOnly",
            sub_attributes=[
                _attribute_characteristics(
                    name="schema",
                    type="reference",
                    reference_types=["uri"],
                    description="The URI of an extended schema.",
                    required=True,
                    mutability="readOnly",
                ),
                _attribute_characteristics(
                    name="required",
                    type="boolean",
                    description="A Boolean value that specifies whether or not the schema extension is required for the resource type.",
                    required=True,
                    mutability="readOnly",
                ),
            ]
        ),
    ]
}

SCHEMA_SCHEMA = {
    "schemas": ["urn:ietf:params:scim:schemas:core:2.0:Schema"],
    "id": "urn:ietf:params:scim:schemas:core:2.0:Schema",
    "name": "Schema",
    "description": "Specifies the schema that describes a SCIM schema.",
    "meta": {
        "resourceType": "Schema",
        "created": "2025-04-16T14:48:00Z",
        # note(jon): we might want to think about adding this resource as part of our db
        # and then updating these timestamps from an api and such. for now, if we update
        # the configuration, we should update the timestamp here.
        "lastModified": "2025-04-16T14:48:00Z",
        "location": "Schemas/urn:ietf:params:scim:schemas:core:2.0:Schema",
    },
    "attributes": [
        *_common_resource_attributes(id_uniqueness="global"),
        _attribute_characteristics(
            name="name",
            description="The schema's human‐readable name.",
            mutability="readOnly",
        ),
        _attribute_characteristics(
            name="description",
            description="The schema's human-readable name.",
            mutability="readOnly",
        ),
        _attribute_characteristics(
            name="attributes",
            type="complex",
            multi_valued=True,
            description="A complex attribute that defines service provider attributes and their qualities.",
            required=True,
            mutability="readOnly",
            sub_attributes=[
                _attribute_characteristics(
                    name="name",
                    description="The attribute's name.",
                    required=True,
                    mutability="readOnly",
                ),
                _attribute_characteristics(
                    name="type",
                    description="The attribute's data type.",
                    required=True,
                    canonical_values=[
                        "string",
                        "complex",
                        "boolean",
                        "decimal",
                        "integer",
                        "dateTime",
                        "reference",
                    ],
                    case_exact=True,
                    mutability="readOnly",
                ),
                _attribute_characteristics(
                    name="multiValued",
                    type="boolean",
                    description="A Boolean value indicating an attribute's plurality.",
                    required=True,
                    mutability="readOnly",
                ),
                _attribute_characteristics(
                    name="description",
                    description="The attribute's human-readable description.",
                    required=True,
                    mutability="readOnly",
                ),
                _attribute_characteristics(
                    name="required",
                    type="boolean",
                    description="A Boolean value indicating whether or not the attribute is required.",
                    required=True,
                    mutability="readOnly",
                ),
                _attribute_characteristics(
                    name="canonicalValues",
                    multi_valued=True,
                    description="A collection of canonical values.",
                    mutability="readOnly",
                ),
                _attribute_characteristics(
                    name="caseExact",
                    type="boolean",
                    description="A Boolean that specifies whether or not a string attribute is case sensitive.",
                    mutability="readOnly",
                ),
                _attribute_characteristics(
                    name="mutability",
                    description="A single keyword indicating the circumstances under which the value of the attribute can be (re)defined.",
                    required=True,
                    mutability="readOnly",
                    canonical_values=[
                        "readOnly",
                        "readWrite",
                        "immutable",
                        "writeOnly",
                    ],
                    case_exact=True,
                ),
                _attribute_characteristics(
                    name="returned",
                    description="A single keyword that indicates when an attribute and associated values are returned in response to a GET request or in response to a PUT, POST, or PATCH request.",
                    required=True,
                    mutability="readOnly",
                    canonical_values=[
                        "always",
                        "never",
                        "default",
                        "request",
                    ],
                    case_exact=True,
                ),
                _attribute_characteristics(
                    name="uniqueness",
                    description="A single keyword value that specifies how the service provider enforces uniqueness of attribute values.",
                    required=True,
                    mutability="readOnly",
                    canonical_values=[
                        "none",
                        "server",
                        "global",
                    ],
                    case_exact=True,
                ),
                _attribute_characteristics(
                    name="referenceTypes",
                    multi_valued=True,
                    description="A multi-valued array of JSON strings that indicate the SCIM resource types that may be referenced.",
                    mutability="readOnly",
                    canonical_values=[
                        # todo(jon): add "User" and "Group" once those are done.
                        "external",
                        "uri"
                    ],
                    case_exact=True,
                ),
                _attribute_characteristics(
                    name="subAttributes",
                    type="complex",
                    multi_valued=True,
                    description="When an attribute is of type 'complex', this defines a set of sub-attributes.",
                    mutability="readOnly",
                    sub_attributes=[
                        _attribute_characteristics(
                            name="name",
                            description="The attribute's name.",
                            required=True,
                            mutability="readOnly",
                        ),
                        _attribute_characteristics(
                            name="type",
                            description="The attribute's data type.",
                            required=True,
                            canonical_values=[
                                "string",
                                "complex",
                                "boolean",
                                "decimal",
                                "integer",
                                "dateTime",
                                "reference",
                            ],
                            case_exact=True,
                            mutability="readOnly",
                        ),
                        _attribute_characteristics(
                            name="multiValued",
                            type="boolean",
                            description="A Boolean value indicating an attribute's plurality.",
                            required=True,
                            mutability="readOnly",
                        ),
                        _attribute_characteristics(
                            name="description",
                            description="The attribute's human-readable description.",
                            required=True,
                            mutability="readOnly",
                        ),
                        _attribute_characteristics(
                            name="required",
                            type="boolean",
                            description="A Boolean value indicating whether or not the attribute is required.",
                            required=True,
                            mutability="readOnly",
                        ),
                        _attribute_characteristics(
                            name="canonicalValues",
                            multi_valued=True,
                            description="A collection of canonical values.",
                            mutability="readOnly",
                        ),
                        _attribute_characteristics(
                            name="caseExact",
                            type="boolean",
                            description="A Boolean that specifies whether or not a string attribute is case sensitive.",
                            mutability="readOnly",
                        ),
                        _attribute_characteristics(
                            name="mutability",
                            description="A single keyword indicating the circumstances under which the value of the attribute can be (re)defined.",
                            required=True,
                            mutability="readOnly",
                            canonical_values=[
                                "readOnly",
                                "readWrite",
                                "immutable",
                                "writeOnly",
                            ],
                            case_exact=True,
                        ),
                        _attribute_characteristics(
                            name="returned",
                            description="A single keyword that indicates when an attribute and associated values are returned in response to a GET request or in response to a PUT, POST, or PATCH request.",
                            required=True,
                            mutability="readOnly",
                            canonical_values=[
                                "always",
                                "never",
                                "default",
                                "request",
                            ],
                            case_exact=True,
                        ),
                        _attribute_characteristics(
                            name="uniqueness",
                            description="A single keyword value that specifies how the service provider enforces uniqueness of attribute values.",
                            required=True,
                            mutability="readOnly",
                            canonical_values=[
                                "none",
                                "server",
                                "global",
                            ],
                            case_exact=True,
                        ),
                        _attribute_characteristics(
                            name="referenceTypes",
                            multi_valued=True,
                            description="A multi-valued array of JSON strings that indicate the SCIM resource types that may be referenced.",
                            mutability="readOnly",
                            canonical_values=[
                                # todo(jon): add "User" and "Group" once those are done.
                                "external",
                                "uri"
                            ],
                            case_exact=True,
                        ),
                    ],
                ),
            ]
        )
    ]
}


USER_SCHEMA = {
    "schemas": ["urn:ietf:params:scim:schemas:core:2.0:Schema"],
    "id": "urn:ietf:params:scim:schemas:core:2.0:User",
    "name": "User",
    "description": "User account.",
    "meta": {
        "resourceType": "Schema",
        "created": "2025-04-16T14:48:00Z",
        # note(jon): we might want to think about adding this resource as part of our db
        # and then updating these timestamps from an api and such. for now, if we update
        # the configuration, we should update the timestamp here.
        "lastModified": "2025-04-16T14:48:00Z",
        "location": "Schemas/urn:ietf:params:scim:schemas:core:2.0:User",
    },
    "attributes": [
        *_common_resource_attributes(),
        _attribute_characteristics(
            name="userName",
            description="A service provider's unique identifier for the user.",
            required=True,
        ),
    ],
}



SCHEMAS = sorted(
    [
        SERVICE_PROVIDER_CONFIG_SCHEMA,
        RESOURCE_TYPE_SCHEMA,
        SCHEMA_SCHEMA,
        USER_SCHEMA,
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
        "created": "2025-04-15T15:45:00Z",
        # note(jon): we might want to think about adding this resource as part of our db
        # and then updating these timestamps from an api and such. for now, if we update
        # the configuration, we should update the timestamp here.
        "lastModified": "2025-04-15T15:45:00Z",
        "location": "", # note(jon): this field will be computed in the /ServiceProviderConfig endpoint
    },
}

RESOURCE_TYPES = sorted(
    [
        {
            "schemas": ["urn:ietf:params:scim:schemas:core:2.0:ResourceType"],
            "id": "User",
            "name": "User",
            "endpoint": "/Users",
            "description": "User account",
            "schema": "urn:ietf:params:scim:schemas:core:2.0:User",
            "meta": {
                "resourceType": "ResourceType",
                "created": "2025-04-16T08:37:00Z",
                # note(jon): we might want to think about adding this resource as part of our db
                # and then updating these timestamps from an api and such. for now, if we update
                # the configuration, we should update the timestamp here.
                "lastModified": "2025-04-16T08:37:00Z",
                "location": "ResourceType/User",
            },
        }
    ],
    key=lambda x: x["id"],
)
