import json
import logging

from decouple import config
from fastapi import HTTPException, Request, Response, status
from onelogin.saml2.auth import OneLogin_Saml2_Logout_Request
from starlette.responses import RedirectResponse

from chalicelib.core import users, tenants, roles
from chalicelib.utils import SAML2_helper
from routers import core_dynamic
from routers.base import get_routers
from routers.subs import spot

logger = logging.getLogger(__name__)

public_app, app, app_apikey = get_routers(prefix="/sso/saml2")


@public_app.get("", tags=["saml2"])
@public_app.get("/", tags=["saml2"])
async def start_sso(request: Request, iFrame: bool = False):
    request.path = ''
    req = await SAML2_helper.prepare_request(request=request)
    auth = SAML2_helper.init_saml_auth(req)
    sso_built_url = auth.login(return_to=json.dumps({'iFrame': iFrame}))
    return RedirectResponse(url=sso_built_url)


async def __process_assertion(request: Request, tenant_key=None) -> Response | dict:
    req = await SAML2_helper.prepare_request(request=request)
    session = req["cookie"]["session"]
    auth = SAML2_helper.init_saml_auth(req)

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
        tenant_key = [tenant_key]

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
    existing = users.get_by_email_only(email)
    role_names = user_data.get("role", [])
    role = None
    if len(role_names) == 0:
        if existing is None:
            logger.info("No role specified, setting role to member")
            role_names = ["member"]
        else:
            role_names = [existing["roleName"]]
            role = {"name": existing["roleName"], "roleId": existing["roleId"]}
    if role is None:
        for r in role_names:
            if existing and r.lower() == existing["roleName"].lower():
                role = {"roleId": existing["roleId"], "name": r}
            else:
                role = roles.get_role_by_name(tenant_id=t['tenantId'], name=r)

            if role is not None:
                break

    if role is None:
        return {"errors": [f"role '{role_names}' not found, please create it in OpenReplay first"]}
    logger.info(f"received roles:{role_names}; using:{role['name']}")
    admin_privileges = user_data.get("adminPrivileges", [])
    if len(admin_privileges) == 0:
        if existing is None:
            admin_privileges = not (len(admin_privileges) == 0
                                    or admin_privileges[0] is None
                                    or admin_privileges[0].lower() == "false")
        else:
            admin_privileges = existing["admin"]

    internal_id = next(iter(user_data.get("internalId", [])), None)
    full_name = " ".join(user_data.get("firstName", []) + user_data.get("lastName", []))
    if existing is None:
        deleted = users.get_deleted_user_by_email(auth.get_nameid())
        if deleted is not None:
            logger.info("== restore deleted user ==")
            users.restore_sso_user(user_id=deleted["userId"], tenant_id=t['tenantId'], email=email,
                                   admin=admin_privileges, origin=SAML2_helper.get_saml2_provider(),
                                   name=full_name, internal_id=internal_id, role_id=role["roleId"])
        else:
            logger.info("== new user ==")
            users.create_sso_user(tenant_id=t['tenantId'], email=email, admin=admin_privileges,
                                  origin=SAML2_helper.get_saml2_provider(),
                                  name=full_name, internal_id=internal_id, role_id=role["roleId"])
    else:
        if t['tenantId'] != existing["tenantId"]:
            logger.warning("user exists for a different tenant")
            return {"errors": ["user exists for a different tenant"]}
        # Check difference between existing user and received data
        received_data = {
            "role": "admin" if admin_privileges else "member",
            "origin": SAML2_helper.get_saml2_provider(),
            "name": full_name,
            "internal_id": internal_id,
            "role_id": role["roleId"]
        }
        existing_data = {
            "role": "admin" if existing["admin"] else "member",
            "origin": existing["origin"],
            "name": existing["name"],
            "internal_id": existing["internalId"],
            "role_id": existing["roleId"]
        }
        to_update = {}
        for k in existing_data.keys():
            if (k != "role" or not existing["superAdmin"]) and existing_data[k] != received_data[k]:
                to_update[k] = received_data[k]

        if len(to_update.keys()) > 0:
            logger.info(f"== Updating user:{existing['userId']}: {to_update} ==")
            users.update(tenant_id=t['tenantId'], user_id=existing["userId"], changes=to_update)

    jwt = users.authenticate_sso(email=email, internal_id=internal_id)
    if jwt is None:
        return {"errors": ["null JWT"]}
    response = Response(status_code=status.HTTP_302_FOUND)
    response.set_cookie(key="refreshToken", value=jwt["refreshToken"], path=core_dynamic.COOKIE_PATH,
                        max_age=jwt["refreshTokenMaxAge"], secure=True, httponly=True)
    query_params = {"jwt": jwt["jwt"], "spotJwt": jwt["spotJwt"]}
    response.set_cookie(key="spotRefreshToken", value=jwt["spotRefreshToken"], path=spot.COOKIE_PATH,
                        max_age=jwt["spotRefreshTokenMaxAge"], secure=True, httponly=True)

    headers = {'Location': SAML2_helper.get_landing_URL(query_params=query_params, redirect_to_link2=redirect_to_link2)}
    response.init_headers(headers)
    return response


@public_app.post('/acs', tags=["saml2"])
@public_app.post('/acs/', tags=["saml2"])
async def process_sso_assertion(request: Request):
    return await __process_assertion(request=request)


@public_app.post('/acs/{tenantKey}', tags=["saml2"])
@public_app.post('/acs/{tenantKey}/', tags=["saml2"])
async def process_sso_assertion_tk(tenantKey: str, request: Request):
    return await __process_assertion(request=request, tenant_key=tenantKey)


@public_app.get('/sls', tags=["saml2"])
@public_app.get('/sls/', tags=["saml2"])
async def process_sls_assertion(request: Request):
    req = await SAML2_helper.prepare_request(request=request)
    session = req["cookie"]["session"]
    auth = SAML2_helper.init_saml_auth(req)
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


@public_app.get('/metadata', tags=["saml2"])
@public_app.get('/metadata/', tags=["saml2"])
async def saml2_metadata(request: Request):
    req = await SAML2_helper.prepare_request(request=request)
    auth = SAML2_helper.init_saml_auth(req)
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
