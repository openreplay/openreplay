from fastapi.testclient import TestClient
from utils.module_handler import torch_available
from main import app
from decouple import config
from os import path


client = TestClient(app)


def test_alive():
    response = client.get("/")
    assert response.status_code == 200

def test_correct_download():
    if not torch_available:
        return
    llm_dir = config('CHECKPOINT_DIR')
    tokenizer_path = config('TOKENIZER_PATH')
    assert path.exists(tokenizer_path) == True
    assert path.exists(llm_dir) == True

def correct_upload():
    with TestClient(app) as client_statup:
        response = client_statup.post('llm/local', headers={'Authorization': 'Bearer ' + config('API_AUTH_KEY', cast=str), 'Content-Type': 'application/json'}, json={"question": "Show me the sessions from Texas", "userId": 0, "projectId": 0})
        assert response.status_code == 200

def endpoint():
    with TestClient(app) as client_statup:
        response = client_statup.post('llm/anyscale', headers={'Authorization': 'Bearer ' + config('API_AUTH_KEY', cast=str), 'Content-Type': 'application/json'}, json={"question": "Show me the sessions from Texas", "userId": 0, "projectId": 0})
        assert response.status_code == 200

def test_functionality():
    assert endpoint() or correct_upload

