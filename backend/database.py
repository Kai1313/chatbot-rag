import os
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

# Default to Docker service URL or local fallback URL
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://local_user:local_password@localhost:5432/local_db"
)

# Engine configuration
engine = create_engine(DATABASE_URL, pool_pre_ping=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    """Dependency for obtaining DB session in FastAPI routes."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
