#!/usr/bin/env python3
"""
RLS Migration Manager

This script provides comprehensive migration tools for Row Level Security (RLS)
deployment and legacy data upgrade paths. It handles tenant isolation,
data migration, and RLS policy management.

Phase 2 Track A: Migration implementation for RLS deployment and legacy data upgrade paths
"""

from app.services.security.merchant_data_isolation_service import MerchantDataIsolationService
from app.models.order import Order
from app.models.product import Product
from app.models.user import User
from app.models.tenant import Tenant
# DatabaseConfig import removed - not needed for migration script
from sqlalchemy.orm import sessionmaker
from sqlalchemy import text, select, func, and_, or_
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
import asyncio
import logging
import sys
import uuid
from pathlib import Path
from typing import Dict, Any, List, Optional, Tuple
from datetime import datetime

# Add the parent directory to Python path
sys.path.append(str(Path(__file__).parent.parent))


# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class RLSMigrationManager:
    """
    Comprehensive RLS migration manager for tenant isolation deployment.

    Handles:
    - Pre-migration validation and preparation
    - Legacy data analysis and migration
    - RLS policy deployment
    - Post-migration validation
    - Rollback capabilities
    """

    def __init__(self, database_url: str):
        """Initialize the migration manager."""
        self.database_url = database_url
        self.engine = create_async_engine(database_url)
        self.SessionLocal = sessionmaker(
            bind=self.engine,
            class_=AsyncSession,
            expire_on_commit=False
        )

    async def run_comprehensive_migration(self) -> Dict[str, Any]:
        """
        Execute the complete RLS migration process.

        Returns:
            Detailed migration results
        """
        results = {
            "started_at": datetime.utcnow().isoformat(),
            "phases": {},
            "validation": {},
            "rollback_available": True
        }

        try:
            # Phase 1: Pre-migration validation
            logger.info("Phase 1: Pre-migration validation")
            results["phases"]["validation"] = await self._validate_pre_migration()

            # Phase 2: Backup current state
            logger.info("Phase 2: Creating backup points")
            results["phases"]["backup"] = await self._create_backup_points()

            # Phase 3: Legacy data analysis and preparation
            logger.info("Phase 3: Legacy data analysis")
            results["phases"]["legacy_analysis"] = await self._analyze_legacy_data()

            # Phase 4: Tenant assignment for orphaned data
            logger.info("Phase 4: Tenant assignment")
            results["phases"]["tenant_assignment"] = await self._assign_orphaned_data()

            # Phase 5: Deploy RLS policies
            logger.info("Phase 5: RLS policy deployment")
            results["phases"]["rls_deployment"] = await self._deploy_rls_policies()

            # Phase 6: Validate RLS enforcement
            logger.info("Phase 6: RLS validation")
            results["phases"]["rls_validation"] = await self._validate_rls_enforcement()

            # Phase 7: Performance optimization
            logger.info("Phase 7: Performance optimization")
            results["phases"]["optimization"] = await self._optimize_rls_performance()

            results["completed_at"] = datetime.utcnow().isoformat()
            results["status"] = "success"
            logger.info("RLS migration completed successfully")

        except Exception as e:
            logger.error(f"Migration failed: {str(e)}")
            results["error"] = str(e)
            results["status"] = "failed"
            results["failed_at"] = datetime.utcnow().isoformat()

            # Attempt rollback
            try:
                logger.info("Attempting rollback...")
                results["rollback"] = await self._rollback_migration()
            except Exception as rollback_error:
                logger.error(f"Rollback failed: {str(rollback_error)}")
                results["rollback_error"] = str(rollback_error)

        return results

    async def _validate_pre_migration(self) -> Dict[str, Any]:
        """Validate system state before migration."""
        validation_results = {}

        async with self.SessionLocal() as db:
            # Check for existing tenants
            tenant_count = await db.scalar(select(func.count(Tenant.id)))
            validation_results["tenant_count"] = tenant_count

            # Check for data without tenant_id
            orphaned_users = await db.scalar(
                select(func.count(User.id)).where(User.tenant_id.is_(None))
            )
            orphaned_products = await db.scalar(
                select(func.count(Product.id)).where(
                    Product.tenant_id.is_(None))
            )
            orphaned_orders = await db.scalar(
                select(func.count(Order.id)).where(Order.tenant_id.is_(None))
            )

            validation_results["orphaned_data"] = {
                "users": orphaned_users,
                "products": orphaned_products,
                "orders": orphaned_orders,
                "total": orphaned_users + orphaned_products + orphaned_orders
            }

            # Check existing RLS policies
            existing_policies = await self._check_existing_rls_policies(db)
            validation_results["existing_rls"] = existing_policies

            # Validate data integrity
            integrity_issues = await self._check_data_integrity(db)
            validation_results["integrity_issues"] = integrity_issues

        return validation_results

    async def _create_backup_points(self) -> Dict[str, Any]:
        """Create backup points for rollback capability."""
        backup_results = {}

        async with self.SessionLocal() as db:
            # Create backup tables for critical data
            backup_tables = [
                "users", "products", "orders", "tenants",
                "team_members", "settings", "storefront_configs"
            ]

            for table in backup_tables:
                try:
                    # Create backup table
                    backup_table_name = f"{table}_backup_{int(datetime.utcnow().timestamp())}"
                    await db.execute(text(
                        f"CREATE TABLE {backup_table_name} AS SELECT * FROM {table}"
                    ))
                    backup_results[table] = backup_table_name
                    logger.info(f"Created backup table: {backup_table_name}")
                except Exception as e:
                    backup_results[table] = f"failed: {str(e)}"

            await db.commit()

        return backup_results

    async def _analyze_legacy_data(self) -> Dict[str, Any]:
        """Analyze legacy data patterns for migration strategy."""
        analysis_results = {}

        async with self.SessionLocal() as db:
            # Analyze user distribution
            user_analysis = await db.execute(text("""
                SELECT
                    CASE WHEN tenant_id IS NULL THEN 'orphaned' ELSE 'assigned' END as status,
                    COUNT(*) as count
                FROM users
                GROUP BY CASE WHEN tenant_id IS NULL THEN 'orphaned' ELSE 'assigned' END
            """))
            analysis_results["user_distribution"] = {
                row[0]: row[1] for row in user_analysis.fetchall()
            }

            # Analyze product ownership patterns
            product_analysis = await db.execute(text("""
                SELECT
                    CASE WHEN tenant_id IS NULL THEN 'orphaned' ELSE 'assigned' END as status,
                    COUNT(*) as count,
                    COALESCE(SUM(CASE WHEN is_active THEN 1 ELSE 0 END), 0) as active_count
                FROM products
                GROUP BY CASE WHEN tenant_id IS NULL THEN 'orphaned' ELSE 'assigned' END
            """))
            analysis_results["product_distribution"] = {
                f"{row[0]}_total": row[1] for row in product_analysis.fetchall()
            }

            # Analyze order relationships
            order_analysis = await db.execute(text("""
                SELECT
                    CASE WHEN o.tenant_id IS NULL THEN 'orphaned' ELSE 'assigned' END as status,
                    COUNT(*) as order_count,
                    COUNT(DISTINCT o.user_id) as unique_users,
                    COALESCE(SUM(o.total_amount), 0) as total_value
                FROM orders o
                GROUP BY CASE WHEN o.tenant_id IS NULL THEN 'orphaned' ELSE 'assigned' END
            """))
            analysis_results["order_distribution"] = {
                f"{row[0]}_orders": row[1] for row in order_analysis.fetchall()
            }

        return analysis_results

    async def _assign_orphaned_data(self) -> Dict[str, Any]:
        """Assign orphaned data to appropriate tenants."""
        assignment_results = {}

        async with self.SessionLocal() as db:
            # Get or create default tenant for orphaned data
            default_tenant = await self._get_or_create_default_tenant(db)
            assignment_results["default_tenant_id"] = str(default_tenant.id)

            # Assign orphaned users
            orphaned_users_result = await db.execute(text("""
                UPDATE users
                SET tenant_id = :tenant_id, updated_at = NOW()
                WHERE tenant_id IS NULL
                RETURNING id
            """), {"tenant_id": default_tenant.id})
            assigned_users = len(orphaned_users_result.fetchall())
            assignment_results["assigned_users"] = assigned_users

            # Assign orphaned products
            orphaned_products_result = await db.execute(text("""
                UPDATE products
                SET tenant_id = :tenant_id, updated_at = NOW()
                WHERE tenant_id IS NULL
                RETURNING id
            """), {"tenant_id": default_tenant.id})
            assigned_products = len(orphaned_products_result.fetchall())
            assignment_results["assigned_products"] = assigned_products

            # Assign orphaned orders (more complex - try to infer from user relationships)
            await self._smart_assign_orphaned_orders(db, default_tenant.id)

            await db.commit()

        return assignment_results

    async def _smart_assign_orphaned_orders(self, db: AsyncSession, default_tenant_id: uuid.UUID):
        """Intelligently assign orphaned orders based on user relationships."""
        # Try to assign orders based on user tenant
        await db.execute(text("""
            UPDATE orders
            SET tenant_id = u.tenant_id, updated_at = NOW()
            FROM users u
            WHERE orders.user_id = u.id
            AND orders.tenant_id IS NULL
            AND u.tenant_id IS NOT NULL
        """))

        # Assign remaining orphaned orders to default tenant
        await db.execute(text("""
            UPDATE orders
            SET tenant_id = :tenant_id, updated_at = NOW()
            WHERE tenant_id IS NULL
        """), {"tenant_id": default_tenant_id})

    async def _deploy_rls_policies(self) -> Dict[str, Any]:
        """Deploy RLS policies for all tenant-scoped tables."""
        deployment_results = {}

        async with self.SessionLocal() as db:
            isolation_service = MerchantDataIsolationService(db)

            try:
                # Enable RLS policies
                rls_results = await isolation_service.enable_rls_policies()
                deployment_results["rls_policies"] = rls_results

                # Create tenant context functions
                await self._create_tenant_context_functions(db)
                deployment_results["context_functions"] = "created"

                # Create RLS-aware indexes for performance
                await self._create_rls_indexes(db)
                deployment_results["rls_indexes"] = "created"

                await db.commit()

            except Exception as e:
                await db.rollback()
                deployment_results["error"] = str(e)
                raise

        return deployment_results

    async def _create_tenant_context_functions(self, db: AsyncSession):
        """Create PostgreSQL functions for tenant context management."""
        functions_sql = """
        -- Function to set tenant context
        CREATE OR REPLACE FUNCTION set_tenant_context(tenant_uuid UUID)
        RETURNS void AS $$
        BEGIN
            PERFORM set_config('app.current_tenant_id', tenant_uuid::text, true);
        END;
        $$ LANGUAGE plpgsql;

        -- Function to get current tenant context
        CREATE OR REPLACE FUNCTION get_tenant_context()
        RETURNS UUID AS $$
        BEGIN
            RETURN NULLIF(current_setting('app.current_tenant_id', true), '')::UUID;
        END;
        $$ LANGUAGE plpgsql;

        -- Function to clear tenant context
        CREATE OR REPLACE FUNCTION clear_tenant_context()
        RETURNS void AS $$
        BEGIN
            PERFORM set_config('app.current_tenant_id', '', true);
        END;
        $$ LANGUAGE plpgsql;

        -- Function to validate tenant access
        CREATE OR REPLACE FUNCTION validate_tenant_access(target_tenant_id UUID)
        RETURNS boolean AS $$
        DECLARE
            current_tenant UUID;
        BEGIN
            current_tenant := get_tenant_context();
            RETURN current_tenant IS NOT NULL AND current_tenant = target_tenant_id;
        END;
        $$ LANGUAGE plpgsql;
        """

        await db.execute(text(functions_sql))

    async def _create_rls_indexes(self, db: AsyncSession):
        """Create indexes optimized for RLS queries."""
        indexes_sql = """
        -- Optimized indexes for RLS tenant filtering
        CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_tenant_id_active
        ON users(tenant_id) WHERE is_active = true;

        CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_tenant_id_active
        ON products(tenant_id) WHERE is_active = true;

        CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_tenant_id_status
        ON orders(tenant_id, status);

        CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_team_members_tenant_id_active
        ON team_members(tenant_id) WHERE is_active = true;

        -- Composite indexes for common query patterns
        CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_tenant_user_date
        ON orders(tenant_id, user_id, created_at);

        CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_tenant_category
        ON products(tenant_id, category) WHERE is_active = true;
        """

        await db.execute(text(indexes_sql))

    async def _validate_rls_enforcement(self) -> Dict[str, Any]:
        """Validate that RLS policies are properly enforcing tenant isolation."""
        validation_results = {}

        async with self.SessionLocal() as db:
            # Get test tenants
            tenants = await db.execute(select(Tenant).limit(2))
            tenant_list = list(tenants.scalars())

            if len(tenant_list) < 2:
                validation_results["warning"] = "Need at least 2 tenants for proper validation"
                return validation_results

            tenant_a, tenant_b = tenant_list[:2]

            # Test tenant isolation
            isolation_tests = {}

            # Test 1: Verify tenant A can only see their data
            await db.execute(text("SELECT set_tenant_context(:tenant_id)"),
                             {"tenant_id": tenant_a.id})

            tenant_a_users = await db.scalar(select(func.count(User.id)))
            tenant_a_products = await db.scalar(select(func.count(Product.id)))
            tenant_a_orders = await db.scalar(select(func.count(Order.id)))

            isolation_tests[f"tenant_{tenant_a.id}"] = {
                "users": tenant_a_users,
                "products": tenant_a_products,
                "orders": tenant_a_orders
            }

            # Test 2: Verify tenant B can only see their data
            await db.execute(text("SELECT set_tenant_context(:tenant_id)"),
                             {"tenant_id": tenant_b.id})

            tenant_b_users = await db.scalar(select(func.count(User.id)))
            tenant_b_products = await db.scalar(select(func.count(Product.id)))
            tenant_b_orders = await db.scalar(select(func.count(Order.id)))

            isolation_tests[f"tenant_{tenant_b.id}"] = {
                "users": tenant_b_users,
                "products": tenant_b_products,
                "orders": tenant_b_orders
            }

            # Test 3: Verify no cross-tenant data leakage
            await db.execute(text("SELECT clear_tenant_context()"))

            total_users = await db.scalar(select(func.count(User.id)))
            total_products = await db.scalar(select(func.count(Product.id)))
            total_orders = await db.scalar(select(func.count(Order.id)))

            validation_results["isolation_tests"] = isolation_tests
            validation_results["totals_without_context"] = {
                "users": total_users,
                "products": total_products,
                "orders": total_orders
            }

            # RLS should block access when no tenant context is set
            validation_results["rls_blocking"] = {
                "users_blocked": total_users == 0,
                "products_blocked": total_products == 0,
                "orders_blocked": total_orders == 0
            }

        return validation_results

    async def _optimize_rls_performance(self) -> Dict[str, Any]:
        """Optimize database performance for RLS queries."""
        optimization_results = {}

        async with self.SessionLocal() as db:
            # Update table statistics
            await db.execute(text("ANALYZE users, products, orders, tenants"))
            optimization_results["statistics_updated"] = True

            # Create materialized views for common queries
            await self._create_performance_views(db)
            optimization_results["performance_views"] = "created"

            await db.commit()

        return optimization_results

    async def _create_performance_views(self, db: AsyncSession):
        """Create materialized views for performance optimization."""
        views_sql = """
        -- Tenant summary view for dashboard performance
        CREATE MATERIALIZED VIEW IF NOT EXISTS tenant_summary AS
        SELECT
            t.id as tenant_id,
            t.name as tenant_name,
            COALESCE(user_stats.user_count, 0) as user_count,
            COALESCE(product_stats.product_count, 0) as product_count,
            COALESCE(order_stats.order_count, 0) as order_count,
            COALESCE(order_stats.total_revenue, 0) as total_revenue
        FROM tenants t
        LEFT JOIN (
            SELECT tenant_id, COUNT(*) as user_count
            FROM users WHERE is_active = true
            GROUP BY tenant_id
        ) user_stats ON t.id = user_stats.tenant_id
        LEFT JOIN (
            SELECT tenant_id, COUNT(*) as product_count
            FROM products WHERE is_active = true
            GROUP BY tenant_id
        ) product_stats ON t.id = product_stats.tenant_id
        LEFT JOIN (
            SELECT tenant_id, COUNT(*) as order_count, SUM(total_amount) as total_revenue
            FROM orders
            GROUP BY tenant_id
        ) order_stats ON t.id = order_stats.tenant_id;

        -- Create indexes on the materialized view
        CREATE UNIQUE INDEX IF NOT EXISTS idx_tenant_summary_tenant_id
        ON tenant_summary(tenant_id);
        """

        await db.execute(text(views_sql))

    async def _get_or_create_default_tenant(self, db: AsyncSession) -> Tenant:
        """Get or create a default tenant for orphaned data."""
        # Try to find existing default tenant
        default_tenant = await db.scalar(
            select(Tenant).where(Tenant.subdomain == "legacy-data")
        )

        if not default_tenant:
            # Create default tenant
            default_tenant = Tenant(
                id=uuid.uuid4(),
                name="Legacy Data Tenant",
                subdomain="legacy-data",
                domain="legacy-data.enwhe.io",
                is_active=True,
                description="Default tenant for legacy data migration"
            )
            db.add(default_tenant)
            await db.flush()

        return default_tenant

    async def _check_existing_rls_policies(self, db: AsyncSession) -> Dict[str, Any]:
        """Check for existing RLS policies."""
        policy_check = await db.execute(text("""
            SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
            FROM pg_policies
            WHERE schemaname = 'public'
        """))

        return {
            "existing_policies": [
                {
                    "table": row[1],
                    "policy": row[2],
                    "command": row[5]
                }
                for row in policy_check.fetchall()
            ]
        }

    async def _check_data_integrity(self, db: AsyncSession) -> List[Dict[str, Any]]:
        """Check for data integrity issues before migration."""
        issues = []

        # Check for foreign key violations
        fk_check = await db.execute(text("""
            SELECT
                'orders' as table_name,
                'user_id' as column_name,
                COUNT(*) as violation_count
            FROM orders o
            LEFT JOIN users u ON o.user_id = u.id
            WHERE o.user_id IS NOT NULL AND u.id IS NULL
            HAVING COUNT(*) > 0
        """))

        fk_violations = fk_check.fetchall()
        if fk_violations:
            issues.append({
                "type": "foreign_key_violation",
                "details": [
                    {"table": row[0], "column": row[1], "count": row[2]}
                    for row in fk_violations
                ]
            })

        return issues

    async def _rollback_migration(self) -> Dict[str, Any]:
        """Rollback RLS migration if something goes wrong."""
        rollback_results = {}

        async with self.SessionLocal() as db:
            isolation_service = MerchantDataIsolationService(db)

            try:
                # Disable RLS policies
                disable_results = await isolation_service.disable_rls_policies()
                rollback_results["rls_disabled"] = disable_results

                # Drop tenant context functions
                await db.execute(text("""
                    DROP FUNCTION IF EXISTS set_tenant_context(UUID);
                    DROP FUNCTION IF EXISTS get_tenant_context();
                    DROP FUNCTION IF EXISTS clear_tenant_context();
                    DROP FUNCTION IF EXISTS validate_tenant_access(UUID);
                """))
                rollback_results["functions_dropped"] = True

                await db.commit()
                rollback_results["status"] = "success"

            except Exception as e:
                await db.rollback()
                rollback_results["error"] = str(e)
                rollback_results["status"] = "failed"

        return rollback_results

    async def generate_migration_report(self, results: Dict[str, Any]) -> str:
        """Generate a comprehensive migration report."""
        report = f"""
# RLS Migration Report
Generated: {datetime.utcnow().isoformat()}

## Migration Status: {results.get('status', 'unknown').upper()}

"""

        if results.get("status") == "success":
            report += "✅ **Migration completed successfully**\n\n"
        else:
            report += f"❌ **Migration failed**: {results.get('error', 'Unknown error')}\n\n"

        # Add phase results
        for phase_name, phase_results in results.get("phases", {}).items():
            report += f"### {phase_name.replace('_', ' ').title()}\n"
            if isinstance(phase_results, dict):
                for key, value in phase_results.items():
                    report += f"- **{key}**: {value}\n"
            else:
                report += f"- {phase_results}\n"
            report += "\n"

        # Add validation results
        if "validation" in results:
            report += "### Validation Summary\n"
            validation = results["validation"]
            if "rls_blocking" in validation:
                blocking = validation["rls_blocking"]
                report += f"- Users blocked: {'✅' if blocking.get('users_blocked') else '❌'}\n"
                report += f"- Products blocked: {'✅' if blocking.get('products_blocked') else '❌'}\n"
                report += f"- Orders blocked: {'✅' if blocking.get('orders_blocked') else '❌'}\n\n"

        return report

    async def cleanup(self):
        """Cleanup resources."""
        await self.engine.dispose()


async def main():
    """Main migration execution function."""
    import os
    from app.core.config import settings

    # Get database URL from environment or config
    database_url = os.getenv("DATABASE_URL") or settings.DATABASE_URL

    if not database_url:
        logger.error("DATABASE_URL not found in environment or settings")
        return

    # Convert to async URL if needed
    if not database_url.startswith("postgresql+asyncpg://"):
        database_url = database_url.replace(
            "postgresql://", "postgresql+asyncpg://")

    migration_manager = RLSMigrationManager(database_url)

    try:
        logger.info("Starting RLS migration process...")
        results = await migration_manager.run_comprehensive_migration()

        # Generate and save report
        report = await migration_manager.generate_migration_report(results)
        report_path = f"rls_migration_report_{int(datetime.utcnow().timestamp())}.md"

        with open(report_path, 'w') as f:
            f.write(report)

        logger.info(f"Migration report saved to: {report_path}")

        if results.get("status") == "success":
            logger.info("✅ RLS migration completed successfully!")
        else:
            logger.error(f"❌ RLS migration failed: {results.get('error')}")

    except Exception as e:
        logger.error(f"Migration process failed: {str(e)}")
    finally:
        await migration_manager.cleanup()


if __name__ == "__main__":
    asyncio.run(main())
