# This file is now deprecated in favor of the modular structure in app/db/
# Import Base for backward compatibility with existing code
from app.db.base_class import Base
from app.db.session import SessionLocal, engine
