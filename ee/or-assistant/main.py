from fastapi import FastAPI, Depends, HTTPException
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from auth.auth_key import api_key_auth
from core.session_summary import summarize, summarize_stream
# from utils import params
from utils import declarations


@asynccontextmanager
async def lifespan(app: FastAPI):
    ...
    yield
    ...

app = FastAPI(lifespan=lifespan)

origins = [
    "*"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.post('/{projectId}/summary/session/{sessionId}', dependencies=[Depends(api_key_auth)])
async def session_summary(projectId: int, sessionId: int, eventList: declarations.EventList):
    # result = summarize(projectId, sessionId, eventList)
    result = None
    return {'status': 200, 'content': result}

@app.get('/stream/{projectId}/summary/session/{sessionId}',
          dependencies=[Depends(api_key_auth)],
          response_model=str,
          responses={503: {"detail": "OpenAI server is busy, try again later"}})
@app.post('/stream/{projectId}/summary/session/{sessionId}',
         dependencies=[Depends(api_key_auth)],
         response_model=str,
         responses={503: {"detail": "OpenAI server is busy, try again later"}})
async def session_summary_stream(projectId: int, sessionId: int, eventList: declarations.EventList):
    return StreamingResponse(summarize_stream(sessionId, projectId, eventList), media_type="text/event-stream")

@app.get('/')
async def health():
    return {'status': 200}

