"""
Model Registry

This module provides a centralized place to register all models with SQLAlchemy's
metadata. It carefully orders the imports to prevent circular dependencies and
ensure foreign key references are satisfied during migrations.

This is used by Alembic to generate migrations with the correct table order.
"""
from app.app.db import Base

# Import core enums first (these don't depend on any models)
from app.app.models.core.enums import (
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
from app.app.models.tenant import Tenant  # Base tenant entity
from app.app.models.user import User  # Users aren't dependent on other entities
from app.app.models.customer import Customer  # Customer basic info

# 2. Then, models that depend on the base entities
from app.app.models.address_book import AddressBook  # Depends on Customer
from app.app.models.saved_payment_method import SavedPaymentMethod  # Depends on Customer
# Depends on Customer
from app.app.models.notification_preferences import NotificationPreferences
from app.app.models.seller_profile import SellerProfile  # Depends on Tenant and User
# Depends on Tenant, needs to come before Order
from app.app.models.product import Product

# 3. Then more complex entities that depend on multiple other entities
# Depends on Customer, Tenant, possibly Product
from app.app.models.order import Order
from app.app.models.order_item import OrderItem  # Depends on Order and Product
from app.app.models.order_channel_meta import OrderChannelMeta  # Depends on Order
from app.app.models.cart import Cart  # Depends on Customer and Product

# 4. Conversation and storefront entities
from app.app.models.conversation_event import ConversationEvent  # Messaging events
from app.app.models.conversation_history import ConversationHistory
from app.app.models.complaint import Complaint  # Customer complaints

# 5. Storefront-related models
from app.app.models.storefront import StorefrontConfig
from app.app.models.storefront_theme import StorefrontTheme
from app.app.models.storefront_asset import StorefrontAsset
from app.app.models.storefront_banner import StorefrontBanner
from app.app.models.storefront_component import StorefrontComponent
from app.app.models.storefront_draft import StorefrontDraft
from app.app.models.storefront_logo import StorefrontLogo
from app.app.models.storefront_page_template import StorefrontPageTemplate
from app.app.models.storefront_permission import StorefrontPermission
from app.app.models.storefront_version import StorefrontVersion

# 6. Other specialized models
from app.app.models.ai_config import AIConfig
from app.app.models.alert_config import AlertConfig
from app.app.models.audit.audit_log import AuditLog
from app.app.models.behavior_analysis import BehaviorPattern, PatternDetection, Evidence
from app.app.models.content_filter import ContentFilterRule, ContentAnalysisResult
from app.app.models.kyc_document import KYCDocument
from app.app.models.kyc_info import KYCInfo
from app.app.models.shipping import SellerShippingProvider, ShippingCourier
from app.app.models.team_invite import TeamInvite
from app.app.models.violation import Violation

# Export Base.metadata for Alembic to use in migrations
metadata = Base.metadata
