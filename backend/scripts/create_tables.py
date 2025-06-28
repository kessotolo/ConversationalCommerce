"""
Script to create all tables in the database based on SQLAlchemy models.
This is used to populate the database before generating the baseline migration.
"""
import sys
from pathlib import Path

# Add project root to path for imports
project_root = str(Path(__file__).parents[2].absolute())
sys.path.insert(0, project_root)

# Set up an app module alias to handle relative imports in models
import backend.app
sys.modules['app'] = sys.modules['backend.app']

from sqlalchemy import create_engine, inspect, MetaData, Table
from backend.app.core.config.settings import Settings

# Import the Base from app.db to match what models are importing
from app.db import Base

# Explicitly import all models to ensure they're registered with Base
from backend.app.models.conversation_event import ConversationEvent
from backend.app.models.complaint import Complaint
from backend.app.models.order import Order
from backend.app.models.product import Product
from backend.app.models.seller_profile import SellerProfile
from backend.app.models.storefront_theme import StorefrontTheme
from backend.app.models.tenant import Tenant
from backend.app.models.user import User
from backend.app.models.customer import Customer
from backend.app.models.address_book import AddressBook
from backend.app.models.saved_payment_method import SavedPaymentMethod
from backend.app.models.notification_preferences import NotificationPreferences

def main():
    """Create all tables in the database."""
    # Use the same database URL as in alembic.ini
    database_url = "postgresql://postgres:postgres@localhost/fresh_baseline_db"
    
    # Create a synchronous version of the URL for SQLAlchemy
    sync_url = database_url.replace("+asyncpg", "")
    
    print(f"Creating database engine with URL: {sync_url}")
    engine = create_engine(sync_url)
    
    print("Creating all tables...")
    Base.metadata.create_all(bind=engine)
    print("All tables created successfully!")

if __name__ == "__main__":
    main()
