"""ComplyGeM AI FastAPI entrypoint."""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import inspect, text

from app.core.config import get_settings
from app.core.database import Base, engine
from app.core.exceptions import register_exception_handlers
from app.routers import audit, auth, bidders, bids, delivery, demo, documents, notifications, officer, tenders, vigilance

settings = get_settings()


def _ensure_sqlite_schema() -> None:
    if not settings.database_url.startswith("sqlite"):
        return
    with engine.begin() as conn:
        inspector = inspect(conn)
        existing = set(inspector.get_table_names())
        for table_name, table in Base.metadata.tables.items():
            if table_name not in existing:
                continue
            columns = {column["name"] for column in inspector.get_columns(table_name)}
            for column in table.columns:
                if column.name in columns:
                    continue
                sql_type = column.type.compile(dialect=conn.dialect)
                conn.execute(text(f'ALTER TABLE "{table_name}" ADD COLUMN "{column.name}" {sql_type}'))


@asynccontextmanager
async def lifespan(_app: FastAPI):
    _ensure_sqlite_schema()
    Base.metadata.create_all(bind=engine)
    if settings.database_url.startswith("sqlite"):
        from seed import seed

        seed()
    yield


app = FastAPI(
    title=settings.app_name,
    description=(
        "AI-powered bid compliance verification for Government e-Marketplace (GeM) procurement. "
        "Udyam, GSTN, MCA21, EPFO/ESIC, DigiLocker, NSIC and Startup India checks are simulated."
    ),
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

register_exception_handlers(app)
app.include_router(auth.router, prefix="/api")
app.include_router(tenders.router, prefix="/api")
app.include_router(bidders.router, prefix="/api")
app.include_router(bids.router, prefix="/api")
app.include_router(documents.router, prefix="/api")
app.include_router(officer.router, prefix="/api")
app.include_router(audit.router, prefix="/api")
app.include_router(notifications.router, prefix="/api")
app.include_router(vigilance.router, prefix="/api")
app.include_router(delivery.router, prefix="/api")
app.include_router(demo.router, prefix="/api")


@app.get("/")
def root() -> dict[str, str]:
    return {"service": settings.app_name, "docs": "/docs"}


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "service": settings.app_name}
