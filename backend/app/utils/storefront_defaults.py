import uuid
from typing import Any, Dict, Optional

from backend.app.models.storefront import StorefrontConfig
from backend.app.utils.domain_validator import validate_subdomain

# Default color palette
DEFAULT_COLORS = {
    "primary": "#3f51b5",  # Indigo
    "secondary": "#f50057",  # Pink
    "accent": "#ff4081",  # Pink accent
    "background": "#ffffff",  # White
    "surface": "#f5f5f5",  # Light gray
    "error": "#f44336",  # Red
    "text": {
        "primary": "#212121",  # Almost black
        "secondary": "#757575",  # Medium gray
        "disabled": "#bdbdbd",  # Light gray
        "hint": "#9e9e9e",  # Gray
    },
}

# Default typography settings
DEFAULT_TYPOGRAPHY = {
    "fontFamily": "Inter, system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
    "headings": {
        "fontFamily": "Inter, system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
        "fontWeight": 600,
    },
    "body": {
        "fontFamily": "Inter, system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
        "fontWeight": 400,
        "fontSize": "16px",
        "lineHeight": 1.5,
    },
    "button": {
        "fontFamily": "Inter, system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
        "fontWeight": 500,
        "textTransform": "none",
    },
}

# Default layout settings
DEFAULT_LAYOUT = {
    "spacingUnit": 8,
    "containerWidth": {
        "small": "540px",
        "medium": "720px",
        "large": "960px",
        "xlarge": "1140px",
    },
    "breakpoints": {
        "xs": "0px",
        "sm": "600px",
        "md": "960px",
        "lg": "1280px",
        "xl": "1920px",
    },
}

# Default storefront components and their order
DEFAULT_LAYOUT_CONFIG = {
    "hero": {"enabled": True, "type": "banner", "content": []},
    "featured_products": {
        "enabled": True,
        "title": "Featured Products",
        "limit": 8,
        "layout": "grid",
    },
    "categories": {
        "enabled": True,
        "display_mode": "grid",
        "show_images": True,
        "columns": {"mobile": 2, "tablet": 3, "desktop": 4},
    },
    "about": {"enabled": True, "title": "About Us", "content": ""},
    "testimonials": {"enabled": False, "title": "Customer Reviews", "items": []},
    "contact": {
        "enabled": True,
        "title": "Contact Us",
        "show_map": False,
        "show_form": True,
    },
    "newsletter": {
        "enabled": True,
        "title": "Stay Updated",
        "description": "Subscribe to our newsletter for the latest updates and offers.",
    },
}

# Default theme settings
DEFAULT_THEME_SETTINGS = {
    "name": "Default",
    "colors": DEFAULT_COLORS,
    "typography": DEFAULT_TYPOGRAPHY,
    "layout": DEFAULT_LAYOUT,
    "components": {
        "header": {
            "style": "standard",
            "fixed": True,
            "transparent": False,
            "show_search": True,
            "show_cart": True,
        },
        "footer": {
            "style": "standard",
            "columns": 4,
            "show_payment_methods": True,
            "show_social_links": True,
            "show_newsletter": True,
        },
        "product_card": {
            "display_style": "standard",
            "show_rating": True,
            "show_price": True,
            "show_compare_at_price": True,
            "show_add_to_cart": True,
        },
        "product_page": {
            "layout": "standard",
            "gallery_style": "thumbnails",
            "show_related_products": True,
            "show_recently_viewed": True,
        },
    },
}


def create_default_storefront_config(
    tenant_id: uuid.UUID, tenant_name: str, custom_subdomain: Optional[str] = None
) -> StorefrontConfig:
    """
    Create a default StorefrontConfig for a new tenant.

    Args:
        tenant_id: UUID of the tenant
        tenant_name: Name of the tenant
        custom_subdomain: Optional custom subdomain; if not provided, will generate from tenant name

    Returns:
        A new StorefrontConfig instance with default settings
    """
    # Generate subdomain from tenant name if not provided
    if not custom_subdomain:
        # Convert tenant name to lowercase, replace spaces with hyphens, remove special chars
        subdomain = tenant_name.lower().replace(" ", "-")
        subdomain = "".join(c for c in subdomain if c.isalnum() or c == "-")

        # Ensure it doesn't start or end with hyphen
        subdomain = subdomain.strip("-")

        # Limit length to 63 characters (DNS limitation)
        if len(subdomain) > 63:
            subdomain = subdomain[:63]
    else:
        subdomain = custom_subdomain

    # Validate the subdomain
    is_valid, error = validate_subdomain(subdomain)
    if not is_valid:
        # If invalid, fall back to tenant_id-based subdomain
        subdomain = f"store-{str(tenant_id)[:8]}"

    # Create the storefront config
    return StorefrontConfig(
        tenant_id=tenant_id,
        subdomain_name=subdomain,
        meta_title=f"{tenant_name} | Online Store",
        meta_description=f"Welcome to {tenant_name}'s online store. Shop our products and enjoy great service.",
        theme_settings=DEFAULT_THEME_SETTINGS,
        layout_config=DEFAULT_LAYOUT_CONFIG,
        social_links={
            "whatsapp": "",
            "instagram": "",
            "facebook": "",
            "twitter": "",
            "tiktok": "",
        },
    )


def get_theme_variations() -> Dict[str, Dict[str, Any]]:
    """
    Get a list of pre-defined theme variations that tenants can choose from.

    Returns:
        Dictionary of theme variations with their settings
    """
    return {
        "default": DEFAULT_THEME_SETTINGS,
        "dark": {
            **DEFAULT_THEME_SETTINGS,
            "name": "Dark",
            "colors": {
                "primary": "#bb86fc",  # Purple
                "secondary": "#03dac6",  # Teal
                "accent": "#cf6679",  # Pink
                "background": "#121212",  # Very dark gray
                "surface": "#1e1e1e",  # Dark gray
                "error": "#cf6679",  # Pink
                "text": {
                    "primary": "#ffffff",  # White
                    "secondary": "#b0b0b0",  # Light gray
                    "disabled": "#6c6c6c",  # Medium gray
                    "hint": "#9e9e9e",  # Gray
                },
            },
        },
        "minimal": {
            **DEFAULT_THEME_SETTINGS,
            "name": "Minimal",
            "colors": {
                "primary": "#000000",  # Black
                "secondary": "#333333",  # Dark gray
                "accent": "#666666",  # Medium gray
                "background": "#ffffff",  # White
                "surface": "#f9f9f9",  # Very light gray
                "error": "#d32f2f",  # Red
                "text": {
                    "primary": "#212121",  # Almost black
                    "secondary": "#666666",  # Medium gray
                    "disabled": "#999999",  # Light gray
                    "hint": "#bbbbbb",  # Very light gray
                },
            },
            "components": {
                **DEFAULT_THEME_SETTINGS["components"],
                "header": {
                    "style": "minimal",
                    "fixed": True,
                    "transparent": True,
                    "show_search": True,
                    "show_cart": True,
                },
                "product_card": {
                    "display_style": "minimal",
                    "show_rating": False,
                    "show_price": True,
                    "show_compare_at_price": True,
                    "show_add_to_cart": False,
                },
            },
        },
    }
