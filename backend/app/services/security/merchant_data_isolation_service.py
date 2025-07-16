"""
Merchant Data Isolation Service.

This service provides comprehensive data isolation and RLS (Row Level Security)
enhancements to ensure complete tenant separation for all business operations.

Phase 2 Track A: Implement proper data isolation and RLS per merchant
"""

import uuid
from typing import Dict, Any, List, Optional, Set, Tuple
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text, select, func, and_
from fastapi import HTTPException, status

from app.models.tenant import Tenant
from app.models.user import User
from app.models.product import Product
from app.models.order import Order
from app.models.team_member import TeamMember
from app.models.settings import Setting, SettingsDomain
from app.models.storefront import StorefrontConfig
from app.core.exceptions import ValidationError, AuthorizationError


class MerchantDataIsolationService:
    """
    Service for enforcing merchant-specific data isolation and RLS policies.

    Ensures that all data access is properly scoped to the correct tenant
    and provides utilities for validating and enforcing data isolation.
    """

    # Models that require tenant isolation
    TENANT_SCOPED_MODELS = {
        "users": {
            "table": "users",
            "tenant_column": "tenant_id",
            "policy_name": "tenant_isolation_users"
        },
        "products": {
            "table": "products",
            "tenant_column": "tenant_id",
            "policy_name": "tenant_isolation_products"
        },
        "orders": {
            "table": "orders",
            "tenant_column": "tenant_id",
            "policy_name": "tenant_isolation_orders"
        },
        "order_items": {
            "table": "order_items",
            "tenant_column": "tenant_id",
            "policy_name": "tenant_isolation_order_items"
        },
        "carts": {
            "table": "carts",
            "tenant_column": "tenant_id",
            "policy_name": "tenant_isolation_carts"
        },
        "team_members": {
            "table": "team_members",
            "tenant_column": "tenant_id",
            "policy_name": "tenant_isolation_team_members"
        },
        "settings": {
            "table": "settings",
            "tenant_column": "tenant_id",
            "policy_name": "tenant_isolation_settings"
        },
        "settings_domains": {
            "table": "settings_domains",
            "tenant_column": "tenant_id",
            "policy_name": "tenant_isolation_settings_domains"
        },
        "storefront_configs": {
            "table": "storefront_configs",
            "tenant_column": "tenant_id",
            "policy_name": "tenant_isolation_storefront_configs"
        },
        "storefront_permissions": {
            "table": "storefront_permissions",
            "tenant_column": "tenant_id",
            "policy_name": "tenant_isolation_storefront_permissions"
        },
        "kyc_info": {
            "table": "kyc_info",
            "tenant_column": "tenant_id",
            "policy_name": "tenant_isolation_kyc_info"
        },
        "kyc_documents": {
            "table": "kyc_documents",
            "tenant_column": "tenant_id",
            "policy_name": "tenant_isolation_kyc_documents"
        },
        "conversation_events": {
            "table": "conversation_events",
            "tenant_column": "tenant_id",
            "policy_name": "tenant_isolation_conversation_events"
        },
        "analytics_events": {
            "table": "analytics_events",
            "tenant_column": "tenant_id",
            "policy_name": "tenant_isolation_analytics_events"
        },
        "analytics_metrics": {
            "table": "analytics_metrics",
            "tenant_column": "tenant_id",
            "policy_name": "tenant_isolation_analytics_metrics"
        },
        "analytics_reports": {
            "table": "analytics_reports",
            "tenant_column": "tenant_id",
            "policy_name": "tenant_isolation_analytics_reports"
        }
    }

    def __init__(self, db: AsyncSession):
        self.db = db

    async def validate_tenant_access(
        self,
        tenant_id: uuid.UUID,
        user_id: str,
        required_roles: Optional[List[str]] = None
    ) -> bool:
        """
        Validate that a user has access to a specific tenant.

        Args:
            tenant_id: Tenant ID to validate access for
            user_id: User ID requesting access
            required_roles: Optional list of required roles

        Returns:
            True if access is allowed, False otherwise
        """
        # Get tenant
        tenant_query = select(Tenant).where(Tenant.id == tenant_id)
        tenant_result = await self.db.execute(tenant_query)
        tenant = tenant_result.scalar_one_or_none()

        if not tenant:
            return False

        if not tenant.is_active:
            return False

        # Get user
        user_query = select(User).where(User.id == user_id)
        user_result = await self.db.execute(user_query)
        user = user_result.scalar_one_or_none()

        if not user:
            return False

        # Check if user belongs to tenant
        if user.tenant_id == tenant_id:
            return True

        # Check if user has team member access
        team_query = select(TeamMember).where(
            and_(
                TeamMember.tenant_id == tenant_id,
                TeamMember.user_id == user.id,
                TeamMember.is_active == True
            )
        )
        team_result = await self.db.execute(team_query)
        team_member = team_result.scalar_one_or_none()

        if team_member:
            if required_roles:
                return team_member.role.value in required_roles
            return True

        return False

    async def set_tenant_context(self, tenant_id: uuid.UUID) -> None:
        """
        Set the tenant context for the current database session.
        This enables RLS policies to filter data appropriately.

        Args:
            tenant_id: Tenant ID to set as context
        """
        # Set the tenant context variable for RLS policies
        await self.db.execute(
            text("SET LOCAL app.current_tenant_id = :tenant_id"),
            {"tenant_id": str(tenant_id)}
        )

    async def clear_tenant_context(self) -> None:
        """Clear the tenant context for the current database session."""
        await self.db.execute(text("SET LOCAL app.current_tenant_id = ''"))

    async def enable_rls_policies(self) -> Dict[str, Any]:
        """
        Enable RLS policies for all tenant-scoped tables.

        Returns:
            Dictionary containing the status of policy creation
        """
        results = {}

        for model_name, config in self.TENANT_SCOPED_MODELS.items():
            try:
                # Enable RLS on the table
                await self.db.execute(
                    text(
                        f"ALTER TABLE {config['table']} ENABLE ROW LEVEL SECURITY")
                )

                # Drop existing policy if it exists
                await self.db.execute(
                    text(
                        f"DROP POLICY IF EXISTS {config['policy_name']} ON {config['table']}")
                )

                # Create the RLS policy
                policy_sql = f"""
                CREATE POLICY {config['policy_name']} ON {config['table']}
                FOR ALL
                TO public
                USING ({config['tenant_column']} = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
                WITH CHECK ({config['tenant_column']} = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
                """

                await self.db.execute(text(policy_sql))
                results[model_name] = "success"

            except Exception as e:
                results[model_name] = f"error: {str(e)}"

        await self.db.commit()
        return results

    async def disable_rls_policies(self) -> Dict[str, Any]:
        """
        Disable RLS policies for all tenant-scoped tables.

        Returns:
            Dictionary containing the status of policy removal
        """
        results = {}

        for model_name, config in self.TENANT_SCOPED_MODELS.items():
            try:
                # Drop the policy
                await self.db.execute(
                    text(
                        f"DROP POLICY IF EXISTS {config['policy_name']} ON {config['table']}")
                )

                # Disable RLS on the table
                await self.db.execute(
                    text(
                        f"ALTER TABLE {config['table']} DISABLE ROW LEVEL SECURITY")
                )

                results[model_name] = "success"

            except Exception as e:
                results[model_name] = f"error: {str(e)}"

        await self.db.commit()
        return results

    async def verify_tenant_isolation(
        self,
        tenant1_id: uuid.UUID,
        tenant2_id: uuid.UUID
    ) -> Dict[str, Any]:
        """
        Verify that tenant isolation is working correctly by testing data access.

        Args:
            tenant1_id: First tenant ID for testing
            tenant2_id: Second tenant ID for testing

        Returns:
            Dictionary containing verification results
        """
        results = {
            "tenant1_isolation": {},
            "tenant2_isolation": {},
            "cross_tenant_access": {},
            "overall_status": "unknown"
        }

        try:
            # Set context to tenant 1 and verify data access
            await self.set_tenant_context(tenant1_id)

            # Test product access for tenant 1
            products_query = select(func.count(Product.id)).where(
                Product.tenant_id == tenant1_id)
            tenant1_products = await self.db.execute(products_query)
            results["tenant1_isolation"]["products"] = tenant1_products.scalar()

            # Test order access for tenant 1
            orders_query = select(func.count(Order.id)).where(
                Order.tenant_id == tenant1_id)
            tenant1_orders = await self.db.execute(orders_query)
            results["tenant1_isolation"]["orders"] = tenant1_orders.scalar()

            # Try to access tenant 2 data while in tenant 1 context
            tenant2_products_query = select(func.count(Product.id)).where(
                Product.tenant_id == tenant2_id)
            cross_products = await self.db.execute(tenant2_products_query)
            results["cross_tenant_access"]["tenant2_products_from_tenant1"] = cross_products.scalar()

            # Set context to tenant 2 and verify data access
            await self.set_tenant_context(tenant2_id)

            # Test product access for tenant 2
            products_query = select(func.count(Product.id)).where(
                Product.tenant_id == tenant2_id)
            tenant2_products = await self.db.execute(products_query)
            results["tenant2_isolation"]["products"] = tenant2_products.scalar()

            # Test order access for tenant 2
            orders_query = select(func.count(Order.id)).where(
                Order.tenant_id == tenant2_id)
            tenant2_orders = await self.db.execute(orders_query)
            results["tenant2_isolation"]["orders"] = tenant2_orders.scalar()

            # Try to access tenant 1 data while in tenant 2 context
            tenant1_products_query = select(func.count(Product.id)).where(
                Product.tenant_id == tenant1_id)
            cross_products = await self.db.execute(tenant1_products_query)
            results["cross_tenant_access"]["tenant1_products_from_tenant2"] = cross_products.scalar()

            # Clear context
            await self.clear_tenant_context()

            # Determine overall status
            cross_access_count = (
                results["cross_tenant_access"]["tenant2_products_from_tenant1"] +
                results["cross_tenant_access"]["tenant1_products_from_tenant2"]
            )

            if cross_access_count == 0:
                results["overall_status"] = "secure"
            else:
                results["overall_status"] = "vulnerable"

        except Exception as e:
            results["error"] = str(e)
            results["overall_status"] = "error"

        return results

    async def audit_tenant_data_access(
        self,
        tenant_id: uuid.UUID,
        user_id: str,
        operation: str,
        table_name: str,
        record_id: Optional[str] = None
    ) -> None:
        """
        Audit data access operations for compliance and security monitoring.

        Args:
            tenant_id: Tenant ID for the operation
            user_id: User performing the operation
            operation: Type of operation (SELECT, INSERT, UPDATE, DELETE)
            table_name: Table being accessed
            record_id: Optional specific record ID
        """
        # This would integrate with an audit logging system
        # For now, we'll create a simple log entry
        audit_data = {
            "tenant_id": str(tenant_id),
            "user_id": user_id,
            "operation": operation,
            "table_name": table_name,
            "record_id": record_id,
            "timestamp": "NOW()",
            "ip_address": None,  # Would be populated from request context
            "user_agent": None   # Would be populated from request context
        }

        # In a production system, this would be written to an audit table
        # or sent to a logging service
        print(f"AUDIT: {audit_data}")

    async def enforce_tenant_data_constraints(self) -> Dict[str, Any]:
        """
        Add database constraints to enforce tenant data isolation.

        Returns:
            Dictionary containing constraint creation results
        """
        results = {}

        constraints = [
            # Ensure users belong to valid tenants
            {
                "name": "fk_users_tenant_id",
                "table": "users",
                "sql": "ALTER TABLE users ADD CONSTRAINT fk_users_tenant_id FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE"
            },
            # Ensure products belong to valid tenants
            {
                "name": "fk_products_tenant_id",
                "table": "products",
                "sql": "ALTER TABLE products ADD CONSTRAINT fk_products_tenant_id FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE"
            },
            # Ensure orders belong to valid tenants
            {
                "name": "fk_orders_tenant_id",
                "table": "orders",
                "sql": "ALTER TABLE orders ADD CONSTRAINT fk_orders_tenant_id FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE"
            },
            # Ensure team members belong to valid tenants
            {
                "name": "fk_team_members_tenant_id",
                "table": "team_members",
                "sql": "ALTER TABLE team_members ADD CONSTRAINT fk_team_members_tenant_id FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE"
            }
        ]

        for constraint in constraints:
            try:
                await self.db.execute(text(constraint["sql"]))
                results[constraint["name"]] = "success"
            except Exception as e:
                # Constraint might already exist
                if "already exists" in str(e).lower():
                    results[constraint["name"]] = "already_exists"
                else:
                    results[constraint["name"]] = f"error: {str(e)}"

        await self.db.commit()
        return results

    async def validate_data_isolation_compliance(self) -> Dict[str, Any]:
        """
        Validate that all tenant-scoped data is properly isolated.

        Returns:
            Dictionary containing compliance validation results
        """
        results = {
            "compliant_tables": [],
            "non_compliant_tables": [],
            "missing_tenant_columns": [],
            "missing_constraints": [],
            "overall_compliance": False
        }

        for model_name, config in self.TENANT_SCOPED_MODELS.items():
            try:
                # Check if tenant column exists
                column_check_sql = f"""
                SELECT column_name
                FROM information_schema.columns
                WHERE table_name = '{config['table']}'
                AND column_name = '{config['tenant_column']}'
                """

                column_result = await self.db.execute(text(column_check_sql))
                has_tenant_column = column_result.fetchone() is not None

                if not has_tenant_column:
                    results["missing_tenant_columns"].append(config['table'])
                    continue

                # Check if RLS policy exists
                policy_check_sql = f"""
                SELECT policyname
                FROM pg_policies
                WHERE tablename = '{config['table']}'
                AND policyname = '{config['policy_name']}'
                """

                policy_result = await self.db.execute(text(policy_check_sql))
                has_policy = policy_result.fetchone() is not None

                if has_policy:
                    results["compliant_tables"].append(config['table'])
                else:
                    results["non_compliant_tables"].append(config['table'])

            except Exception as e:
                results["non_compliant_tables"].append(
                    f"{config['table']}: {str(e)}")

        # Calculate overall compliance
        total_tables = len(self.TENANT_SCOPED_MODELS)
        compliant_tables = len(results["compliant_tables"])
        results["compliance_percentage"] = (
            compliant_tables / total_tables * 100) if total_tables > 0 else 0
        results["overall_compliance"] = results["compliance_percentage"] >= 95

        return results

    async def create_tenant_isolation_migration(self) -> str:
        """
        Generate SQL migration script for tenant isolation.

        Returns:
            SQL migration script as string
        """
        migration_sql = """
-- Merchant Data Isolation Migration
-- Phase 2 Track A: Implement proper data isolation and RLS per merchant

BEGIN;

-- 1. Add tenant_id columns to tables that don't have them
DO $$
BEGIN
    -- Add tenant_id to users table if not exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'users' AND column_name = 'tenant_id') THEN
        ALTER TABLE users ADD COLUMN tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;
        CREATE INDEX IF NOT EXISTS idx_users_tenant_id ON users(tenant_id);
    END IF;

    -- Add tenant_id to products table if not exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'products' AND column_name = 'tenant_id') THEN
        ALTER TABLE products ADD COLUMN tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;
        CREATE INDEX IF NOT EXISTS idx_products_tenant_id ON products(tenant_id);
    END IF;

    -- Add tenant_id to orders table if not exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'orders' AND column_name = 'tenant_id') THEN
        ALTER TABLE orders ADD COLUMN tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;
        CREATE INDEX IF NOT EXISTS idx_orders_tenant_id ON orders(tenant_id);
    END IF;
END $$;

-- 2. Enable Row Level Security on all tenant-scoped tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings_domains ENABLE ROW LEVEL SECURITY;

-- 3. Create RLS policies for tenant isolation
"""

        # Add policies for each model
        for model_name, config in self.TENANT_SCOPED_MODELS.items():
            migration_sql += f"""
-- RLS Policy for {config['table']}
DROP POLICY IF EXISTS {config['policy_name']} ON {config['table']};
CREATE POLICY {config['policy_name']} ON {config['table']}
FOR ALL
TO public
USING ({config['tenant_column']} = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
WITH CHECK ({config['tenant_column']} = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

"""

        migration_sql += """
-- 4. Create function to set tenant context
CREATE OR REPLACE FUNCTION set_tenant_context(tenant_uuid UUID)
RETURNS void AS $$
BEGIN
    PERFORM set_config('app.current_tenant_id', tenant_uuid::text, true);
END;
$$ LANGUAGE plpgsql;

-- 5. Create function to clear tenant context
CREATE OR REPLACE FUNCTION clear_tenant_context()
RETURNS void AS $$
BEGIN
    PERFORM set_config('app.current_tenant_id', '', true);
END;
$$ LANGUAGE plpgsql;

COMMIT;
"""

        return migration_sql


# Factory function for creating merchant data isolation service
async def create_merchant_data_isolation_service(
    db: AsyncSession
) -> MerchantDataIsolationService:
    """
    Factory function to create a merchant data isolation service instance.

    Args:
        db: Database session

    Returns:
        MerchantDataIsolationService instance
    """
    return MerchantDataIsolationService(db)
