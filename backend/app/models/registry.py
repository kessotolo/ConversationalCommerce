"""
Model Registry

This module provides a centralized place to register all models with SQLAlchemy's
metadata. It carefully orders the imports to prevent circular dependencies and
ensure foreign key references are satisfied during migrations.

This is used by Alembic to generate migrations with the correct table order.
"""
from app.db import Base

# Import core enums first (these don't depend on any models)
from app.models.core.enums import (
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
from app.models.tenant import Tenant  # Base tenant entity
from app.models.user import User  # Users aren't dependent on other entities
from app.models.customer import Customer  # Customer basic info

# 2. Then, models that depend on the base entities
from app.models.address_book import AddressBook  # Depends on Customer
from app.models.saved_payment_method import SavedPaymentMethod  # Depends on Customer
# Depends on Customer
from app.models.notification_preferences import NotificationPreferences
from app.models.seller_profile import SellerProfile  # Depends on Tenant and User
# Depends on Tenant, needs to come before Order
from app.models.product import Product

# 3. Then more complex entities that depend on multiple other entities
# Depends on Customer, Tenant, possibly Product
from app.models.order import Order
from app.models.order_item import OrderItem  # Depends on Order and Product
from app.models.order_channel_meta import OrderChannelMeta  # Depends on Order
from app.models.cart import Cart  # Depends on Customer and Product

# 4. Conversation and storefront entities
from app.models.conversation_event import ConversationEvent  # Messaging events
from app.models.conversation_history import ConversationHistory
from app.models.complaint import Complaint  # Customer complaints

# 5. Storefront-related models
from app.models.storefront import StorefrontConfig
from app.models.storefront_theme import StorefrontTheme
from app.models.storefront_asset import StorefrontAsset
from app.models.storefront_banner import StorefrontBanner
from app.models.storefront_component import StorefrontComponent
from app.models.storefront_draft import StorefrontDraft
from app.models.storefront_logo import StorefrontLogo
from app.models.storefront_page_template import StorefrontPageTemplate
from app.models.storefront_permission import StorefrontPermission
from app.models.storefront_version import StorefrontVersion

# 6. Other specialized models
from app.models.ai_config import AIConfig
from app.models.alert_config import AlertConfig
from app.models.audit.audit_log import AuditLog
from app.models.behavior_analysis import BehaviorPattern, PatternDetection, Evidence
from app.models.content_filter import ContentFilterRule, ContentAnalysisResult
from app.models.kyc_document import KYCDocument
from app.models.kyc_info import KYCInfo
from app.models.shipping import SellerShippingProvider, ShippingCourier
from app.models.team_invite import TeamInvite
from app.models.violation import Violation

# Export Base.metadata for Alembic to use in migrations
metadata = Base.metadata
