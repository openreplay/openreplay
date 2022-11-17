from fastapi import FastAPI

app = FastAPI()

@app.get('/')
def home():
    return '<h1>This is a title</h1>'
