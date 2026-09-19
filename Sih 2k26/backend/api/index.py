"""Vercel Serverless Function entry point for ComplyGeM AI FastAPI backend."""

import os
import sys
from pathlib import Path

# Add backend directory to sys.path so app and submodules are discoverable
backend_dir = Path(__file__).resolve().parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

if os.environ.get("VERCEL"):
    os.environ.setdefault("UPLOAD_DIR", "/tmp/uploads")

try:
    os.chdir(str(backend_dir))
except Exception:
    pass

from app.main import app

# Expose both app and handler for Vercel Python runtime
app = app
handler = app
