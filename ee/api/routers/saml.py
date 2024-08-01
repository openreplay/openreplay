import json
import logging

from fastapi import HTTPException, Request, Response, status

from chalicelib.utils import SAML2_helper
from chalicelib.utils.SAML2_helper import prepare_request, init_saml_auth
from routers.base import get_routers

logger = logging.getLogger(__name__)

public_app, app, app_apikey = get_routers()
from decouple import config

from onelogin.saml2.auth import OneLogin_Saml2_Logout_Request

from chalicelib.core import users, tenants, roles
from starlette.responses import RedirectResponse


@public_app.get("/sso/saml2", tags=["saml2"])
@public_app.get("/sso/saml2/", tags=["saml2"])
async def start_sso(request: Request, iFrame: bool = False, spot: bool = False):
    request.path = ''
    req = await prepare_request(request=request)
    auth = init_saml_auth(req)
    sso_built_url = auth.login(return_to=json.dumps({'iFrame': iFrame, 'spot': spot}))
    return RedirectResponse(url=sso_built_url)


async def __process_assertion(request: Request, tenant_key=None):
    req = await prepare_request(request=request)
    session = req["cookie"]["session"]
    auth = init_saml_auth(req)

    post_data = req.get("post_data")
    if post_data is None:
        post_data = {}
    elif isinstance(post_data, str):
        post_data = json.loads(post_data)
    elif not isinstance(post_data, dict):
        logger.error("Received invalid post_data")
        logger.error("type: {}".format(type(post_data)))
        logger.error(post_data)
        post_data = {}

    redirect_to_link2 = None
    spot = False
    relay_state = post_data.get('RelayState')
    if relay_state:
        if isinstance(relay_state, str):
            relay_state = json.loads(relay_state)
        elif not isinstance(relay_state, dict):
            logger.error("Received invalid relay_state")
            logger.error("type: {}".format(type(relay_state)))
            logger.error(relay_state)
            relay_state = {}
        redirect_to_link2 = relay_state.get("iFrame")
        spot = relay_state.get("spot")

    request_id = None
    if 'AuthNRequestID' in session:
        request_id = session['AuthNRequestID']

    auth.process_response(request_id=request_id)
    errors = auth.get_errors()
    if len(errors) == 0:
        if 'AuthNRequestID' in session:
            del session['AuthNRequestID']
        user_data = auth.get_attributes()
    else:
        error_reason = auth.get_last_error_reason()
        logger.error("SAML2 error:")
        logger.error(error_reason)
        return {"errors": [error_reason]}

    email = auth.get_nameid()
    if tenant_key is None:
        tenant_key = user_data.get("tenantKey", [])
    else:
        logger.info("Using tenant key from ACS-URL")

    logger.debug(f"received nameId: {email}  tenant_key: {tenant_key}")
    logger.debug(">user_data:")
    logger.debug(user_data)
    if len(tenant_key) == 0:
        logger.error("tenantKey not present in assertion, please check your SP-assertion-configuration")
        return {"errors": ["tenantKey not present in assertion, please check your SP-assertion-configuration"]}
    else:
        t = tenants.get_by_tenant_key(tenant_key[0])
        if t is None:
            logger.error("invalid tenantKey, please copy the correct value from Preferences > Account")
            return {"errors": ["invalid tenantKey, please copy the correct value from Preferences > Account"]}
    existing = users.get_by_email_only(auth.get_nameid())
    internal_id = next(iter(user_data.get("internalId", [])), None)

    if existing is None:
        role_name = user_data.get("role", [])
        if len(role_name) == 0:
            logger.info("No role specified, setting role to member")
            role_name = ["member"]
        role_name = role_name[0]
        role = roles.get_role_by_name(tenant_id=t['tenantId'], name=role_name)
        if role is None:
            return {"errors": [f"role {role_name}  not found, please create it in openreplay first"]}

        admin_privileges = user_data.get("adminPrivileges", [])
        admin_privileges = not (len(admin_privileges) == 0
                                or admin_privileges[0] is None
                                or admin_privileges[0].lower() == "false")

        deleted = users.get_deleted_user_by_email(auth.get_nameid())
        if deleted is not None:
            logger.info("== restore deleted user ==")
            users.restore_sso_user(user_id=deleted["userId"], tenant_id=t['tenantId'], email=email,
                                   admin=admin_privileges, origin=SAML2_helper.get_saml2_provider(),
                                   name=" ".join(user_data.get("firstName", []) + user_data.get("lastName", [])),
                                   internal_id=internal_id, role_id=role["roleId"])
        else:
            logger.info("== new user ==")
            users.create_sso_user(tenant_id=t['tenantId'], email=email, admin=admin_privileges,
                                  origin=SAML2_helper.get_saml2_provider(),
                                  name=" ".join(user_data.get("firstName", []) + user_data.get("lastName", [])),
                                  internal_id=internal_id, role_id=role["roleId"])
    else:
        if t['tenantId'] != existing["tenantId"]:
            logger.warning("user exists for a different tenant")
            return {"errors": ["user exists for a different tenant"]}
        if existing.get("origin") is None:
            logger.info(f"== migrating user to {SAML2_helper.get_saml2_provider()} ==")
            users.update(tenant_id=t['tenantId'], user_id=existing["userId"],
                         changes={"origin": SAML2_helper.get_saml2_provider(), "internal_id": internal_id})
    jwt = users.authenticate_sso(email=email, internal_id=internal_id, include_spot=spot)
    if jwt is None:
        return {"errors": ["null JWT"]}
    response = Response(status_code=status.HTTP_302_FOUND)
    response.set_cookie(key="refreshToken", value=jwt["refreshToken"], path="/api/refresh",
                        max_age=jwt["refreshTokenMaxAge"], secure=True, httponly=True)
    query_params = {"jwt": jwt["jwt"]}
    if spot:
        response.set_cookie(key="spotRefreshToken", value=jwt["spotRefreshToken"], path="/api/spot/refresh",
                            max_age=jwt["spotRefreshTokenMaxAge"], secure=True, httponly=True)
        query_params["spotJwt"] = jwt["spotJwt"]

    headers = {'Location': SAML2_helper.get_landing_URL(query_params=query_params, redirect_to_link2=redirect_to_link2)}
    response.init_headers(headers)
    return response


