#!/usr/bin/env python3
# Simple script to test model relationships directly with the local database

import os
import sys
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
import uuid
from datetime import datetime

# Set environment variables to ensure we use local PostgreSQL
os.environ["DATABASE_URL"] = "postgresql://postgres:postgres@localhost/conversational_commerce"
os.environ["POSTGRES_SERVER"] = "localhost"
os.environ["POSTGRES_USER"] = "postgres"
os.environ["POSTGRES_PASSWORD"] = "postgres"
os.environ["POSTGRES_DB"] = "conversational_commerce"

# Import models after environment variables are set
from app.db.base_class import Base

# Import all models to ensure proper dependencies are resolved
from app.db.base import *  # This imports all models registered in the app

# Create engine and session
DATABASE_URL = "postgresql://postgres:postgres@localhost/conversational_commerce"
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def test_create_tables():
    """Test creating database tables."""
    print("Creating database tables...")
    Base.metadata.create_all(bind=engine)
    print("Database tables created successfully.")

def test_create_tenant():
    """Test creating a tenant."""
    db = SessionLocal()
    try:
        # Create a test tenant
        from app.models.tenant import Tenant
        tenant = Tenant(
            id=uuid.uuid4(),
            name="Test Tenant",
            subdomain="test",
            status="active"
        )
        db.add(tenant)
        db.commit()
        print(f"Tenant created successfully with ID: {tenant.id}")
        return tenant.id
    except Exception as e:
        db.rollback()
        print(f"Error creating tenant: {e}")
        raise
    finally:
        db.close()

def test_relationships(tenant_id):
    """Test model relationships."""
    db = SessionLocal()
    try:
        # Import models explicitly
        from app.models.tenant import Tenant
        from app.models.behavior_analysis import BehaviorPattern, PatternDetection, Evidence
        from app.models.violation import Violation
        
        # Get the tenant
        tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()
        if not tenant:
            print(f"Tenant with ID {tenant_id} not found.")
            return

        # Create a behavior pattern
        pattern = BehaviorPattern(
            id=uuid.uuid4(),
            tenant_id=tenant.id,
            name="Test Pattern",
            description="Test behavior pattern",
            pattern_type="test",
            threshold=0.5,
            enabled=True
        )
        db.add(pattern)
        
        # Create a pattern detection
        detection = PatternDetection(
            id=uuid.uuid4(),
            tenant_id=tenant.id,
            pattern_id=pattern.id,
            detection_type="test",
            confidence_score=0.8,
            evidence={"test": "data"},
            status="active"
        )
        db.add(detection)
        
        # Create evidence
        evidence = Evidence(
            id=uuid.uuid4(),
            tenant_id=tenant.id,
            detection_id=detection.id,
            evidence_type="test",
            source="test",
            data={"test": "data"},
            collected_at=datetime.utcnow()
        )
        db.add(evidence)
        
        # Create a violation
        violation = Violation(
            id=uuid.uuid4(),
            tenant_id=tenant.id,
            detection_id=detection.id,
            type="test",
            severity="low",
            action="warn",
            status="active",
            reason="Testing",
            details={"test": "data"}
        )
        db.add(violation)
        
        db.commit()
        print("All relationships created successfully")
        
        # Verify relationships
        tenant_fresh = db.query(Tenant).filter(Tenant.id == tenant_id).first()
        print(f"Tenant has {len(tenant_fresh.behavior_patterns)} behavior patterns")
        print(f"Tenant has {len(tenant_fresh.pattern_detections)} pattern detections")
        print(f"Tenant has {len(tenant_fresh.evidence)} evidence items")
        print(f"Tenant has {len(tenant_fresh.violations)} violations")
        
    except Exception as e:
        db.rollback()
        print(f"Error testing relationships: {e}")
        raise
    finally:
        db.close()

if __name__ == "__main__":
    print("Testing model relationships...")
    test_create_tables()
    tenant_id = test_create_tenant()
    test_relationships(tenant_id)
    print("Tests completed successfully.")
