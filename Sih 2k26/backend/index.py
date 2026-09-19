"""Root entrypoint for Vercel serverless."""
from api.index import app, handler

__all__ = ["app", "handler"]