@public_app.post('/sso/saml2/acs', tags=["saml2"])
@public_app.post('/sso/saml2/acs/', tags=["saml2"])
async def process_sso_assertion(request: Request):
    return await __process_assertion(request)


@public_app.post('/sso/saml2/acs/{tenantKey}', tags=["saml2"])
@public_app.post('/sso/saml2/acs/{tenantKey}/', tags=["saml2"])
async def process_sso_assertion_tk(tenantKey: str, request: Request):
    return await __process_assertion(request, tenantKey)


@public_app.get('/sso/saml2/sls', tags=["saml2"])
@public_app.get('/sso/saml2/sls/', tags=["saml2"])
async def process_sls_assertion(request: Request):
    req = await prepare_request(request=request)
    session = req["cookie"]["session"]
    auth = init_saml_auth(req)
    request_id = None
    if 'LogoutRequestID' in session:
        request_id = session['LogoutRequestID']

    def dscb():
        session.clear()

    url = auth.process_slo(request_id=request_id, delete_session_cb=dscb)

    errors = auth.get_errors()
    if len(errors) == 0:
        if 'SAMLRequest' in req['get_data']:
            logout_request = OneLogin_Saml2_Logout_Request(auth.get_settings(), req['get_data']['SAMLRequest'])
            user_email = logout_request.get_nameid(auth.get_last_request_xml())
            to_logout = users.get_by_email_only(user_email)

            if to_logout is not None:
                to_logout = to_logout['userId']
                users.refresh_jwt_iat_jti(to_logout)
            else:
                logger.warning("Unknown user SLS-Request By IdP")
        else:
            logger.info("Preprocessed SLS-Request by SP")

        if url is not None:
            return RedirectResponse(url=url)

    return RedirectResponse(url=config("SITE_URL"))


@public_app.get('/sso/saml2/metadata', tags=["saml2"])
@public_app.get('/sso/saml2/metadata/', tags=["saml2"])
async def saml2_metadata(request: Request):
    req = await prepare_request(request=request)
    auth = init_saml_auth(req)
    settings = auth.get_settings()
    metadata = settings.get_sp_metadata()
    errors = settings.validate_metadata(metadata)

    if len(errors) == 0:
        return Response(
            status_code=status.HTTP_200_OK,
            content=metadata,
            headers={'Content-Type': 'text/xml'})
    else:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=', '.join(errors))
