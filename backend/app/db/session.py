from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.core.config.settings import Settings

settings = Settings()

# Get the proper database URL from settings using the getter method
SQLALCHEMY_DATABASE_URL = settings.get_database_url

# Create engine with explicit password handling
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"connect_timeout": 15})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def set_tenant_id(session, tenant_id):
    session.execute("SET my.tenant_id = :tenant_id", {"tenant_id": tenant_id})


from fastapi import Depends, Request

def get_db(request: Request = None):
    """Database dependency that automatically sets tenant context from request state"""
    db = SessionLocal()
    try:
        # If we have a request with tenant_id in state, use it
        if request and hasattr(request.state, 'tenant_id'):
            set_tenant_id(db, request.state.tenant_id)
        yield db
    finally:
        db.close()
        
def get_tenant_id_from_request(request: Request):
    """Extracts the tenant_id from request state (for use in services)"""
    if hasattr(request.state, 'tenant_id'):
        return request.state.tenant_id
    return None
