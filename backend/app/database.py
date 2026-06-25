import os
from pathlib import Path

from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker


ENV_FILE = Path(__file__).resolve().parents[1] / ".env"
load_dotenv(ENV_FILE)

# Base is required by SQLAlchemy models.
Base = declarative_base()

DATABASE_URL = os.getenv("DATABASE_URL")

engine = None
SessionLocal = None

if DATABASE_URL:
    try:
        engine = create_engine(
            DATABASE_URL,
            pool_pre_ping=True,
            pool_size=5,
            max_overflow=10,
            # connect_args={
            #     "ssl_verify_cert": True
            # }
        )
        SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
        db_host = (
            DATABASE_URL.split("@", 1)[1].split("/", 1)[0]
            if "@" in DATABASE_URL
            else "local"
        )
        print(f"Database configured ({db_host})")
    except Exception as exc:
        print(f"DB configuration failed: {exc}")
        print("Database not configured yet")
else:
    print("DATABASE_URL not set; skipping DB connection")


def get_db():
    if SessionLocal is None:
        raise RuntimeError("Database not configured yet")

    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
