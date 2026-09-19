"""Consistent JSON error envelope used by every router."""

from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse


def error_body(code: str, message: str, details: object | None = None) -> dict:
    error: dict = {"code": code, "message": message}
    if details is not None:
        error["details"] = details
    return {"success": False, "error": error}


def register_exception_handlers(app: FastAPI) -> None:
    @app.exception_handler(HTTPException)
    async def http_exception_handler(_request: Request, exc: HTTPException) -> JSONResponse:
        if isinstance(exc.detail, dict) and "code" in exc.detail and "message" in exc.detail:
            return JSONResponse(
                status_code=exc.status_code,
                content=error_body(exc.detail["code"], exc.detail["message"], exc.detail.get("details")),
            )
        code = "http_error"
        if exc.status_code == 401:
            code = "UNAUTHORIZED"
        elif exc.status_code == 403:
            code = "FORBIDDEN"
        elif exc.status_code == 404:
            code = "NOT_FOUND"
        elif exc.status_code == 409:
            code = "CONFLICT"
        elif exc.status_code == 422:
            code = "VALIDATION_ERROR"
        return JSONResponse(status_code=exc.status_code, content=error_body(code, str(exc.detail)))

    @app.exception_handler(RequestValidationError)
    async def validation_handler(_request: Request, exc: RequestValidationError) -> JSONResponse:
        return JSONResponse(
            status_code=422,
            content=error_body("VALIDATION_ERROR", "Request validation failed", exc.errors()),
        )

    @app.exception_handler(Exception)
    async def unhandled(_request: Request, _exc: Exception) -> JSONResponse:
        return JSONResponse(
            status_code=500,
            content=error_body("INTERNAL_ERROR", "An unexpected error occurred. Please try again."),
        )
