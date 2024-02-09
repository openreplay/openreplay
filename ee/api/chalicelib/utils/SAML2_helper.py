import logging
from http import cookies
from os import environ
from urllib.parse import urlparse

from decouple import config
from fastapi import Request
from starlette.datastructures import FormData

if config("ENABLE_SSO", cast=bool, default=True):
    from onelogin.saml2.auth import OneLogin_Saml2_Auth

API_PREFIX = "/api"
SAML2 = {
    "strict": config("saml_strict", cast=bool, default=True),
    "debug": config("saml_debug", cast=bool, default=True),
    "sp": {
        "entityId": config("SITE_URL") + API_PREFIX + "/sso/saml2/metadata/",
        "assertionConsumerService": {
            "url": config("SITE_URL") + API_PREFIX + "/sso/saml2/acs/",
            "binding": "urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST"
        },
        "singleLogoutService": {
            "url": config("SITE_URL") + API_PREFIX + "/sso/saml2/sls/",
            "binding": "urn:oasis:names:tc:SAML:2.0:bindings:HTTP-Redirect"
        },
        "NameIDFormat": "urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress",
        "x509cert": config("sp_crt", default=""),
        "privateKey": config("sp_key", default=""),
    },
    "security": {
        "requestedAuthnContext": False
    },
    "idp": None
}

# in case tenantKey is included in the URL
sp_acs = config("idp_tenantKey", default="")
if sp_acs is not None and len(sp_acs) > 0:
    SAML2["sp"]["assertionConsumerService"]["url"] += sp_acs + "/"

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
    logging.info("No SAML2 IdP configuration found")
else:
    SAML2["idp"] = idp


def init_saml_auth(req):
    if idp is None:
        raise Exception("No SAML2 config provided")
    return OneLogin_Saml2_Auth(req, old_settings=SAML2)


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
        if "session" not in extracted_cookies:
            logging.info("!!! session not found in extracted_cookies")
            logging.info(extracted_cookies)
        session = extracted_cookies.get("session", {})
    else:
        session = {}
    # If server is behind proxys or balancers use the HTTP_X_FORWARDED fields
    headers = request.headers
    proto = headers.get('x-forwarded-proto', 'http')
    url_data = urlparse('%s://%s' % (proto, headers['host']))
    path = request.url.path
    site_url = urlparse(config("SITE_URL"))
    # to support custom port without changing IDP config
    host_suffix = ""
    if site_url.port is not None and request.url.port is None:
        host_suffix = f":{site_url.port}"

    # add / to /acs
    if not path.endswith("/"):
        path = path + '/'
    if len(API_PREFIX) > 0 and not path.startswith(API_PREFIX):
        path = API_PREFIX + path

    return {
        'https': 'on' if proto == 'https' else 'off',
        'http_host': request.headers['host'] + host_suffix,
        'server_port': url_data.port,
        'script_name': path,
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


def get_landing_URL(jwt, redirect_to_link2=False):
    if redirect_to_link2:
        if len(config("sso_landing_override", default="")) == 0:
            logging.warning("SSO trying to redirect to custom URL, but sso_landing_override env var is empty")
        else:
            return config("sso_landing_override") + "?jwt=%s" % jwt

    return config("SITE_URL") + config("sso_landing", default="/login?jwt=%s") % jwt


environ["hastSAML2"] = str(is_saml2_available())
