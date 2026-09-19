"""SQLAlchemy enum columns that work on both PostgreSQL and SQLite."""

from enum import Enum as PyEnum

from sqlalchemy import Enum


def str_enum(enum_cls: type[PyEnum], name: str) -> Enum:
    return Enum(
        enum_cls,
        name=name,
        values_callable=lambda members: [item.value for item in members],
        native_enum=False,
        length=40,
    )
