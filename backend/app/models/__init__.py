# Canonical model import order for SQLAlchemy relationship resolution
from app.models.tenant import Tenant
from app.models.security.two_factor import TOTPSecret
from app.models.user import User
from app.models.customer import Customer
from app.models.address_book import AddressBook
from app.models.saved_payment_method import SavedPaymentMethod
from app.models.notification_preferences import NotificationPreferences
from app.models.seller_profile import SellerProfile
from app.models.product import Product
from app.models.product_variant import ProductVariant
from app.models.order import Order
from app.models.order_item import OrderItem
from app.models.order_channel_meta import OrderChannelMeta
from app.models.order_return import OrderReturn
from app.models.returns import ReturnRequest, ReturnItem
from app.models.cart import Cart
from app.models.conversation_event import ConversationEvent
from app.models.complaint import Complaint
from app.models.analytics import AnalyticsEvent, AnalyticsMetric, AnalyticsReport
from app.models.settings import SettingsDomain, Setting
from app.models.feature_flags.feature_flag import FeatureFlag, TenantFeatureFlagOverride
from app.models.admin import Role, RoleHierarchy, Permission, PermissionScope, RolePermission, AdminUser, AdminUserRole
from app.models.security.ip_allowlist import IPAllowlistEntry, IPAllowlistSetting, IPTemporaryBypass
from app.models.security.rate_limit import AccountLockout, LoginAttempt, RateLimitRule
from app.models.kyc_info import KYCInfo
from app.models.kyc_document import KYCDocument
from app.models.storefront import StorefrontConfig
from app.models.storefront_theme import StorefrontTheme
from app.models.theme_version import ThemeVersion
from app.models.storefront_asset import StorefrontAsset
from app.models.storefront_banner import StorefrontBanner
from app.models.storefront_component import StorefrontComponent
from app.models.storefront_draft import StorefrontDraft
from app.models.storefront_logo import StorefrontLogo
from app.models.storefront_page_template import StorefrontPageTemplate
from app.models.storefront_permission import StorefrontPermission
from app.models.storefront_version import StorefrontVersion
from app.models.behavior_analysis import BehaviorPattern, PatternDetection, Evidence
from app.models.content_filter import ContentFilterRule, ContentAnalysisResult
from app.models.violation import Violation
from app.db.models.payment import Payment
# WhatsAppOrderDetails removed in favor of OrderChannelMeta
