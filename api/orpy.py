from contextvars import ContextVar
from fastapi import FastAPI


orpy: ContextVar[FastAPI] = ContextVar('~openreplay.api.orpy.orpy')
