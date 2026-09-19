"""Raise HTTPException payloads that match the public error envelope."""

from fastapi import HTTPException


def raise_api(status_code: int, code: str, message: str) -> None:
    raise HTTPException(status_code=status_code, detail={"code": code, "message": message})
