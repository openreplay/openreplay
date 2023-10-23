from contextvars import ContextVar
from fastapi import FastAPI


app: ContextVar[FastAPI] = ContextVar('api.base.app')
