"""Vercel Serverless Function entry point for ComplyGeM AI FastAPI backend."""

import os
import sys
from pathlib import Path

# Add backend directory to sys.path
root_dir = Path(__file__).resolve().parent.parent
backend_dir = root_dir / "backend"

if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

# Ensure working directory is backend for relative asset resolution
try:
    os.chdir(str(backend_dir))
except Exception:
    pass

from app.main import app

# Vercel ASGI handler
handler = app
