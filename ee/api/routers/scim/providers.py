import logging
from typing import Any

from fastapi import HTTPException as FastAPIHTTPException
from pydantic_core import from_json, to_json
from scim2_models import (
    AuthenticationScheme,
    Bulk,
    ChangePassword,
    ETag,
    Filter,
    Patch,
    PatchOp,
    ResourceType,
    ScimPolicy,
    ServiceProviderConfig,
    Sort,
    UnauthorizedException,
)
from scim2_server.applications.wsgi import WSGIApplication
from scim2_server.requests import ScimRequest
from scim2_server.responses import ScimResponse
from scim2_server.service import ScimService
from wsgiref.util import application_uri

from chalicelib.utils.scim_auth import verify_access_token
from routers.scim.backends import CURRENT_TENANT_ID

logger = logging.getLogger(__name__)


def get_service_provider_config() -> ServiceProviderConfig:
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
        bulk=Bulk(supported=False, max_operations=0, max_payload_size=0),
        filter=Filter(supported=True, max_results=1000),
        change_password=ChangePassword(supported=False),
        sort=Sort(supported=True),
        etag=ETag(supported=False),
        authentication_schemes=auth_schemes,
    )


def get_scim_policy() -> ScimPolicy:
    """How tolerant the server is with the payloads of the identity providers.

    Unknown attributes are dropped rather than refused, and the PATCH
    dialect of Microsoft Entra is accepted.
    """
    return ScimPolicy(
        unknown=ScimPolicy.Unknown.ignore,
        remove_value_as_filter=ScimPolicy.RemoveValue.apply,
        unmatched_path_filter=ScimPolicy.UnmatchedPathFilter.create,
    )


class OpenReplayScimService(ScimService):

    def read_patch(
            self, resource_type: ResourceType, body: bytes, content_type: str | None
    ) -> "PatchOp[Any]":
        """Validate a PATCH body, after dropping what MS Entra adds to it.

        Entra sometimes sends an ``id`` attribute at the top level, and a
        ``name`` attribute in its operations. Neither is part of RFC 7644.
        """
        self.ensure_json(content_type)
        try:
            payload = from_json(body)
        except ValueError:
            # Let the regular validation report the syntax error.
            return super().read_patch(resource_type, body, content_type)

        if isinstance(payload, dict):
            payload.pop("id", None)
            operations = payload.get("Operations")
            if isinstance(operations, list):
                for operation in operations:
                    if isinstance(operation, dict):
                        operation.pop("name", None)
            body = to_json(payload)
        return super().read_patch(resource_type, body, content_type)


class MultiTenantApplication(WSGIApplication):
    """The SCIM WSGI application, authenticating each request with a tenant bearer token.

    The tenant of the verified token scopes every storage call, through
    :data:`routers.scim.backends.CURRENT_TENANT_ID`.
    """

    @staticmethod
    def get_base_url(environ: dict[str, Any]) -> str:
        # The application is mounted under ".../sso/scim/v2": the version is
        # already part of the mount path, unlike the default implementation.
        return application_uri(environ).rstrip("/")

    def check_auth(self, request: ScimRequest) -> None:
        self.authenticate(request)

    @staticmethod
    def authenticate(request: ScimRequest) -> int:
        """Return the tenant of the bearer token of a request.

        :raises UnauthorizedException: When the token is missing or invalid.
        """
        logger.debug(f"call processed by authenticate: {request.method} {request.path}")
        auth = request.header("Authorization")
        token = auth[len("Bearer "):] if auth and auth.startswith("Bearer ") else None
        if not token:
            raise UnauthorizedException(detail="Missing or invalid Authorization header")
        try:
            payload = verify_access_token(token)
        except FastAPIHTTPException as e:
            raise UnauthorizedException(detail=str(e.detail))
        return payload["tenant_id"]

    def dispatch_request(self, request: ScimRequest) -> ScimResponse:
        logger.debug(f"call processed by dispatch_request: {request.method} {request.path}")
        tenant_id = None
        if self.needs_auth(request):
            # RFC7643, Section 5: skip authentication for ServiceProviderConfig
            tenant_id = self.authenticate(request)
        request.subject = tenant_id
        token = CURRENT_TENANT_ID.set(tenant_id)
        try:
            return self.handler.handle(request)
        finally:
            CURRENT_TENANT_ID.reset(token)
