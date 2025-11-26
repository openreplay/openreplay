import logging
import traceback
from typing import Union

from pydantic import ValidationError
from scim2_models import (
    AuthenticationScheme,
    ServiceProviderConfig,
    Patch,
    Bulk,
    Filter,
    Sort,
    ETag,
    Meta,
    ChangePassword,
    Error,
    ResourceType,
    Context,
    ListResponse,
    PatchOp,
)
from scim2_server import provider
from scim2_server.utils import SCIMException, merge_resources
from werkzeug import Request, Response
from werkzeug.exceptions import HTTPException, NotFound, PreconditionFailed
from werkzeug.routing.exceptions import RequestRedirect

from chalicelib.utils.scim_auth import verify_access_token

logger = logging.getLogger(__name__)


class MultiTenantProvider(provider.SCIMProvider):

    def check_auth(self, request: Request):
        logger.debug(f"call processed by check_auth: {request.method} {request.path}")
        auth = request.headers.get("Authorization")
        if not auth or not auth.startswith("Bearer "):
            return None
        token = auth[len("Bearer "):]
        if not token:
            return Response(
                "Missing or invalid Authorization header",
                status=401,
                headers={"WWW-Authenticate": 'Bearer realm="login required"'},
            )
        payload = verify_access_token(token)
        tenant_id = payload["tenant_id"]
        return tenant_id

    def get_service_provider_config(self):
        auth_schemes = [
            AuthenticationScheme(
                type="oauthbearertoken",
                name="OAuth Bearer Token",
                description="Authentication scheme using the OAuth Bearer Token Standard. The access token should be sent in the 'Authorization' header using the Bearer schema.",
                spec_uri="https://datatracker.ietf.org/doc/html/rfc6750",
            )
        ]
        return ServiceProviderConfig(
            # todo(jon): write correct documentation uri
            documentation_uri="https://www.example.com/",
            patch=Patch(supported=True),
            bulk=Bulk(supported=False),
            filter=Filter(supported=True, max_results=1000),
            change_password=ChangePassword(supported=False),
            sort=Sort(supported=True),
            etag=ETag(supported=False),
            authentication_schemes=auth_schemes,
            meta=Meta(resource_type="ServiceProviderConfig"),
        )

    def query_resource(
            self, request: Request, tenant_id: int, resource: ResourceType | None
    ):
        logger.debug(f"call processed by query_resource: {request.method} {request.path}")
        search_request = self.build_search_request(request)

        kwargs = {}
        if resource is not None:
            kwargs["resource_type_id"] = resource.id
        total_results, results = self.backend.query_resources(
            search_request=search_request, tenant_id=tenant_id, **kwargs
        )
        for r in results:
            self.adjust_location(request, r)

        resources = [
            s.model_dump(
                scim_ctx=Context.RESOURCE_QUERY_RESPONSE,
                attributes=search_request.attributes,
                excluded_attributes=search_request.excluded_attributes,
            )
            for s in results
        ]

        return ListResponse[Union[tuple(self.backend.get_models())]](  # noqa: UP007
            total_results=total_results,
            items_per_page=search_request.count,
            start_index=search_request.start_index,
            resources=resources,
        )

    def call_resource(
            self, request: Request, resource_endpoint: str, **kwargs
    ) -> Response:
        logger.debug(f"call processed by call_resource: {request.method} {request.path}")
        resource_type = self.backend.get_resource_type_by_endpoint(
            "/" + resource_endpoint
        )
        if not resource_type:
            raise NotFound

        if "tenant_id" not in kwargs:
            raise Exception
        tenant_id = kwargs["tenant_id"]

        match request.method:
            case "GET":
                return self.make_response(
                    self.query_resource(request, tenant_id, resource_type).model_dump(
                        scim_ctx=Context.RESOURCE_QUERY_RESPONSE,
                    )
                )
            case _:  # "POST"
                payload = request.json
                resource = self.backend.get_model(resource_type.id).model_validate(
                    payload, scim_ctx=Context.RESOURCE_CREATION_REQUEST
                )
                created_resource = self.backend.create_resource(
                    tenant_id,
                    resource_type.id,
                    resource,
                )
                self.adjust_location(request, created_resource)
                return self.make_response(
                    created_resource.model_dump(
                        scim_ctx=Context.RESOURCE_CREATION_RESPONSE
                    ),
                    status=201,
                    headers={"Location": created_resource.meta.location},
                )

    def call_single_resource(
            self, request: Request, resource_endpoint: str, resource_id: str, **kwargs
    ) -> Response:
        logger.debug(f"call processed by call_single_resource: {request.method} {request.path}")
        find_endpoint = "/" + resource_endpoint
        resource_type = self.backend.get_resource_type_by_endpoint(find_endpoint)
        if not resource_type:
            raise NotFound

        if "tenant_id" not in kwargs:
            raise Exception
        tenant_id = kwargs["tenant_id"]

        match request.method:
            case "GET":
                if resource := self.backend.get_resource(
                        tenant_id, resource_type.id, resource_id
                ):
                    if self.continue_etag(request, resource):
                        response_args = self.get_attrs_from_request(request)
                        self.adjust_location(request, resource)
                        return self.make_response(
                            resource.model_dump(
                                scim_ctx=Context.RESOURCE_QUERY_RESPONSE,
                                **response_args,
                            )
                        )
                    else:
                        return self.make_response(None, status=304)
                raise NotFound
            case "DELETE":
                if self.backend.delete_resource(
                        tenant_id, resource_type.id, resource_id
                ):
                    return self.make_response(None, 204)
                else:
                    raise NotFound
            case "PUT":
                response_args = self.get_attrs_from_request(request)
                resource = self.backend.get_resource(
                    tenant_id, resource_type.id, resource_id
                )
                if resource is None:
                    raise NotFound
                if not self.continue_etag(request, resource):
                    raise PreconditionFailed

                updated_attributes = self.backend.get_model(
                    resource_type.id
                ).model_validate(request.json)
                merge_resources(resource, updated_attributes)
                updated = self.backend.update_resource(
                    tenant_id, resource_type.id, resource
                )
                self.adjust_location(request, updated)
                return self.make_response(
                    updated.model_dump(
                        scim_ctx=Context.RESOURCE_REPLACEMENT_RESPONSE,
                        **response_args,
                    )
                )
            case _:  # "PATCH"
                payload = request.json
                # MS Entra sometimes passes a "id" attribute
                if "id" in payload:
                    del payload["id"]
                operations = payload.get("Operations", [])
                for operation in operations:
                    if "name" in operation:
                        # MS Entra sometimes passes a "name" attribute
                        del operation["name"]

                patch_operation = PatchOp.model_validate(payload)
                response_args = self.get_attrs_from_request(request)
                resource = self.backend.get_resource(
                    tenant_id, resource_type.id, resource_id
                )
                if resource is None:
                    raise NotFound
                if not self.continue_etag(request, resource):
                    raise PreconditionFailed

                self.apply_patch_operation(resource, patch_operation)
                updated = self.backend.update_resource(
                    tenant_id, resource_type.id, resource
                )

                if response_args:
                    self.adjust_location(request, updated)
                    return self.make_response(
                        updated.model_dump(
                            scim_ctx=Context.RESOURCE_REPLACEMENT_RESPONSE,
                            **response_args,
                        )
                    )
                else:
                    # RFC 7644, section 3.5.2:
                    # A PATCH operation MAY return a 204 (no content)
                    # if no attributes were requested
                    return self.make_response(
                        None, 204, headers={"ETag": updated.meta.version}
                    )

    def wsgi_app(self, request: Request, environ):
        logger.debug(f"call processed by wsgi_app: {request.method} {request.path}")
        try:
            if environ.get("PATH_INFO", "").endswith(".scim"):
                # RFC 7644, Section 3.8
                # Just strip .scim suffix, the provider always returns application/scim+json
                environ["PATH_INFO"], _, _ = environ["PATH_INFO"].rpartition(".scim")
            urls = self.url_map.bind_to_environ(environ)
            endpoint, args = urls.match()

            tenant_id = None
            if endpoint != "service_provider_config":
                # RFC7643, Section 5: skip authentication for ServiceProviderConfig
                tenant_id = self.check_auth(request)

            # Wrap the entire call in a transaction. Should probably be optimized (use transaction only when necessary).
            with self.backend:
                if endpoint == "service_provider_config" or endpoint == "schema":
                    response = getattr(self, f"call_{endpoint}")(request, **args)
                else:
                    response = getattr(self, f"call_{endpoint}")(
                        request, **args, tenant_id=tenant_id
                    )
            return response
        except RequestRedirect as e:
            # urls.match may cause a redirect, handle it as a special case of HTTPException
            self.log.exception(e)
            return e.get_response(environ)
        except HTTPException as e:
            self.log.exception(e)
            return self.make_error(Error(status=e.code, detail=e.description))
        except SCIMException as e:
            self.log.exception(e)
            return self.make_error(e.scim_error)
        except ValidationError as e:
            self.log.exception(e)
            return self.make_error(Error(status=400, detail=str(e)))
        except Exception as e:
            self.log.exception(e)
            tb = traceback.format_exc()
            return self.make_error(Error(status=500, detail=str(e) + "\n" + tb))
