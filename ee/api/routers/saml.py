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
async def start_sso(request: Request, iFrame: bool = False):
    request.path = ''
    req = await prepare_request(request=request)
    auth = init_saml_auth(req)
    sso_built_url = auth.login(return_to=json.dumps({'iFrame': iFrame}))
    return RedirectResponse(url=sso_built_url)


@public_app.post('/sso/saml2/acs', tags=["saml2"])
@public_app.post('/sso/saml2/acs/', tags=["saml2"])
async def process_sso_assertion(request: Request):
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

    redirect_to_link2 = post_data.get('RelayState', {}).get("iFrame")
    request_id = None
    if 'AuthNRequestID' in session:
        request_id = session['AuthNRequestID']

    auth.process_response(request_id=request_id)
    errors = auth.get_errors()
    user_data = {}
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
    logger.debug(f"received nameId: {email}")
    existing = users.get_by_email_only(auth.get_nameid())

    internal_id = next(iter(user_data.get("internalId", [])), None)
    tenant_key = user_data.get("tenantKey", [])
    if len(tenant_key) == 0:
        logger.error("tenantKey not present in assertion, please check your SP-assertion-configuration")
        return {"errors": ["tenantKey not present in assertion, please check your SP-assertion-configuration"]}
    else:
        t = tenants.get_by_tenant_key(tenant_key[0])
        if t is None:
            logger.error("invalid tenantKey, please copy the correct value from Preferences > Account")
            return {"errors": ["invalid tenantKey, please copy the correct value from Preferences > Account"]}
    logger.debug(user_data)
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

    if existing is None:
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
    expiration = auth.get_session_expiration()
    expiration = expiration if expiration is not None and expiration > 10 * 60 \
        else int(config("sso_exp_delta_seconds", cast=int, default=24 * 60 * 60))
    jwt = users.authenticate_sso(email=email, internal_id=internal_id, exp=expiration)
    if jwt is None:
        return {"errors": ["null JWT"]}
    refresh_token = jwt["refreshToken"]
    refresh_token_max_age = jwt["refreshTokenMaxAge"]
    response = Response(
        status_code=status.HTTP_302_FOUND,
        headers={'Location': SAML2_helper.get_landing_URL(jwt["jwt"], redirect_to_link2=redirect_to_link2)})
    response.set_cookie(key="refreshToken", value=refresh_token, path="/api/refresh",
                        max_age=refresh_token_max_age, secure=True, httponly=True)
    return response


@public_app.post('/sso/saml2/acs/{tenantKey}', tags=["saml2"])
@public_app.post('/sso/saml2/acs/{tenantKey}/', tags=["saml2"])
async def process_sso_assertion_tk(tenantKey: str, request: Request):
    req = await prepare_request(request=request)
    session = req["cookie"]["session"]
    auth = init_saml_auth(req)

    redirect_to_link2 = json.loads(req.get("post_data", {}) \
                                   .get('RelayState', '{}')).get("iFrame")
    request_id = None
    if 'AuthNRequestID' in session:
        request_id = session['AuthNRequestID']

    auth.process_response(request_id=request_id)
    errors = auth.get_errors()
    user_data = {}
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
    logger.debug(f"received nameId: {email}")
    existing = users.get_by_email_only(auth.get_nameid())

    internal_id = next(iter(user_data.get("internalId", [])), None)

    t = tenants.get_by_tenant_key(tenantKey)
    if t is None:
        logger.error("invalid tenantKey, please copy the correct value from Preferences > Account")
        return {"errors": ["invalid tenantKey, please copy the correct value from Preferences > Account"]}
    logger.debug(user_data)
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

    if existing is None:
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
    expiration = auth.get_session_expiration()
    expiration = expiration if expiration is not None and expiration > 10 * 60 \
        else int(config("sso_exp_delta_seconds", cast=int, default=24 * 60 * 60))
    jwt = users.authenticate_sso(email=email, internal_id=internal_id, exp=expiration)
    if jwt is None:
        return {"errors": ["null JWT"]}
    refresh_token = jwt["refreshToken"]
    refresh_token_max_age = jwt["refreshTokenMaxAge"]
    response = Response(
        status_code=status.HTTP_302_FOUND,
        headers={'Location': SAML2_helper.get_landing_URL(jwt["jwt"], redirect_to_link2=redirect_to_link2)})
    response.set_cookie(key="refreshToken", value=refresh_token, path="/api/refresh",
                        max_age=refresh_token_max_age, secure=True, httponly=True)
    return response


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
