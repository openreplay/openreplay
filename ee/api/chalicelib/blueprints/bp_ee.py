from chalice import Blueprint

from chalicelib import _overrides
from chalicelib.core import roles
from chalicelib.core import unlock
from chalicelib.utils import assist_helper

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


@app.route('/assist/credentials', methods=['GET'])
def get_assist_credentials(context):
    return {"data": assist_helper.get_full_config()}
