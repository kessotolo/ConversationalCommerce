from fastapi import APIRouter

from app.api.v1.endpoints import (
    storefront_editor_assets,
    storefront_editor_banners,
    storefront_editor_components,
    storefront_editor_drafts,
    storefront_editor_logos,
    storefront_editor_permissions,
    storefront_editor_versions,
    storefront_page_layout,
)

router = APIRouter(prefix="/storefronts")

# Include all storefront editor sub-routers
router.include_router(storefront_editor_drafts.router)
router.include_router(storefront_editor_versions.router)
router.include_router(storefront_editor_permissions.router)
router.include_router(storefront_editor_assets.router)
router.include_router(storefront_editor_banners.router)
router.include_router(storefront_editor_logos.router)
router.include_router(storefront_editor_components.router)
router.include_router(storefront_page_layout.router)
