from chalice import Blueprint, AuthResponse
from chalicelib.utils import helper
from chalicelib.core import authorizers

from chalicelib.core import users

app = Blueprint(__name__)


@app.authorizer()
def api_key_authorizer(auth_request):
    r = authorizers.api_key_authorizer(auth_request.token)
    if r is None:
        return AuthResponse(routes=[], principal_id=None)
    r["authorizer_identity"] = "api_key"
    print(r)
    return AuthResponse(
        routes=['*'],
        principal_id=r['tenantId'],
        context=r
    )


@app.authorizer(ttl_seconds=60)
def jwt_authorizer(auth_request):
    jwt_payload = authorizers.jwt_authorizer(auth_request.token)
    if jwt_payload is None \
            or jwt_payload.get("iat") is None or jwt_payload.get("aud") is None \
            or not users.auth_exists(user_id=jwt_payload["userId"], tenant_id=jwt_payload["tenantId"],
                                     jwt_iat=jwt_payload["iat"], jwt_aud=jwt_payload["aud"]):
        return AuthResponse(routes=[], principal_id=None)
    jwt_payload["authorizer_identity"] = "jwt"
    print(jwt_payload)
    return AuthResponse(
        routes=['*'],
        principal_id=jwt_payload['userId'],
        context=jwt_payload
    )
