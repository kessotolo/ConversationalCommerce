import pytest
from fastapi.testclient import TestClient
from uuid import UUID
from sqlalchemy.orm import Session
from sqlalchemy import delete
from decimal import Decimal
from tests.conftest import TEST_USER_ID
from app.models.product import Product
from app.models.user import User

@pytest.mark.parametrize("product_data, expected_status", [
    ({"name": "Valid Product", "description": "Description", "price": 99.99}, 201),
    ({"name": "", "description": "Description", "price": 99.99}, 422),
    ({"name": "Valid Product", "description": "", "price": 99.99}, 422),
    ({"name": "Valid Product", "description": "Description", "price": -1}, 422),
    ({"name": "Valid Product", "description": "Description", "price": 0}, 422),
    ({"name": "Valid Product" * 50, "description": "Description", "price": 99.99}, 422),  # Name too long
    ({"name": "Valid Product", "description": "Description" * 200, "price": 99.99}, 422),  # Description too long
])
def test_create_product_validation_cases(client, auth_headers, test_user, product_data, expected_status):
    """
    Test product creation with different input data scenarios.
    Uses parameterized testing to cover multiple validation cases efficiently.
    """
    # test_user fixture ensures the user exists in the database
    
    response = client.post("/api/v1/products", headers=auth_headers, json=product_data)
    assert response.status_code == expected_status
    
    if expected_status == 201:
        data = response.json()
        assert data["name"] == product_data["name"]
        assert data["description"] == product_data["description"]
        assert float(data["price"]) == float(product_data["price"])
        assert data["seller_id"] == str(TEST_USER_ID)


@pytest.mark.parametrize("filter_params, expected_count", [
    ({"min_price": 50}, 2),  # Products with price >= 50
    ({"max_price": 50}, 2),  # Products with price <= 50 (both product1 and product2)
    ({"min_price": 30, "max_price": 60}, 1),  # Products with 30 <= price <= 60
    ({"search": "test"}, 3),  # Products with "test" in name or description
    ({"featured": True}, 1),  # Featured products
    ({"show_on_storefront": False}, 1),  # Products not shown on storefront
])
def test_list_products_with_filters_parameterized(client, auth_headers, db_session, test_user, filter_params, expected_count):
    """
    Test listing products with different filter parameters.
    Creates a set of test products and verifies filtering works correctly.
    """
    # test_user fixture ensures the user exists in the database
    
    # Create test products with different characteristics
    # Product 1: Low price, not featured, visible on storefront
    product1 = Product(
        name="Test Product 1",
        description="Low price product",
        price=Decimal("25.99"),
        seller_id=test_user.id,  # Use the actual user object from the fixture
        is_featured=False,
        show_on_storefront=True
    )
    
    # Product 2: Medium price, not featured, visible on storefront
    product2 = Product(
        name="Test Product 2",
        description="Medium price product",
        price=Decimal("50.00"),
        seller_id=test_user.id,
        is_featured=False,
        show_on_storefront=True
    )
    
    # Product 3: High price, featured, not visible on storefront
    product3 = Product(
        name="Premium Item",
        description="This is a test premium item",
        price=Decimal("99.99"),
        seller_id=test_user.id,
        is_featured=True,
        show_on_storefront=False
    )
    
    db_session.add_all([product1, product2, product3])
    db_session.commit()
    
    # Test with the parameterized filter
    response = client.get("/api/v1/products", headers=auth_headers, params=filter_params)
    assert response.status_code == 200
    
    data = response.json()
    assert data["total"] == expected_count
    assert len(data["items"]) == min(expected_count, 10)  # Default limit is 10


@pytest.fixture(scope="function")
def clean_products(db_session):
    """
    Fixture to ensure each test starts with a clean product table.
    This runs automatically for each test but preserves users.
    """
    # Run test
    yield
    
    # Clean up - delete all test products using SQLAlchemy
    stmt = delete(Product)
    db_session.execute(stmt)
    db_session.commit()
