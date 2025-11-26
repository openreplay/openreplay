import operator

from scim2_filter_parser import lexer
from scim2_filter_parser.parser import SCIMParser
from scim2_models import (
    SearchRequest,
    Resource,
    Context,
    Error,
)
from scim2_server import backend
from scim2_server.filter import evaluate_filter
from scim2_server.operators import ResolveSortOperator
from scim2_server.utils import SCIMException

from routers.scim import groups
from routers.scim.postgres_resource import PostgresResource


class PostgresBackend(backend.Backend):
    def __init__(self):
        super().__init__()
        self._postgres_resources = {}

    def register_postgres_resource(
            self, resource_type_id: str, postgres_resource: PostgresResource
    ):
        self._postgres_resources[resource_type_id] = postgres_resource

    def query_resources(
            self,
            search_request: SearchRequest,
            tenant_id: int,
            resource_type_id: str | None = None,
    ) -> tuple[int, list[Resource]]:
        """Query the backend for a set of resources.

        :param search_request: SearchRequest instance describing the
            query.
        :param resource_type_id: ID of the resource type to query. If
            None, all resource types are queried.
        :return: A tuple of "total results" and a List of found
            Resources. The List must contain a copy of resources.
            Mutating elements in the List must not modify the data
            stored in the backend.
        :raises SCIMException: If the backend only supports querying for
            one resource type at a time, setting resource_type_id to
            None the backend may raise a
            SCIMException(Error.make_too_many_error()).
        """
        start_index = (search_request.start_index or 1) - 1

        tree = None
        if search_request.filter is not None:
            if resource_type_id == "Group":
                search_request.filter = groups.group_display_name_to_role_name(search_request.filter)
            token_stream = lexer.SCIMLexer().tokenize(search_request.filter)
            tree = SCIMParser().parse(token_stream)

        # todo(jon): handle the case when resource_type_id is None.
        # we're assuming it's never None for now.
        # but, this is fine to leave as it doesn't seem to used or reached in
        # any of my tests yet.
        if not resource_type_id:
            raise NotImplementedError
        resources = self._postgres_resources[resource_type_id].query_resources(
            tenant_id
        )
        model = self.get_model(resource_type_id)
        resources = [
            model.model_validate(r, scim_ctx=Context.RESOURCE_QUERY_RESPONSE, extra='ignore')
            for r in resources
        ]
        resources = [r for r in resources if (tree is None or evaluate_filter(r, tree))]

        if search_request.sort_by is not None:
            descending = search_request.sort_order == SearchRequest.SortOrder.descending
            sort_operator = ResolveSortOperator(search_request.sort_by)

            # To ensure that unset attributes are sorted last (when ascending, as defined in the RFC),
            # we have to divide the result set into a set and unset subset.
            unset_values = []
            set_values = []
            for resource in resources:
                result = sort_operator(resource)
                if result is None:
                    unset_values.append(resource)
                else:
                    set_values.append((resource, result))

            set_values.sort(key=operator.itemgetter(1), reverse=descending)
            set_values = [value[0] for value in set_values]
            if descending:
                resources = unset_values + set_values
            else:
                resources = set_values + unset_values

        found_resources = resources[start_index:]
        if search_request.count is not None:
            found_resources = resources[: search_request.count]

        return len(resources), found_resources

    def get_resource(
            self, tenant_id: int, resource_type_id: str, object_id: str
    ) -> Resource | None:
        """Query the backend for a resources by its ID.

        :param resource_type_id: ID of the resource type to get the
            object from.
        :param object_id: ID of the object to get.
        :return: The resource object if it exists, None otherwise. The
            resource must be a copy, modifying it must not change the
            data stored in the backend.
        """
        resource = self._postgres_resources[resource_type_id].get_resource(
            object_id, tenant_id
        )
        if resource:
            model = self.get_model(resource_type_id)
            resource = model.model_validate(resource, extra='ignore')
        return resource

    def delete_resource(
            self, tenant_id: int, resource_type_id: str, object_id: str
    ) -> bool:
        """Delete a resource.

        :param resource_type_id: ID of the resource type to delete the
            object from.
        :param object_id: ID of the object to delete.
        :return: True if the resource was deleted, False otherwise.
        """
        resource = self.get_resource(tenant_id, resource_type_id, object_id)
        if resource:
            self._postgres_resources[resource_type_id].delete_resource(
                object_id, tenant_id
            )
            return True
        return False

    def create_resource(
            self, tenant_id: int, resource_type_id: str, resource: Resource
    ) -> Resource | None:
        """Create a resource.

        :param resource_type_id: ID of the resource type to create.
        :param resource: Resource to create.
        :return: The created resource. Creation should set system-
            defined attributes (ID, Metadata). May be the same object
            that is passed in.
        """
        model = self.get_model(resource_type_id)
        existing = self._postgres_resources[resource_type_id].search_existing(
            tenant_id, resource
        )
        if existing:
            # existing = model.model_validate(existing, extra='ignore')
            if existing["active"]:
                raise SCIMException(Error.make_uniqueness_error())
            resource.id = existing["id"]
            resource = self._postgres_resources[resource_type_id].restore_resource(
                tenant_id, resource
            )
        else:
            resource = self._postgres_resources[resource_type_id].create_resource(
                tenant_id, resource
            )
        resource = model.model_validate(resource, extra='ignore')
        return resource

    def update_resource(
            self, tenant_id: int, resource_type_id: str, resource: Resource
    ) -> Resource | None:
        """Update a resource. The resource is identified by its ID.

        :param resource_type_id: ID of the resource type to update.
        :param resource: Resource to update.
        :return: The updated resource. Updating should update the
            "meta.lastModified" data. May be the same object that is
            passed in.
        """
        model = self.get_model(resource_type_id)
        existing = self._postgres_resources[resource_type_id].search_existing(
            tenant_id, resource
        )
        print(">>>>> existing resource", existing)
        if existing:
            # existing = model.model_validate(existing, extra='ignore')
            if existing["active"]:
                if existing["id"] != resource.id:
                    raise SCIMException(Error.make_uniqueness_error())
                resource = self._postgres_resources[resource_type_id].update_resource(
                    tenant_id, resource
                )
            else:
                # TODO: do not delete here
                self._postgres_resources[resource_type_id].delete_resource(
                    existing["id"], tenant_id
                )
                resource = self._postgres_resources[resource_type_id].update_resource(
                    resource.id, tenant_id, resource
                )
        else:
            raise SCIMException(Error.make_no_target_error())

        print(">>>>>> resource", resource)

        if resource is not None:
            resource = model.model_validate(resource, extra='ignore')

        return resource
