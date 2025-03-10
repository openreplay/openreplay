"""
Middleware components for the FastAPI application.
"""

from .timing import timing_middleware
from .cors import setup_cors

__all__ = ["timing_middleware", "setup_cors"]
