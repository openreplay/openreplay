from chalice import Blueprint, AuthResponse
from chalicelib.utils import helper
from chalicelib.core import authorizers

from chalicelib.ee import users

app = Blueprint(__name__)


@app.authorizer()
def api_key_authorizer(auth_request):
    r = authorizers.api_key_authorizer(auth_request.token)
    if r is None:
        return AuthResponse(routes=[], principal_id=None)

    return AuthResponse(
        routes=['*'],
        principal_id=r['tenantId'],
        context=r
    )


@app.authorizer(ttl_seconds=60)
def jwt_authorizer(auth_request):
    print("---- Auth")
    jwt_payload = authorizers.jwt_authorizer(auth_request.token)
    print(jwt_payload)
    if jwt_payload is None \
            or jwt_payload.get("iat") is None or jwt_payload.get("aud") is None \
            or not users.auth_exists(user_id=jwt_payload["userId"], tenant_id=jwt_payload["tenantId"],
                                     jwt_iat=jwt_payload["iat"], jwt_aud=jwt_payload["aud"]):
        return AuthResponse(routes=[], principal_id=None)

    return AuthResponse(
        routes=['*'],
        principal_id=jwt_payload['userId'],
        context=jwt_payload
    )
