"""ComplyGeM AI server entrypoint and CLI runner."""

import uvicorn
from app.main import app
from seed import seed

__all__ = ["app", "seed"]

if __name__ == "__main__":
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
