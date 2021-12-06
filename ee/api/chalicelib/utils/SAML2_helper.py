from http import cookies
from urllib.parse import urlparse

from decouple import config
from fastapi import Request
from onelogin.saml2.auth import OneLogin_Saml2_Auth
from starlette.datastructures import FormData

SAML2 = {
    "strict": True,
    "debug": True,
    "sp": {
        "entityId": config("SITE_URL") + "/api/sso/saml2/metadata/",
        "assertionConsumerService": {
            "url": config("SITE_URL") + "/api/sso/saml2/acs",
            "binding": "urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST"
        },
        "singleLogoutService": {
            "url": config("SITE_URL") + "/api/sso/saml2/sls",
            "binding": "urn:oasis:names:tc:SAML:2.0:bindings:HTTP-Redirect"
        },
        "NameIDFormat": "urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress",
        "x509cert": "",
        "privateKey": ""
    },
    "idp": None
}
idp = None
# SAML2 config handler
if config("SAML2_MD_URL", default=None) is not None and len(config("SAML2_MD_URL")) > 0:
    print("SAML2_MD_URL provided, getting IdP metadata config")
    from onelogin.saml2.idp_metadata_parser import OneLogin_Saml2_IdPMetadataParser

    idp_data = OneLogin_Saml2_IdPMetadataParser.parse_remote(config("SAML2_MD_URL", default=None))
    idp = idp_data.get("idp")

if SAML2["idp"] is None:
    if len(config("idp_entityId", default="")) > 0 \
            and len(config("idp_sso_url", default="")) > 0 \
            and len(config("idp_x509cert", default="")) > 0:
        idp = {
            "entityId": config("idp_entityId"),
            "singleSignOnService": {
                "url": config("idp_sso_url"),
                "binding": "urn:oasis:names:tc:SAML:2.0:bindings:HTTP-Redirect"
            },
            "x509cert": config("idp_x509cert")
        }
        if len(config("idp_sls_url", default="")) > 0:
            idp["singleLogoutService"] = {
                "url": config("idp_sls_url"),
                "binding": "urn:oasis:names:tc:SAML:2.0:bindings:HTTP-Redirect"
            }

if idp is None:
    print("No SAML2 IdP configuration found")
else:
    SAML2["idp"] = idp


def init_saml_auth(req):
    # auth = OneLogin_Saml2_Auth(req, custom_base_path=environ['SAML_PATH'])

    if idp is None:
        raise Exception("No SAML2 config provided")
    auth = OneLogin_Saml2_Auth(req, old_settings=SAML2)

    return auth


async def prepare_request(request: Request):
    request.args = dict(request.query_params).copy() if request.query_params else {}
    form: FormData = await request.form()
    request.form = dict(form)
    cookie_str = request.headers.get("cookie", "")
    if "session" in cookie_str:
        cookie = cookies.SimpleCookie()
        cookie.load(cookie_str)
        # Even though SimpleCookie is dictionary-like, it internally uses a Morsel object
        # which is incompatible with requests. Manually construct a dictionary instead.
        extracted_cookies = {}
        for key, morsel in cookie.items():
            extracted_cookies[key] = morsel.value
        session = extracted_cookies["session"]
    else:
        session = {}
    # If server is behind proxys or balancers use the HTTP_X_FORWARDED fields
    headers = request.headers
    url_data = urlparse('%s://%s' % (headers.get('x-forwarded-proto', 'http'), headers['host']))
    return {
        'https': 'on' if request.headers.get('x-forwarded-proto', 'http') == 'https' else 'off',
        'http_host': request.headers['host'],
        'server_port': url_data.port,
        'script_name': "/api" + request.url.path,
        'get_data': request.args.copy(),
        # Uncomment if using ADFS as IdP, https://github.com/onelogin/python-saml/pull/144
        # 'lowercase_urlencoding': True,
        'post_data': request.form.copy(),
        'cookie': {"session": session},
        'request': request
    }


def is_saml2_available():
    return idp is not None


def get_saml2_provider():
    return config("idp_name", default="saml2") if is_saml2_available() and len(
        config("idp_name", default="saml2")) > 0 else None


def get_landing_URL(jwt):
    return config("SITE_URL") + config("sso_landing", default="/login?jwt=%s") % jwt
