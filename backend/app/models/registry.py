"""
Model Registry

This module provides a centralized place to register all models with SQLAlchemy's
metadata. It carefully orders the imports to prevent circular dependencies and
ensure foreign key references are satisfied during migrations.

This is used by Alembic to generate migrations with the correct table order.
"""
from backend.app.db import Base

# Import core enums first (these don't depend on any models)
from backend.app.models.core.enums import (
    KYCStatus,
    PaymentMethodType,
    OrderSource,
    OrderStatus,
    KYCStatusEnum,
    PaymentMethodTypeEnum,
    OrderSourceEnum,
    OrderStatusEnum
)

# Now import models in dependency order - this matters for migrations!
# 1. First, import models with no foreign key dependencies
from backend.app.models.tenant import Tenant  # Base tenant entity
from backend.app.models.user import User  # Users aren't dependent on other entities
from backend.app.models.customer import Customer  # Customer basic info

# 2. Then, models that depend on the base entities
from backend.app.models.address_book import AddressBook  # Depends on Customer
from backend.app.models.saved_payment_method import SavedPaymentMethod  # Depends on Customer
# Depends on Customer
from backend.app.models.notification_preferences import NotificationPreferences
from backend.app.models.seller_profile import SellerProfile  # Depends on Tenant and User
# Depends on Tenant, needs to come before Order
from backend.app.models.product import Product

# 3. Then more complex entities that depend on multiple other entities
# Depends on Customer, Tenant, possibly Product
from backend.app.models.order import Order
from backend.app.models.order_item import OrderItem  # Depends on Order and Product
from backend.app.models.order_channel_meta import OrderChannelMeta  # Depends on Order
from backend.app.models.cart import Cart  # Depends on Customer and Product

# 4. Conversation and storefront entities
from backend.app.models.conversation_event import ConversationEvent  # Messaging events
from backend.app.models.conversation_history import ConversationHistory
from backend.app.models.complaint import Complaint  # Customer complaints

# 5. Storefront-related models
from backend.app.models.storefront import StorefrontConfig
from backend.app.models.storefront_theme import StorefrontTheme
from backend.app.models.storefront_asset import StorefrontAsset
from backend.app.models.storefront_banner import StorefrontBanner
from backend.app.models.storefront_component import StorefrontComponent
from backend.app.models.storefront_draft import StorefrontDraft
from backend.app.models.storefront_logo import StorefrontLogo
from backend.app.models.storefront_page_template import StorefrontPageTemplate
from backend.app.models.storefront_permission import StorefrontPermission
from backend.app.models.storefront_version import StorefrontVersion

# 6. Other specialized models
from backend.app.models.ai_config import AIConfig
from backend.app.models.alert_config import AlertConfig
from backend.app.models.audit.audit_log import AuditLog
from backend.app.models.behavior_analysis import BehaviorPattern, PatternDetection, Evidence
from backend.app.models.content_filter import ContentFilterRule, ContentAnalysisResult
from backend.app.models.kyc_document import KYCDocument
from backend.app.models.kyc_info import KYCInfo
from backend.app.models.shipping import SellerShippingProvider, ShippingCourier
from backend.app.models.team_invite import TeamInvite
from backend.app.models.violation import Violation

# Export Base.metadata for Alembic to use in migrations
metadata = Base.metadata
