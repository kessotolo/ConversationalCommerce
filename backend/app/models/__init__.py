# Canonical model import order for SQLAlchemy relationship resolution
from backend.app.models.tenant import Tenant
from backend.app.models.security.two_factor import TOTPSecret
from backend.app.models.user import User
from backend.app.models.customer import Customer
from backend.app.models.address_book import AddressBook
from backend.app.models.saved_payment_method import SavedPaymentMethod
from backend.app.models.notification_preferences import NotificationPreferences
from backend.app.models.seller_profile import SellerProfile
from backend.app.models.product import Product
from backend.app.models.product_variant import ProductVariant
from backend.app.models.order import Order
from backend.app.models.order_item import OrderItem
from backend.app.models.order_channel_meta import OrderChannelMeta
from backend.app.models.order_return import OrderReturn
from backend.app.models.returns import ReturnRequest, ReturnItem
from backend.app.models.cart import Cart
from backend.app.models.conversation_event import ConversationEvent
from backend.app.models.complaint import Complaint
from backend.app.models.analytics import AnalyticsEvent, AnalyticsMetric, AnalyticsReport
from backend.app.models.settings import SettingsDomain, Setting
from backend.app.models.feature_flags.feature_flag import FeatureFlag, TenantFeatureFlagOverride
from backend.app.models.admin import Role, RoleHierarchy, Permission, PermissionScope, RolePermission, AdminUser, AdminUserRole
from backend.app.models.security.ip_allowlist import IPAllowlistEntry, IPAllowlistSetting, IPTemporaryBypass
from backend.app.models.security.rate_limit import AccountLockout, LoginAttempt, RateLimitRule
from backend.app.models.kyc_info import KYCInfo
from backend.app.models.kyc_document import KYCDocument
from backend.app.models.storefront import StorefrontConfig
from backend.app.models.storefront_theme import StorefrontTheme
from backend.app.models.theme_version import ThemeVersion
from backend.app.models.storefront_asset import StorefrontAsset
from backend.app.models.storefront_banner import StorefrontBanner
from backend.app.models.storefront_component import StorefrontComponent
from backend.app.models.storefront_draft import StorefrontDraft
from backend.app.models.storefront_logo import StorefrontLogo
from backend.app.models.storefront_page_template import StorefrontPageTemplate
from backend.app.models.storefront_permission import StorefrontPermission
from backend.app.models.storefront_version import StorefrontVersion
from backend.app.models.behavior_analysis import BehaviorPattern, PatternDetection, Evidence
from backend.app.models.content_filter import ContentFilterRule, ContentAnalysisResult
from backend.app.models.violation import Violation
from backend.app.models.payment import Payment, PaymentAuditLog, ManualPaymentProof, ProviderConfiguration, PaymentSettings, RateLimitLog, PaymentSplitRule
from backend.app.models.payment_method import PaymentMethod
# WhatsAppOrderDetails removed in favor of OrderChannelMeta - using OrderChannelMeta for WhatsApp order tracking
