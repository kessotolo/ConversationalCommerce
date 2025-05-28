import unittest
from unittest.mock import MagicMock, patch
from app.services.share_service import ShareService
from app.models.product import Product
from app.models.tenant import Tenant

class TestShareService(unittest.TestCase):
    def setUp(self):
        self.share_service = ShareService()
        self.db = MagicMock()
        
        # Mock product
        self.product = Product()
        self.product.id = "prod123"
        self.product.name = "Test Product"
        self.product.storefront_url = "https://store.example.com/products/prod123"
        
        # Mock tenant
        self.tenant = Tenant()
        self.tenant.id = "tenant123"
        self.tenant.is_verified = True
        self.tenant.whatsapp_number = "+1234567890"
        
        # Configure db mocks
        self.db.query.return_value.filter.return_value.first.side_effect = [
            self.product,  # First call returns product
            self.tenant    # Second call returns tenant
        ]
    
    @patch('app.services.share_service.generate_whatsapp_link')
    @patch('app.services.share_service.create_audit_log')
    def test_generate_whatsapp_share_link_success(self, mock_audit_log, mock_generate_link):
        # Setup
        mock_generate_link.return_value = "https://wa.me/1234567890?text=Check%20out%20this%20product"
        
        # Execute
        result = self.share_service.generate_whatsapp_share_link(
            db=self.db,
            product_id="prod123",
            tenant_id="tenant123",
            user_id="user123",
            campaign="test_campaign"
        )
        
        # Assert
        self.assertIn("link", result)
        self.assertIn("utm_url", result)
        self.assertEqual(result["campaign"], "test_campaign")
        mock_audit_log.assert_called_once()
        mock_generate_link.assert_called_once()
    
    def test_generate_whatsapp_share_link_unverified_tenant(self):
        # Setup - make tenant unverified
        self.tenant.is_verified = False
        
        # Execute & Assert
        with self.assertRaises(ValueError) as context:
            self.share_service.generate_whatsapp_share_link(
                db=self.db,
                product_id="prod123",
                tenant_id="tenant123",
                user_id="user123"
            )
        
        self.assertIn("not verified", str(context.exception))
    
    def test_generate_whatsapp_share_link_product_not_found(self):
        # Setup - product not found
        self.db.query.return_value.filter.return_value.first.side_effect = [None]
        
        # Execute & Assert
        with self.assertRaises(ValueError) as context:
            self.share_service.generate_whatsapp_share_link(
                db=self.db,
                product_id="nonexistent",
                tenant_id="tenant123",
                user_id="user123"
            )
        
        self.assertIn("Product not found", str(context.exception))

if __name__ == "__main__":
    unittest.main()
