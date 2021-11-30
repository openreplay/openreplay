import base64
import hashlib
import hmac
from time import time

from chalice import Blueprint

from chalicelib import _overrides
from chalicelib.blueprints import bp_authorizers
from chalicelib.core import roles
from chalicelib.core import unlock
from chalicelib.utils import helper
from chalicelib.utils.helper import environ

app = Blueprint(__name__)
_overrides.chalice_app(app)

unlock.check()


@app.route('/client/roles', methods=['GET'])
def get_roles(context):
    return {
        'data': roles.get_roles(tenant_id=context["tenantId"])
    }


@app.route('/client/roles', methods=['POST', 'PUT'])
def add_role(context):
    data = app.current_request.json_body
    data = roles.create(tenant_id=context['tenantId'], user_id=context['userId'], name=data["name"],
                        description=data.get("description"), permissions=data["permissions"])
    if "errors" in data:
        return data

    return {
        'data': data
    }


@app.route('/client/roles/{roleId}', methods=['POST', 'PUT'])
def edit_role(roleId, context):
    data = app.current_request.json_body
    data = roles.update(tenant_id=context['tenantId'], user_id=context['userId'], role_id=roleId, changes=data)
    if "errors" in data:
        return data

    return {
        'data': data
    }


@app.route('/client/roles/{roleId}', methods=['DELETE'])
def delete_role(roleId, context):
    data = roles.delete(tenant_id=context['tenantId'], user_id=context["userId"], role_id=roleId)
    if "errors" in data:
        return data
    return {
        'data': data
    }


@app.route('/v1/assist/credentials', methods=['GET'], authorizer=bp_authorizers.api_key_authorizer)
@app.route('/assist/credentials', methods=['GET'], authorizer=bp_authorizers.api_key_authorizer)
def get_assist_credentials(context):
    user = helper.generate_salt()
    secret = environ["assist_secret"]
    ttl = int(environ.get("assist_ttl", 48)) * 3600
    timestamp = int(time()) + ttl
    username = str(timestamp) + ':' + user
    dig = hmac.new(bytes(secret, 'utf-8'), bytes(username, 'utf-8'), hashlib.sha1)
    dig = dig.digest()
    password = base64.b64encode(dig).decode()

    return {"data": {'username': username, 'password': password}}
