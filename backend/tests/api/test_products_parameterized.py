import pytest
import logging
from sqlalchemy import delete
from tests.api.test_products import TEST_USER_ID
from backend.app.models.product import Product
from backend.app.models.user import User


@pytest.mark.parametrize(
    "product_data, expected_status",
    [
        ({"name": "Valid Product", "description": "Description", "price": 99.99}, 201),
        ({"name": "", "description": "Description", "price": 99.99}, 422),
        ({"name": "Valid Product", "description": "", "price": 99.99}, 422),
        ({"name": "Valid Product", "description": "Description", "price": -1}, 422),
        ({"name": "Valid Product", "description": "Description", "price": 0}, 422),
        (
            {
                "name": "Valid Product" * 50,
                "description": "Description",
                "price": 99.99,
            },
            422,
        ),  # Name too long
        (
            {
                "name": "Valid Product",
                "description": "Description" * 200,
                "price": 99.99,
            },
            422,
        ),  # Description too long
    ],
)
def test_create_product_validation_cases(
    client,
    db_session,
    test_user,
    auth_headers,
    product_data,
    expected_status,
    test_tenant,
):
    """
    Test product creation with different input data scenarios.
    Uses parameterized testing to cover multiple validation cases efficiently.
    """
    # Debug logging to diagnose 403 errors
    print(f"\n--- TEST DEBUG INFO ---")
    print(f"test_user: {test_user.id} (is_seller: {test_user.is_seller})")
    print(f"test_tenant: {test_tenant.id}")
    print(f"auth_headers: {auth_headers}")
    
    # Print database row count to verify database state
    import logging
    logger = logging.getLogger(__name__)
    logger.debug(f"User count: {db_session.query(User).count()}")
    logger.debug(f"Tenant count: {db_session.query(User).count()}")
    
    # Add seller_id to product_data
    modified_product_data = product_data.copy()
    modified_product_data['seller_id'] = str(test_user.id)
    modified_product_data['tenant_id'] = str(test_tenant.id)
    print(f"Product data with seller_id: {modified_product_data}")
    
    response = client.post("/api/v1/products", headers=auth_headers, json=modified_product_data)
    
    # Log response content for debugging
    print(f"Response status code: {response.status_code}")
    print(f"Response content: {response.content}")
    print(f"Response headers: {response.headers}")
    print("--- END TEST DEBUG INFO ---\n")
    
    assert response.status_code == expected_status

    if expected_status == 201:
        data = response.json()
        assert data["name"] == product_data["name"]
        assert data["description"] == product_data["description"]
        assert float(data["price"]) == float(product_data["price"])
        assert data["seller_id"] == str(TEST_USER_ID)


@pytest.mark.parametrize(
    "filter_params, expected_count",
    [
        ({"min_price": 50}, 2),  # Products with price >= 50
        (
            {"max_price": 50},
            2,
        ),  # Products with price <= 50 (both product1 and product2)
        ({"min_price": 30, "max_price": 60}, 1),  # Products with 30 <= price <= 60
        ({"search": "test"}, 3),  # Products with "test" in name or description
        ({"featured": True}, 1),  # Featured products
        ({"show_on_storefront": False}, 1),  # Products not shown on storefront
    ],
)
def test_list_products_with_filters_parameterized(
    client,
    db_session,
    test_user,
    auth_headers,
    filter_params,
    expected_count,
    test_tenant,
):
    """
    Test listing products with different filter parameters.
    Creates a set of test products and verifies filtering works correctly.
    """
    # test_user fixture ensures the user exists in the database

    # Create test products with different characteristics
    # Product 1: Low price, not featured, visible on storefront
    product1 = Product(
        name="Product 1",
        description="Test product 1",
        price=10.0,
        seller_id=test_user.id,
    )
    product1.tenant_id = test_tenant.id

    # Product 2: Medium price, not featured, visible on storefront
    product2 = Product(
        name="Product 2",
        description="Test product 2",
        price=20.0,
        seller_id=test_user.id,
    )
    product2.tenant_id = test_tenant.id

    # Product 3: High price, featured, not visible on storefront
    product3 = Product(
        name="Product 3",
        description="Test product 3",
        price=30.0,
        seller_id=test_user.id,
    )
    product3.tenant_id = test_tenant.id

    db_session.add_all([product1, product2, product3])
    db_session.commit()

    # Test with the parameterized filter
    response = client.get(
        "/api/v1/products", headers=auth_headers, params=filter_params
    )
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
