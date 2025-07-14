import pytest
from unittest.mock import AsyncMock, MagicMock
from app.services.storefront_config_service import (
    create_storefront_config,
    get_storefront_config,
    update_storefront_config,
)


@pytest.mark.asyncio
async def test_create_storefront_config_success():
    db = MagicMock()
    db.query().filter().first.side_effect = [
        MagicMock(name='Tenant'), None, None, None]
    db.add = MagicMock()
    db.commit = MagicMock()
    db.refresh = MagicMock()
    tenant_id = '123e4567-e89b-12d3-a456-426614174000'
    config = await create_storefront_config(db, tenant_id)
    assert config is not None
    db.add.assert_called()
    db.commit.assert_called()
    db.refresh.assert_called()


@pytest.mark.asyncio
async def test_get_storefront_config_returns_config():
    db = MagicMock()
    expected_config = MagicMock()
    db.query().filter().first.return_value = expected_config
    tenant_id = '123e4567-e89b-12d3-a456-426614174000'
    config = await get_storefront_config(db, tenant_id)
    assert config == expected_config


@pytest.mark.asyncio
async def test_update_storefront_config_raises_on_missing():
    db = MagicMock()
    db.query().filter().first.return_value = None
    tenant_id = '123e4567-e89b-12d3-a456-426614174000'
    with pytest.raises(Exception):
        await update_storefront_config(db, tenant_id, version=1)
