import logging
from contextvars import ContextVar
from typing import Any, cast

from scim2_models import (
    Context,
    NotFoundException,
    NotImplementedException,
    Resource,
    ResourceType,
    ResponseParameters,
    ScimFilter,
    ScimProvider,
    SearchRequest,
    UniquenessException,
)
from scim2_server.storage import ScimStorage, SearchPage
from scim2_server.utils import parametrize

from routers.scim import groups
from routers.scim.postgres_resource import PostgresResource

logger = logging.getLogger(__name__)

# The tenant of the request being served. The WSGI application sets it once the
# bearer token is verified, so the storage can scope every query to it.
CURRENT_TENANT_ID: ContextVar[int | None] = ContextVar("scim_tenant_id", default=None)


def current_tenant_id() -> int:
    tenant_id = CURRENT_TENANT_ID.get()
    if tenant_id is None:
        raise RuntimeError("SCIM storage called outside of an authenticated request")
    return tenant_id


class PostgresStorage(ScimStorage):
    """A :class:`ScimStorage` serving the OpenReplay users and roles of the current tenant.

    The SQL of each resource type lives in a :class:`PostgresResource`. This
    class maps the SCIM protocol steps onto them, converts the returned dicts
    into the models of the provider, and applies filtering, sorting and paging
    in memory, as the previous scim2-server backend did.
    """

    def __init__(self, provider: ScimProvider):
        self.provider = provider
        self._postgres_resources: dict[str, PostgresResource] = {}

    def register_postgres_resource(
            self, resource_type_id: str, postgres_resource: PostgresResource
    ):
        self._postgres_resources[resource_type_id] = postgres_resource

    # -- helpers --------------------------------------------------------

    def _postgres_resource(self, resource_type: ResourceType) -> PostgresResource:
        try:
            return self._postgres_resources[cast(str, resource_type.id)]
        except KeyError:
            raise NotImplementedException(
                detail=f"Resource type {resource_type.id!r} has no storage"
            )

    def get_model(self, resource_type: ResourceType) -> type[Resource[Any]]:
        return cast(type[Resource[Any]], self.provider.model_for(resource_type))

    def _to_model(
            self,
            resource_type: ResourceType,
            data: dict | None,
            scim_ctx: Context | None = Context.DEFAULT,
    ) -> Resource[Any] | None:
        if data is None:
            return None
        return self.get_model(resource_type).model_validate(data, scim_ctx=scim_ctx)

    def _filter_for(
            self, resource_type: ResourceType, search_request: SearchRequest[Any]
    ) -> ScimFilter[Any] | None:
        """Return the filter of a search, bound to the model of a resource type.

        Group filters on ``displayName`` are rewritten so that the IdP group
        name is compared to the role name stored in OpenReplay.
        """
        if search_request.filter is None:
            return None
        expression = str(search_request.filter)
        if resource_type.id == "Group":
            expression = groups.group_display_name_to_role_name(expression)
        return parametrize(ScimFilter, self.get_model(resource_type))(expression)

    # -- ScimStorage ----------------------------------------------------

    def get(
            self,
            resource_type: ResourceType,
            resource_id: str,
            *,
            response_parameters: ResponseParameters[Any] | None = None,
    ) -> Resource[Any]:
        data = self._postgres_resource(resource_type).get_resource(
            resource_id, current_tenant_id()
        )
        resource = self._to_model(resource_type, data)
        if resource is None:
            raise NotFoundException(
                detail=f"{resource_type.name} {resource_id!r} not found"
            )
        return resource

    def search(
            self,
            resource_types: list[ResourceType],
            search_request: SearchRequest[Any],
            *,
            position: Any = None,
    ) -> SearchPage:
        if search_request.cursor is not None:
            raise NotImplementedException(detail="Cursor pagination is not supported")

        tenant_id = current_tenant_id()
        found: list[Resource[Any]] = []
        for resource_type in resource_types:
            scim_filter = self._filter_for(resource_type, search_request)
            model = self.get_model(resource_type)
            for data in self._postgres_resource(resource_type).query_resources(tenant_id):
                resource = model.model_validate(
                    data, scim_ctx=Context.RESOURCE_QUERY_RESPONSE
                )
                if scim_filter is None or scim_filter.match(resource):
                    found.append(resource)

        found = search_request.sort(found)
        start = search_request.start_index_0 or 0
        stop = None if search_request.count is None else start + search_request.count
        return SearchPage(len(found), found[start:stop])

    def create(
            self, resource_type: ResourceType, resource: Resource[Any]
    ) -> Resource[Any]:
        tenant_id = current_tenant_id()
        postgres_resource = self._postgres_resource(resource_type)
        existing = postgres_resource.search_existing(tenant_id, resource)
        if existing:
            if existing["active"]:
                raise UniquenessException()
            # The resource was soft-deleted: bring it back instead of creating a duplicate.
            resource.id = existing["id"]
            if postgres_resource.restore_resource is None:
                raise UniquenessException()
            data = postgres_resource.restore_resource(tenant_id, resource)
        else:
            data = postgres_resource.create_resource(tenant_id, resource)
        return cast(Resource[Any], self._to_model(resource_type, data))

    def update(
            self,
            resource_type: ResourceType,
            resource: Resource[Any],
            *,
            expected_version: str | None = None,
    ) -> Resource[Any]:
        tenant_id = current_tenant_id()
        postgres_resource = self._postgres_resource(resource_type)
        # The handler fetched the resource by id already, so it exists. What is
        # left to check is whether its unique value now clashes with another one.
        existing = postgres_resource.search_existing(tenant_id, resource)
        if existing and existing["id"] != resource.id:
            if existing["active"]:
                raise UniquenessException()
            # The unique value belongs to a soft-deleted resource: drop it first.
            # TODO: do not delete here
            postgres_resource.delete_resource(existing["id"], tenant_id)

        data = postgres_resource.update_resource(tenant_id, resource)
        updated = self._to_model(resource_type, data)
        if updated is None:
            raise NotFoundException(
                detail=f"{resource_type.name} {resource.id!r} not found"
            )
        return updated

    def delete(
            self,
            resource_type: ResourceType,
            resource_id: str,
            *,
            expected_version: str | None = None,
    ) -> None:
        # The handler already fetched the resource, so it exists for this tenant.
        self._postgres_resource(resource_type).delete_resource(
            resource_id, current_tenant_id()
        )
