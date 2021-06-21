from chalice import Blueprint

from chalicelib import _overrides
from chalicelib.utils.SAML2_helper import prepare_request, init_saml_auth

app = Blueprint(__name__)
_overrides.chalice_app(app)

from chalicelib.utils.helper import environ

from onelogin.saml2.auth import OneLogin_Saml2_Logout_Request
from onelogin.saml2.utils import OneLogin_Saml2_Utils

from chalice import Response
from chalicelib.core import users, tenants


@app.route("/saml2", methods=['GET'], authorizer=None)
def start_sso():
    app.current_request.path = ''
    req = prepare_request(request=app.current_request)
    auth = init_saml_auth(req)
    sso_built_url = auth.login()
    return Response(
        # status_code=301,
        status_code=307,
        body='',
        headers={'Location': sso_built_url, 'Content-Type': 'text/plain'})


@app.route('/saml2/acs', methods=['POST'], content_types=['application/x-www-form-urlencoded'], authorizer=None)
def process_sso_assertion():
    req = prepare_request(request=app.current_request)
    session = req["cookie"]["session"]
    request = req['request']
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
        # session['samlUserdata'] = user_data
        # session['samlNameId'] = auth.get_nameid()
        # session['samlNameIdFormat'] = auth.get_nameid_format()
        # session['samlNameIdNameQualifier'] = auth.get_nameid_nq()
        # session['samlNameIdSPNameQualifier'] = auth.get_nameid_spnq()
        # session['samlSessionIndex'] = auth.get_session_index()
        # session['samlSessionExpiration'] = auth.get_session_expiration()
        # print('>>>>')
        # print(session)
        self_url = OneLogin_Saml2_Utils.get_self_url(req)
        if 'RelayState' in request.form and self_url != request.form['RelayState']:
            print("====>redirect")
            return Response(
                status_code=307,
                body='',
                headers={'Location': auth.redirect_to(request.form['RelayState']), 'Content-Type': 'text/plain'})
    elif auth.get_settings().is_debug_active():
        error_reason = auth.get_last_error_reason()
        return {"errors": [error_reason]}

    email = auth.get_nameid()
    existing = users.get_by_email_only(auth.get_nameid())
    internal_id = next(iter(user_data.get("internalId", [])), None)
    if len(existing) == 0:
        print("== new user ==")
        tenant_key = user_data.get("tenantKey", [])
        if len(tenant_key) == 0:
            print("tenantKey not present in assertion")
            return Response(
                status_code=307,
                body={"errors": ["tenantKey not present in assertion"]},
                headers={'Location': auth.redirect_to(request.form['RelayState']), 'Content-Type': 'text/plain'})
        else:
            t = tenants.get_by_tenant_key(tenant_key[0])
            if t is None:
                return Response(
                    status_code=307,
                    body={"errors": ["Unknown tenantKey"]},
                    headers={'Location': auth.redirect_to(request.form['RelayState']), 'Content-Type': 'text/plain'})

        users.create_sso_user(tenant_id=t['tenantId'], email=email, admin=True, origin='saml',
                              name=" ".join(user_data.get("firstName", []) + user_data.get("lastName", [])),
                              internal_id=internal_id)
    return users.authenticate_sso(email=email, internal_id=internal_id, exp=auth.get_session_expiration())


@app.route('/saml2/slo', methods=['GET'])
def process_slo_request(context):
    req = prepare_request(request=app.current_request)
    session = req["cookie"]["session"]
    request = req['request']
    auth = init_saml_auth(req)

    name_id = session_index = name_id_format = name_id_nq = name_id_spnq = None
    if 'samlNameId' in session:
        name_id = session['samlNameId']
    if 'samlSessionIndex' in session:
        session_index = session['samlSessionIndex']
    if 'samlNameIdFormat' in session:
        name_id_format = session['samlNameIdFormat']
    if 'samlNameIdNameQualifier' in session:
        name_id_nq = session['samlNameIdNameQualifier']
    if 'samlNameIdSPNameQualifier' in session:
        name_id_spnq = session['samlNameIdSPNameQualifier']
    users.change_jwt_iat(context["userId"])
    return Response(
        status_code=307,
        body='',
        headers={'Location': auth.logout(name_id=name_id, session_index=session_index, nq=name_id_nq,
                                         name_id_format=name_id_format,
                                         spnq=name_id_spnq), 'Content-Type': 'text/plain'})


@app.route('/saml2/sls', methods=['GET'], authorizer=None)
def process_sls_assertion():
    req = prepare_request(request=app.current_request)
    session = req["cookie"]["session"]
    request = req['request']
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


@app.route('/saml2/metadata', methods=['GET'], authorizer=None)
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
