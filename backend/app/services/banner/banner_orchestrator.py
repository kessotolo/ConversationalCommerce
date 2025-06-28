from .banner_crud_service import create_banner, update_banner, delete_banner, get_banner, list_banners
from .banner_publish_service import publish_banner
from .banner_order_service import reorder_banners
from .banner_validation import validate_banner


async def orchestrate_create_banner(db, tenant_id, user_id, data):
    validate_banner(data)
    banner = await create_banner(db, tenant_id, user_id, **data)
    return banner


async def orchestrate_publish_banner(db, tenant_id, banner_id, user_id):
    return await publish_banner(db, tenant_id, banner_id, user_id)


async def orchestrate_reorder_banners(db, tenant_id, user_id, banner_order):
    return await reorder_banners(db, tenant_id, user_id, banner_order)

# ...add more orchestrator functions as needed
