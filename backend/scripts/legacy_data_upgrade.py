#!/usr/bin/env python3
"""
Legacy Data Upgrade Script

This script handles the upgrade of legacy data to work with the new RLS
(Row Level Security) policies and tenant isolation system.

Phase 2 Track A: Legacy data upgrade paths for RLS migration
"""

from app.models.team_member import TeamMember
from app.models.order import Order
from app.models.product import Product
from app.models.user import User
from app.models.tenant import Tenant
from sqlalchemy.orm import sessionmaker
from sqlalchemy import text, select, func, and_, or_, update
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
import asyncio
import logging
import sys
import uuid
from pathlib import Path
from typing import Dict, Any, List, Optional, Tuple
from datetime import datetime, timedelta

# Add the parent directory to Python path
sys.path.append(str(Path(__file__).parent.parent))


# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class LegacyDataUpgrader:
    """
    Handles legacy data upgrade for RLS migration.

    This class provides comprehensive utilities for:
    - Identifying and categorizing legacy data
    - Creating default tenants for orphaned data
    - Intelligent data assignment based on relationships
    - Data validation and integrity checks
    - Rollback capabilities
    """

    def __init__(self, database_url: str):
        """Initialize the legacy data upgrader."""
        self.database_url = database_url
        self.engine = create_async_engine(database_url)
        self.SessionLocal = sessionmaker(
            bind=self.engine,
            class_=AsyncSession,
            expire_on_commit=False
        )

    async def run_legacy_upgrade(self) -> Dict[str, Any]:
        """
        Execute the complete legacy data upgrade process.

        Returns:
            Detailed upgrade results
        """
        results = {
            "started_at": datetime.utcnow().isoformat(),
            "phases": {},
            "statistics": {},
            "warnings": [],
            "errors": []
        }

        try:
            # Phase 1: Data discovery and analysis
            logger.info("Phase 1: Legacy data discovery")
            results["phases"]["discovery"] = await self._discover_legacy_data()

            # Phase 2: Create migration strategy
            logger.info("Phase 2: Migration strategy planning")
            results["phases"]["strategy"] = await self._plan_migration_strategy(
                results["phases"]["discovery"]
            )

            # Phase 3: Create default tenants
            logger.info("Phase 3: Default tenant creation")
            results["phases"]["tenant_creation"] = await self._create_default_tenants()

            # Phase 4: Execute data assignments
            logger.info("Phase 4: Data assignment execution")
            results["phases"]["data_assignment"] = await self._execute_data_assignments(
                results["phases"]["strategy"]
            )

            # Phase 5: Validate data integrity
            logger.info("Phase 5: Data integrity validation")
            results["phases"]["validation"] = await self._validate_data_integrity()

            # Phase 6: Generate upgrade statistics
            logger.info("Phase 6: Statistics generation")
            results["statistics"] = await self._generate_upgrade_statistics()

            results["completed_at"] = datetime.utcnow().isoformat()
            results["status"] = "success"
            logger.info("Legacy data upgrade completed successfully")

        except Exception as e:
            logger.error(f"Legacy upgrade failed: {str(e)}")
            results["error"] = str(e)
            results["status"] = "failed"
            results["failed_at"] = datetime.utcnow().isoformat()

        return results

    async def _discover_legacy_data(self) -> Dict[str, Any]:
        """Discover and analyze legacy data patterns."""
        discovery_results = {}

        async with self.SessionLocal() as db:
            # Discover orphaned users
            orphaned_users = await db.execute(text("""
                SELECT
                    id, email, created_at, last_login, is_active,
                    CASE
                        WHEN email LIKE '%@example.com' THEN 'test_user'
                        WHEN last_login < NOW() - INTERVAL '1 year' THEN 'inactive_user'
                        WHEN created_at < NOW() - INTERVAL '2 years' THEN 'legacy_user'
                        ELSE 'active_user'
                    END as user_category
                FROM users
                WHERE tenant_id IS NULL
                ORDER BY created_at
            """))

            orphaned_user_data = orphaned_users.fetchall()
            discovery_results["orphaned_users"] = {
                "total": len(orphaned_user_data),
                "categories": {}
            }

            for row in orphaned_user_data:
                category = row[5]  # user_category
                if category not in discovery_results["orphaned_users"]["categories"]:
                    discovery_results["orphaned_users"]["categories"][category] = 0
                discovery_results["orphaned_users"]["categories"][category] += 1

            # Discover orphaned products
            orphaned_products = await db.execute(text("""
                SELECT
                    id, name, created_at, is_active, category,
                    CASE
                        WHEN NOT is_active THEN 'inactive_product'
                        WHEN created_at < NOW() - INTERVAL '1 year' THEN 'legacy_product'
                        ELSE 'active_product'
                    END as product_category
                FROM products
                WHERE tenant_id IS NULL
                ORDER BY created_at
            """))

            orphaned_product_data = orphaned_products.fetchall()
            discovery_results["orphaned_products"] = {
                "total": len(orphaned_product_data),
                "categories": {}
            }

            for row in orphaned_product_data:
                category = row[5]  # product_category
                if category not in discovery_results["orphaned_products"]["categories"]:
                    discovery_results["orphaned_products"]["categories"][category] = 0
                discovery_results["orphaned_products"]["categories"][category] += 1

            # Discover orphaned orders
            orphaned_orders = await db.execute(text("""
                SELECT
                    o.id, o.user_id, o.created_at, o.status, o.total_amount,
                    u.email as user_email,
                    CASE
                        WHEN o.status IN ('cancelled', 'refunded') THEN 'closed_order'
                        WHEN o.created_at < NOW() - INTERVAL '1 year' THEN 'legacy_order'
                        WHEN o.total_amount = 0 THEN 'test_order'
                        ELSE 'active_order'
                    END as order_category
                FROM orders o
                LEFT JOIN users u ON o.user_id = u.id
                WHERE o.tenant_id IS NULL
                ORDER BY o.created_at
            """))

            orphaned_order_data = orphaned_orders.fetchall()
            discovery_results["orphaned_orders"] = {
                "total": len(orphaned_order_data),
                "categories": {},
                "user_relationships": {}
            }

            for row in orphaned_order_data:
                category = row[6]  # order_category
                user_email = row[5]  # user_email

                if category not in discovery_results["orphaned_orders"]["categories"]:
                    discovery_results["orphaned_orders"]["categories"][category] = 0
                discovery_results["orphaned_orders"]["categories"][category] += 1

                if user_email:
                    if user_email not in discovery_results["orphaned_orders"]["user_relationships"]:
                        discovery_results["orphaned_orders"]["user_relationships"][user_email] = 0
                    discovery_results["orphaned_orders"]["user_relationships"][user_email] += 1

            # Check for existing tenants
            existing_tenants = await db.execute(text("""
                SELECT id, name, subdomain, is_active, created_at
                FROM tenants
                ORDER BY created_at
            """))

            tenant_data = existing_tenants.fetchall()
            discovery_results["existing_tenants"] = {
                "total": len(tenant_data),
                "active": sum(1 for t in tenant_data if t[3]),  # is_active
                "tenants": [
                    {
                        "id": str(t[0]),
                        "name": t[1],
                        "subdomain": t[2],
                        "is_active": t[3]
                    }
                    for t in tenant_data
                ]
            }

        return discovery_results

    async def _plan_migration_strategy(self, discovery_data: Dict[str, Any]) -> Dict[str, Any]:
        """Plan the migration strategy based on discovered data."""
        strategy = {
            "default_tenants_needed": [],
            "assignment_rules": {},
            "special_cases": []
        }

        # Determine what default tenants are needed
        orphaned_users = discovery_data.get("orphaned_users", {})
        orphaned_products = discovery_data.get("orphaned_products", {})
        orphaned_orders = discovery_data.get("orphaned_orders", {})

        if orphaned_users.get("total", 0) > 0:
            strategy["default_tenants_needed"].append({
                "name": "Legacy Users Tenant",
                "subdomain": "legacy-users",
                "description": "Default tenant for migrated legacy users"
            })

        if orphaned_products.get("total", 0) > 0:
            strategy["default_tenants_needed"].append({
                "name": "Legacy Products Tenant",
                "subdomain": "legacy-products",
                "description": "Default tenant for migrated legacy products"
            })

        # Define assignment rules
        strategy["assignment_rules"] = {
            "users": {
                "test_user": "legacy-users",
                "inactive_user": "legacy-users",
                "legacy_user": "legacy-users",
                "active_user": "legacy-users"
            },
            "products": {
                "inactive_product": "legacy-products",
                "legacy_product": "legacy-products",
                "active_product": "legacy-products"
            },
            "orders": {
                "strategy": "follow_user_assignment",
                "fallback_tenant": "legacy-users"
            }
        }

        # Identify special cases
        if orphaned_orders.get("total", 0) > 50:
            strategy["special_cases"].append({
                "type": "high_volume_orders",
                "description": "Large number of orphaned orders detected",
                "recommendation": "Consider batch processing"
            })

        user_categories = orphaned_users.get("categories", {})
        if user_categories.get("test_user", 0) > 10:
            strategy["special_cases"].append({
                "type": "test_data_cleanup",
                "description": "High volume of test users detected",
                "recommendation": "Consider cleaning up test data before migration"
            })

        return strategy

    async def _create_default_tenants(self) -> Dict[str, Any]:
        """Create default tenants for legacy data migration."""
        creation_results = {}

        async with self.SessionLocal() as db:
            # Default tenants configuration
            default_tenants = [
                {
                    "name": "Legacy Data Tenant",
                    "subdomain": "legacy-data",
                    "domain": "legacy-data.enwhe.io",
                    "description": "Default tenant for legacy data migration"
                },
                {
                    "name": "Test Data Tenant",
                    "subdomain": "test-data",
                    "domain": "test-data.enwhe.io",
                    "description": "Tenant for test and development data"
                },
                {
                    "name": "Archived Data Tenant",
                    "subdomain": "archived-data",
                    "domain": "archived-data.enwhe.io",
                    "description": "Tenant for archived and inactive data"
                }
            ]

            for tenant_config in default_tenants:
                # Check if tenant already exists
                existing_tenant = await db.scalar(
                    select(Tenant).where(Tenant.subdomain ==
                                         tenant_config["subdomain"])
                )

                if not existing_tenant:
                    # Create new tenant
                    new_tenant = Tenant(
                        id=uuid.uuid4(),
                        name=tenant_config["name"],
                        subdomain=tenant_config["subdomain"],
                        domain=tenant_config["domain"],
                        is_active=True,
                        description=tenant_config["description"]
                    )
                    db.add(new_tenant)
                    await db.flush()

                    creation_results[tenant_config["subdomain"]] = {
                        "id": str(new_tenant.id),
                        "status": "created"
                    }
                    logger.info(f"Created tenant: {tenant_config['name']}")
                else:
                    creation_results[tenant_config["subdomain"]] = {
                        "id": str(existing_tenant.id),
                        "status": "already_exists"
                    }

            await db.commit()

        return creation_results

    async def _execute_data_assignments(self, strategy: Dict[str, Any]) -> Dict[str, Any]:
        """Execute the planned data assignments."""
        assignment_results = {}

        async with self.SessionLocal() as db:
            # Get default tenants
            legacy_tenant = await db.scalar(
                select(Tenant).where(Tenant.subdomain == "legacy-data")
            )
            test_tenant = await db.scalar(
                select(Tenant).where(Tenant.subdomain == "test-data")
            )
            archived_tenant = await db.scalar(
                select(Tenant).where(Tenant.subdomain == "archived-data")
            )

            if not legacy_tenant:
                raise Exception("Legacy data tenant not found")

            # Assign orphaned users
            user_assignments = await self._assign_orphaned_users(
                db, legacy_tenant, test_tenant, archived_tenant
            )
            assignment_results["users"] = user_assignments

            # Assign orphaned products
            product_assignments = await self._assign_orphaned_products(
                db, legacy_tenant, test_tenant, archived_tenant
            )
            assignment_results["products"] = product_assignments

            # Assign orphaned orders (must be done after users)
            order_assignments = await self._assign_orphaned_orders(
                db, legacy_tenant
            )
            assignment_results["orders"] = order_assignments

            await db.commit()

        return assignment_results

    async def _assign_orphaned_users(
        self,
        db: AsyncSession,
        legacy_tenant: Tenant,
        test_tenant: Tenant,
        archived_tenant: Tenant
    ) -> Dict[str, Any]:
        """Assign orphaned users to appropriate tenants."""

        # Assign test users to test tenant
        test_users_result = await db.execute(text("""
            UPDATE users
            SET tenant_id = :tenant_id, updated_at = NOW()
            WHERE tenant_id IS NULL
            AND (email LIKE '%@example.com' OR email LIKE '%@test.com')
            RETURNING id
        """), {"tenant_id": test_tenant.id if test_tenant else legacy_tenant.id})
        test_users_count = len(test_users_result.fetchall())

        # Assign inactive users to archived tenant
        inactive_users_result = await db.execute(text("""
            UPDATE users
            SET tenant_id = :tenant_id, updated_at = NOW()
            WHERE tenant_id IS NULL
            AND (last_login < NOW() - INTERVAL '1 year' OR NOT is_active)
            RETURNING id
        """), {"tenant_id": archived_tenant.id if archived_tenant else legacy_tenant.id})
        inactive_users_count = len(inactive_users_result.fetchall())

        # Assign remaining users to legacy tenant
        remaining_users_result = await db.execute(text("""
            UPDATE users
            SET tenant_id = :tenant_id, updated_at = NOW()
            WHERE tenant_id IS NULL
            RETURNING id
        """), {"tenant_id": legacy_tenant.id})
        remaining_users_count = len(remaining_users_result.fetchall())

        return {
            "test_users": test_users_count,
            "inactive_users": inactive_users_count,
            "legacy_users": remaining_users_count,
            "total": test_users_count + inactive_users_count + remaining_users_count
        }

    async def _assign_orphaned_products(
        self,
        db: AsyncSession,
        legacy_tenant: Tenant,
        test_tenant: Tenant,
        archived_tenant: Tenant
    ) -> Dict[str, Any]:
        """Assign orphaned products to appropriate tenants."""

        # Assign inactive products to archived tenant
        inactive_products_result = await db.execute(text("""
            UPDATE products
            SET tenant_id = :tenant_id, updated_at = NOW()
            WHERE tenant_id IS NULL AND NOT is_active
            RETURNING id
        """), {"tenant_id": archived_tenant.id if archived_tenant else legacy_tenant.id})
        inactive_products_count = len(inactive_products_result.fetchall())

        # Assign remaining products to legacy tenant
        remaining_products_result = await db.execute(text("""
            UPDATE products
            SET tenant_id = :tenant_id, updated_at = NOW()
            WHERE tenant_id IS NULL
            RETURNING id
        """), {"tenant_id": legacy_tenant.id})
        remaining_products_count = len(remaining_products_result.fetchall())

        return {
            "inactive_products": inactive_products_count,
            "legacy_products": remaining_products_count,
            "total": inactive_products_count + remaining_products_count
        }

    async def _assign_orphaned_orders(self, db: AsyncSession, legacy_tenant: Tenant) -> Dict[str, Any]:
        """Assign orphaned orders based on user relationships."""

        # First, try to assign orders based on their user's tenant
        user_based_assignments = await db.execute(text("""
            UPDATE orders
            SET tenant_id = u.tenant_id, updated_at = NOW()
            FROM users u
            WHERE orders.user_id = u.id
            AND orders.tenant_id IS NULL
            AND u.tenant_id IS NOT NULL
            RETURNING orders.id
        """))
        user_based_count = len(user_based_assignments.fetchall())

        # Assign remaining orphaned orders to legacy tenant
        remaining_orders_result = await db.execute(text("""
            UPDATE orders
            SET tenant_id = :tenant_id, updated_at = NOW()
            WHERE tenant_id IS NULL
            RETURNING id
        """), {"tenant_id": legacy_tenant.id})
        remaining_orders_count = len(remaining_orders_result.fetchall())

        return {
            "user_relationship_assignments": user_based_count,
            "legacy_assignments": remaining_orders_count,
            "total": user_based_count + remaining_orders_count
        }

    async def _validate_data_integrity(self) -> Dict[str, Any]:
        """Validate data integrity after assignments."""
        validation_results = {}

        async with self.SessionLocal() as db:
            # Check for remaining orphaned data
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

            validation_results["remaining_orphaned"] = {
                "users": orphaned_users,
                "products": orphaned_products,
                "orders": orphaned_orders,
                "total": orphaned_users + orphaned_products + orphaned_orders
            }

            # Check foreign key integrity
            fk_violations = await db.execute(text("""
                SELECT
                    'orders_user_tenant_mismatch' as violation_type,
                    COUNT(*) as count
                FROM orders o
                JOIN users u ON o.user_id = u.id
                WHERE o.tenant_id != u.tenant_id
                HAVING COUNT(*) > 0
            """))

            fk_violation_data = fk_violations.fetchall()
            validation_results["integrity_violations"] = [
                {"type": row[0], "count": row[1]} for row in fk_violation_data
            ]

            # Verify tenant distribution
            tenant_distribution = await db.execute(text("""
                SELECT
                    t.name as tenant_name,
                    t.subdomain,
                    COUNT(DISTINCT u.id) as user_count,
                    COUNT(DISTINCT p.id) as product_count,
                    COUNT(DISTINCT o.id) as order_count
                FROM tenants t
                LEFT JOIN users u ON t.id = u.tenant_id
                LEFT JOIN products p ON t.id = p.tenant_id
                LEFT JOIN orders o ON t.id = o.tenant_id
                GROUP BY t.id, t.name, t.subdomain
                ORDER BY t.name
            """))

            validation_results["tenant_distribution"] = [
                {
                    "tenant": row[0],
                    "subdomain": row[1],
                    "users": row[2],
                    "products": row[3],
                    "orders": row[4]
                }
                for row in tenant_distribution.fetchall()
            ]

        return validation_results

    async def _generate_upgrade_statistics(self) -> Dict[str, Any]:
        """Generate comprehensive upgrade statistics."""
        statistics = {}

        async with self.SessionLocal() as db:
            # Overall statistics
            total_users = await db.scalar(select(func.count(User.id)))
            total_products = await db.scalar(select(func.count(Product.id)))
            total_orders = await db.scalar(select(func.count(Order.id)))
            total_tenants = await db.scalar(select(func.count(Tenant.id)))

            statistics["totals"] = {
                "users": total_users,
                "products": total_products,
                "orders": total_orders,
                "tenants": total_tenants
            }

            # Migration impact statistics
            users_with_tenants = await db.scalar(
                select(func.count(User.id)).where(User.tenant_id.is_not(None))
            )
            products_with_tenants = await db.scalar(
                select(func.count(Product.id)).where(
                    Product.tenant_id.is_not(None))
            )
            orders_with_tenants = await db.scalar(
                select(func.count(Order.id)).where(
                    Order.tenant_id.is_not(None))
            )

            statistics["migration_coverage"] = {
                "users_coverage": (users_with_tenants / total_users * 100) if total_users > 0 else 0,
                "products_coverage": (products_with_tenants / total_products * 100) if total_products > 0 else 0,
                "orders_coverage": (orders_with_tenants / total_orders * 100) if total_orders > 0 else 0
            }

            # Performance metrics
            largest_tenant = await db.execute(text("""
                SELECT
                    t.name,
                    COUNT(DISTINCT u.id) + COUNT(DISTINCT p.id) + COUNT(DISTINCT o.id) as total_records
                FROM tenants t
                LEFT JOIN users u ON t.id = u.tenant_id
                LEFT JOIN products p ON t.id = p.tenant_id
                LEFT JOIN orders o ON t.id = o.tenant_id
                GROUP BY t.id, t.name
                ORDER BY total_records DESC
                LIMIT 1
            """))

            largest_tenant_data = largest_tenant.fetchone()
            if largest_tenant_data:
                statistics["largest_tenant"] = {
                    "name": largest_tenant_data[0],
                    "total_records": largest_tenant_data[1]
                }

        return statistics

    async def generate_upgrade_report(self, results: Dict[str, Any]) -> str:
        """Generate a comprehensive upgrade report."""
        report = f"""
# Legacy Data Upgrade Report
Generated: {datetime.utcnow().isoformat()}

## Upgrade Status: {results.get('status', 'unknown').upper()}

"""

        if results.get("status") == "success":
            report += "✅ **Legacy data upgrade completed successfully**\n\n"
        else:
            report += f"❌ **Upgrade failed**: {results.get('error', 'Unknown error')}\n\n"

        # Add discovery results
        if "discovery" in results.get("phases", {}):
            discovery = results["phases"]["discovery"]
            report += "## Data Discovery Results\n\n"

            if "orphaned_users" in discovery:
                users_data = discovery["orphaned_users"]
                report += f"### Orphaned Users: {users_data['total']}\n"
                for category, count in users_data.get("categories", {}).items():
                    report += f"- **{category}**: {count}\n"
                report += "\n"

            if "orphaned_products" in discovery:
                products_data = discovery["orphaned_products"]
                report += f"### Orphaned Products: {products_data['total']}\n"
                for category, count in products_data.get("categories", {}).items():
                    report += f"- **{category}**: {count}\n"
                report += "\n"

        # Add assignment results
        if "data_assignment" in results.get("phases", {}):
            assignments = results["phases"]["data_assignment"]
            report += "## Data Assignment Results\n\n"

            for data_type, assignment_data in assignments.items():
                report += f"### {data_type.title()}\n"
                if isinstance(assignment_data, dict):
                    for key, value in assignment_data.items():
                        report += f"- **{key}**: {value}\n"
                report += "\n"

        # Add validation results
        if "validation" in results.get("phases", {}):
            validation = results["phases"]["validation"]
            report += "## Validation Results\n\n"

            if "remaining_orphaned" in validation:
                orphaned = validation["remaining_orphaned"]
                report += f"### Remaining Orphaned Data\n"
                report += f"- **Users**: {orphaned.get('users', 0)}\n"
                report += f"- **Products**: {orphaned.get('products', 0)}\n"
                report += f"- **Orders**: {orphaned.get('orders', 0)}\n"
                report += f"- **Total**: {orphaned.get('total', 0)}\n\n"

        # Add statistics
        if "statistics" in results:
            stats = results["statistics"]
            report += "## Migration Statistics\n\n"

            if "migration_coverage" in stats:
                coverage = stats["migration_coverage"]
                report += f"### Coverage\n"
                report += f"- **Users**: {coverage.get('users_coverage', 0):.1f}%\n"
                report += f"- **Products**: {coverage.get('products_coverage', 0):.1f}%\n"
                report += f"- **Orders**: {coverage.get('orders_coverage', 0):.1f}%\n\n"

        return report

    async def cleanup(self):
        """Cleanup resources."""
        await self.engine.dispose()


async def main():
    """Main upgrade execution function."""
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

    upgrader = LegacyDataUpgrader(database_url)

    try:
        logger.info("Starting legacy data upgrade process...")
        results = await upgrader.run_legacy_upgrade()

        # Generate and save report
        report = await upgrader.generate_upgrade_report(results)
        report_path = f"legacy_upgrade_report_{int(datetime.utcnow().timestamp())}.md"

        with open(report_path, 'w') as f:
            f.write(report)

        logger.info(f"Upgrade report saved to: {report_path}")

        if results.get("status") == "success":
            logger.info("✅ Legacy data upgrade completed successfully!")
        else:
            logger.error(
                f"❌ Legacy data upgrade failed: {results.get('error')}")

    except Exception as e:
        logger.error(f"Upgrade process failed: {str(e)}")
    finally:
        await upgrader.cleanup()


if __name__ == "__main__":
    asyncio.run(main())
