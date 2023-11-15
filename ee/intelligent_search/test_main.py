from fastapi.testclient import TestClient
from main import app
from decouple import config
from os import path


client = TestClient(app)


def test_alive():
    response = client.get("/")
    assert response.status_code == 200

def test_correct_download():
    llm_dir = config('CHECKPOINT_DIR')
    tokenizer_path = config('TOKENIZER_PATH')
    assert path.exists(tokenizer_path) == True
    assert path.exists(llm_dir) == True

def test_correct_upload():
    with TestClient(app) as client_statup:
        response = client_statup.post('llm/completion', headers={'Authorization': 'Bearer ' + config('LLAMA_API_AUTH_KEY', cast=str), 'Content-Type': 'application/json'}, json={"question": "Show me the sessions from Texas", "userId": 0, "projectId": 0})
        assert response.status_code == 200

