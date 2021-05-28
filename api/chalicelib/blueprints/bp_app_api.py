from chalice import Blueprint

from chalicelib import _overrides
from chalicelib.blueprints import bp_authorizers
from chalicelib.core import sessions

app = Blueprint(__name__)
_overrides.chalice_app(app)


@app.route('/app/{projectId}/users/{userId}/sessions', methods=['GET'], authorizer=bp_authorizers.api_key_authorizer)
def get_user_sessions2(projectId, userId, context):
    params = app.current_request.query_params

    if params is None:
        params = {}

    return {
        'data': sessions.get_user_sessions(
            project_id=projectId,
            user_id=userId,
            start_date=params.get('start_date'),
            end_date=params.get('end_date')
        )
    }


@app.route('/app/{projectId}/users/{userId}/events', methods=['GET'], authorizer=bp_authorizers.api_key_authorizer)
def get_user_events():
    pass


@app.route('/app/{projectId}/users/{userId}', methods=['GET'], authorizer=bp_authorizers.api_key_authorizer)
def get_user_details():
    pass


@app.route('/app/{projectId}/users/{userId}', methods=['DELETE'], authorizer=bp_authorizers.api_key_authorizer)
def delete_user_data():
    pass


@app.route('/app/{projectId}/jobs', methods=['GET'], authorizer=bp_authorizers.api_key_authorizer)
def get_jobs():
    pass


@app.route('/app/{projectId}/jobs/{jobId}', methods=['GET'], authorizer=bp_authorizers.api_key_authorizer)
def get_job():
    pass


@app.route('/app/{projectId}/jobs/{jobId}', methods=['DELETE'], authorizer=bp_authorizers.api_key_authorizer)
def cancel_job():
    pass
