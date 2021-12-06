from chalice import Blueprint

from chalicelib import _overrides
from chalicelib.utils import SAML2_helper
from chalicelib.utils.SAML2_helper import prepare_request, init_saml_auth

app = Blueprint(__name__)
_overrides.chalice_app(app)

from chalicelib.utils.helper import environ

from onelogin.saml2.auth import OneLogin_Saml2_Logout_Request

from chalice import Response
from chalicelib.core import users, tenants, roles


@app.route('/sso/saml2', methods=['GET'], authorizer=None)
def start_sso():
    app.current_request.path = ''
    req = prepare_request(request=app.current_request)
    auth = init_saml_auth(req)
    sso_built_url = auth.login()
    return Response(
        status_code=307,
        body='',
        headers={'Location': sso_built_url, 'Content-Type': 'text/plain'})


@app.route('/sso/saml2/acs', methods=['POST'], content_types=['application/x-www-form-urlencoded'], authorizer=None)
def process_sso_assertion():
    req = prepare_request(request=app.current_request)
    session = req["cookie"]["session"]
    auth = init_saml_auth(req)

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
    elif auth.get_settings().is_debug_active():
        error_reason = auth.get_last_error_reason()
        return {"errors": [error_reason]}

    email = auth.get_nameid()
    print("received nameId:")
    print(email)
    existing = users.get_by_email_only(auth.get_nameid())

    internal_id = next(iter(user_data.get("internalId", [])), None)
    tenant_key = user_data.get("tenantKey", [])
    if len(tenant_key) == 0:
        print("tenantKey not present in assertion, please check your SP-assertion-configuration")
        return {"errors": ["tenantKey not present in assertion, please check your SP-assertion-configuration"]}
    else:
        t = tenants.get_by_tenant_key(tenant_key[0])
        if t is None:
            print("invalid tenantKey, please copy the correct value from Preferences > Account")
            return {"errors": ["invalid tenantKey, please copy the correct value from Preferences > Account"]}
    print(user_data)
    role_name = user_data.get("role", [])
    if len(role_name) == 0:
        print("No role specified, setting role to member")
        role_name = ["member"]
    role_name = role_name[0]
    role = roles.get_role_by_name(tenant_id=t['tenantId'], name=role_name)
    if role is None:
        return {"errors": [f"role {role_name}  not found, please create it in openreplay first"]}

    admin_privileges = user_data.get("adminPrivileges", [])
    admin_privileges = len(admin_privileges) == 0 \
                       or admin_privileges[0] is None \
                       or admin_privileges[0].lower() == "false"

    if existing is None:
        print("== new user ==")
        users.create_sso_user(tenant_id=t['tenantId'], email=email, admin=admin_privileges,
                              origin=SAML2_helper.get_saml2_provider(),
                              name=" ".join(user_data.get("firstName", []) + user_data.get("lastName", [])),
                              internal_id=internal_id, role_id=role["roleId"])
    else:
        if t['tenantId'] != existing["tenantId"]:
            print("user exists for a different tenant")
            return {"errors": ["user exists for a different tenant"]}
        if existing.get("origin") is None:
            print(f"== migrating user to {SAML2_helper.get_saml2_provider()} ==")
            users.update(tenant_id=t['tenantId'], user_id=existing["id"],
                         changes={"origin": SAML2_helper.get_saml2_provider(), "internal_id": internal_id})
    expiration = auth.get_session_expiration()
    expiration = expiration if expiration is not None and expiration > 10 * 60 \
        else int(environ.get("sso_exp_delta_seconds", 24 * 60 * 60))
    jwt = users.authenticate_sso(email=email, internal_id=internal_id, exp=expiration)
    if jwt is None:
        return {"errors": ["null JWT"]}
    return Response(
        status_code=302,
        body='',
        headers={'Location': SAML2_helper.get_landing_URL(jwt), 'Content-Type': 'text/plain'})


@app.route('/sso/saml2/sls', methods=['GET'], authorizer=None)
def process_sls_assertion():
    req = prepare_request(request=app.current_request)
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

            if len(to_logout) > 0:
                to_logout = to_logout[0]['id']
                users.change_jwt_iat(to_logout)
            else:
                print("Unknown user SLS-Request By IdP")
        else:
            print("Preprocessed SLS-Request by SP")

        if url is not None:
            return Response(
                status_code=307,
                body='',
                headers={'Location': url, 'Content-Type': 'text/plain'})

    return Response(
        status_code=307,
        body='',
        headers={'Location': environ["SITE_URL"], 'Content-Type': 'text/plain'})


@app.route('/sso/saml2/metadata', methods=['GET'], authorizer=None)
def saml2_metadata():
    req = prepare_request(request=app.current_request)
    auth = init_saml_auth(req)
    settings = auth.get_settings()
    metadata = settings.get_sp_metadata()
    errors = settings.validate_metadata(metadata)

    if len(errors) == 0:
        return Response(
            status_code=200,
            body=metadata,
            headers={'Content-Type': 'text/xml'})
    else:
        return Response(
            status_code=500,
            body=', '.join(errors))
