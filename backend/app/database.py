# This file is created to support legacy test imports
# It redirects imports from app.database to the new app.db structure

from app.db.base_class import Base
from app.db.session import SessionLocal, engine

# Export all symbols from app.db for backward compatibility
# Add other exports as needed if tests fail with missing imports
