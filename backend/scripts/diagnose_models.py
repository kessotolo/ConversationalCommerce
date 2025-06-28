"""
Script to diagnose SQLAlchemy model registration issues.
"""
import sys
from pathlib import Path

# Add project root to path for imports
project_root = str(Path(__file__).parents[2].absolute())
sys.path.insert(0, project_root)

# Set up an app module alias to handle relative imports in models
import backend.app
sys.modules['app'] = sys.modules['backend.app']

from sqlalchemy import create_engine, inspect
from backend.app.db.base_class import Base

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
    """Diagnose model registration with SQLAlchemy."""
    print("\n=== Diagnosing SQLAlchemy Model Registration ===\n")
    
    # Print info about Base
    print(f"Base class id: {id(Base)}")
    print(f"Base metadata id: {id(Base.metadata)}")
    print(f"Number of tables in Base.metadata: {len(Base.metadata.tables)}")
    
    # Print all tables registered in metadata
    print("\nRegistered tables in Base.metadata:")
    for table_name, table in Base.metadata.tables.items():
        print(f"- {table_name}")
    
    # Check model classes and their __table__ attributes
    print("\nModel class tables:")
    models = [
        ConversationEvent, Complaint, Order, Product, 
        SellerProfile, StorefrontTheme, Tenant, User,
        Customer, AddressBook, SavedPaymentMethod, 
        NotificationPreferences
    ]
    
    for model in models:
        table_name = getattr(model, '__tablename__', None)
        print(f"- {model.__name__}: tablename={table_name}")
        # Check if model's table is in metadata
        if hasattr(model, '__table__'):
            table_in_metadata = model.__table__.name in Base.metadata.tables
            print(f"  Table in metadata: {table_in_metadata}")
            print(f"  Table key in metadata: {model.__table__.name}")
    
    # Try connecting to database and creating tables
    database_url = "postgresql://postgres:postgres@localhost/test_conversational_commerce"
    engine = create_engine(database_url)
    
    # Check tables in database before creation
    print("\nExisting tables in database before create_all:")
    inspector = inspect(engine)
    for table_name in inspector.get_table_names():
        print(f"- {table_name}")
    
    # Create tables
    print("\nCreating tables...")
    Base.metadata.create_all(bind=engine)
    print("create_all() completed")
    
    # Check tables in database after creation
    print("\nExisting tables in database after create_all:")
    inspector = inspect(engine)
    for table_name in inspector.get_table_names():
        print(f"- {table_name}")

if __name__ == "__main__":
    main()
