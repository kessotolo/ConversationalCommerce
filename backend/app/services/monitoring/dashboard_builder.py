"""
Dashboard Builder Service.

Handles dynamic dashboard creation, widget management, and customization
for merchant monitoring dashboards and business intelligence displays.

Business Context:
- Creates customized dashboard layouts based on merchant business needs and subscription tiers
- Manages dashboard widgets, visualizations, and data presentation components
- Provides responsive dashboard designs that work across desktop and mobile devices
- Supports drag-and-drop dashboard customization and real-time layout updates
"""

import asyncio
import uuid
import logging
from typing import Dict, Any, List, Optional, Tuple
from datetime import datetime, timedelta
from dataclasses import dataclass
from enum import Enum
import json

from sqlalchemy.ext.asyncio import AsyncSession

logger = logging.getLogger(__name__)


class WidgetType(str, Enum):
    """Types of dashboard widgets."""
    CHART = "chart"
    TABLE = "table"
    METRIC = "metric"
    GAUGE = "gauge"
    MAP = "map"
    LIST = "list"
    ALERT = "alert"
    TEXT = "text"


class ChartType(str, Enum):
    """Types of chart visualizations."""
    LINE = "line"
    BAR = "bar"
    PIE = "pie"
    AREA = "area"
    SCATTER = "scatter"
    DONUT = "donut"
    HEATMAP = "heatmap"


class WidgetSize(str, Enum):
    """Widget size options."""
    SMALL = "small"      # 1x1
    MEDIUM = "medium"    # 2x1
    LARGE = "large"      # 2x2
    WIDE = "wide"        # 3x1
    TALL = "tall"        # 1x3
    EXTRA_LARGE = "xl"   # 3x2


@dataclass
class Widget:
    """Dashboard widget configuration."""
    widget_id: str
    title: str
    widget_type: WidgetType
    size: WidgetSize
    position: Dict[str, int]  # {x, y, width, height}
    data_source: str
    configuration: Dict[str, Any]
    created_at: datetime
    is_visible: bool = True


@dataclass
class DashboardLayout:
    """Dashboard layout configuration."""
    layout_id: str
    tenant_id: str
    dashboard_type: str
    name: str
    widgets: List[Widget]
    grid_config: Dict[str, Any]
    theme: str
    created_at: datetime
    last_modified: datetime
    is_active: bool = True


class DashboardBuilderService:
    """
    Dynamic dashboard builder and widget management service.

    Provides:
    - Dashboard layout creation and management
    - Widget library and customization
    - Responsive design and mobile optimization
    - Real-time dashboard updates and modifications
    - Template-based dashboard generation
    - Theme and styling management
    """

    def __init__(self, db: AsyncSession):
        self.db = db

        # Dashboard layouts storage
        self.dashboard_layouts: Dict[str, DashboardLayout] = {}

        # Widget templates library
        self.widget_templates = {
            "revenue_summary": {
                "type": WidgetType.METRIC,
                "chart_type": None,
                "size": WidgetSize.LARGE,
                "config": {
                    "metric_key": "revenue.total_24h",
                    "format": "currency",
                    "trend_indicator": True,
                    "comparison_period": "previous_day"
                }
            },
            "order_volume": {
                "type": WidgetType.CHART,
                "chart_type": ChartType.LINE,
                "size": WidgetSize.MEDIUM,
                "config": {
                    "data_key": "orders.count_24h",
                    "time_series": True,
                    "trend_line": True
                }
            },
            "sales_funnel": {
                "type": WidgetType.CHART,
                "chart_type": ChartType.BAR,
                "size": WidgetSize.LARGE,
                "config": {
                    "data_key": "sales_funnel",
                    "orientation": "horizontal",
                    "show_values": True
                }
            },
            "top_products": {
                "type": WidgetType.TABLE,
                "chart_type": None,
                "size": WidgetSize.MEDIUM,
                "config": {
                    "data_key": "top_products",
                    "columns": ["name", "revenue", "units"],
                    "sort_by": "revenue",
                    "max_rows": 10
                }
            },
            "system_health": {
                "type": WidgetType.GAUGE,
                "chart_type": None,
                "size": WidgetSize.MEDIUM,
                "config": {
                    "metric_key": "system_health.uptime_percent",
                    "min_value": 0,
                    "max_value": 100,
                    "threshold_colors": {
                        "good": 95,
                        "warning": 90,
                        "critical": 85
                    }
                }
            },
            "performance_metrics": {
                "type": WidgetType.CHART,
                "chart_type": ChartType.AREA,
                "size": WidgetSize.MEDIUM,
                "config": {
                    "data_key": "performance",
                    "metrics": ["response_time_ms", "throughput_rps"],
                    "dual_axis": True
                }
            },
            "geographic_sales": {
                "type": WidgetType.MAP,
                "chart_type": None,
                "size": WidgetSize.LARGE,
                "config": {
                    "data_key": "geographic_sales.top_regions",
                    "map_type": "world",
                    "color_scale": "revenue",
                    "zoom_level": 2
                }
            },
            "conversion_rate": {
                "type": WidgetType.METRIC,
                "chart_type": None,
                "size": WidgetSize.SMALL,
                "config": {
                    "metric_key": "conversion_rate.current",
                    "format": "percentage",
                    "trend_indicator": True,
                    "target_value": 3.5
                }
            }
        }

        # Grid configuration
        self.grid_config = {
            "columns": 12,
            "row_height": 60,
            "margin": [10, 10],
            "container_padding": [20, 20],
            "breakpoints": {
                "lg": 1200,
                "md": 996,
                "sm": 768,
                "xs": 480,
                "xxs": 0
            }
        }

        # Theme configurations
        self.themes = {
            "light": {
                "primary_color": "#3B82F6",
                "secondary_color": "#64748B",
                "background_color": "#FFFFFF",
                "card_background": "#F8FAFC",
                "text_color": "#1E293B",
                "border_color": "#E2E8F0"
            },
            "dark": {
                "primary_color": "#60A5FA",
                "secondary_color": "#94A3B8",
                "background_color": "#0F172A",
                "card_background": "#1E293B",
                "text_color": "#F1F5F9",
                "border_color": "#334155"
            },
            "business": {
                "primary_color": "#059669",
                "secondary_color": "#6B7280",
                "background_color": "#FFFFFF",
                "card_background": "#F9FAFB",
                "text_color": "#111827",
                "border_color": "#D1D5DB"
            }
        }

        # Service status
        self.is_running = False

    async def initialize(self) -> None:
        """Initialize the dashboard builder service."""
        try:
            logger.info("Initializing Dashboard Builder Service")
            self.is_running = True
            logger.info("Dashboard Builder Service initialized successfully")

        except Exception as e:
            logger.error(f"Error initializing dashboard builder service: {e}")
            raise

    async def create_dashboard_widgets(
        self,
        tenant_id: uuid.UUID,
        dashboard_type: str,
        monitoring_tier: str
    ) -> List[Dict[str, Any]]:
        """
        Create dashboard widgets based on dashboard type and monitoring tier.

        Args:
            tenant_id: Merchant tenant identifier
            dashboard_type: Type of dashboard (executive, operations, etc.)
            monitoring_tier: Merchant's monitoring tier level

        Returns:
            List of configured dashboard widgets
        """
        try:
            tenant_key = str(tenant_id)

            # Get widget templates for this dashboard type
            widget_configs = self._get_dashboard_widget_configs(
                dashboard_type, monitoring_tier)

            # Create widgets from templates
            widgets = []
            for i, config in enumerate(widget_configs):
                widget = await self._create_widget_from_template(
                    tenant_key, config, position={
                        "x": (i % 3) * 4, "y": (i // 3) * 3}
                )
                if widget:
                    widgets.append(self._widget_to_dict(widget))

            logger.info(
                f"Created {len(widgets)} widgets for {dashboard_type} dashboard")

            return widgets

        except Exception as e:
            logger.error(
                f"Error creating dashboard widgets for tenant {tenant_id}: {e}")
            return []

    async def update_dashboard_widgets(
        self,
        tenant_id: uuid.UUID,
        dashboard_type: str,
        widget_updates: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """
        Update existing dashboard widgets.

        Args:
            tenant_id: Merchant tenant identifier
            dashboard_type: Type of dashboard
            widget_updates: List of widget update configurations

        Returns:
            List of updated widgets
        """
        try:
            tenant_key = str(tenant_id)
            updated_widgets = []

            # Find existing dashboard layout
            layout = await self._get_dashboard_layout(tenant_key, dashboard_type)
            if not layout:
                return []

            # Apply updates to widgets
            for update in widget_updates:
                widget_id = update.get("widget_id")
                if not widget_id:
                    continue

                # Find widget to update
                for widget in layout.widgets:
                    if widget.widget_id == widget_id:
                        # Apply updates
                        if "position" in update:
                            widget.position.update(update["position"])
                        if "size" in update:
                            widget.size = WidgetSize(update["size"])
                        if "configuration" in update:
                            widget.configuration.update(
                                update["configuration"])
                        if "is_visible" in update:
                            widget.is_visible = update["is_visible"]

                        updated_widgets.append(self._widget_to_dict(widget))
                        break

            # Update layout modification time
            layout.last_modified = datetime.utcnow()

            return updated_widgets

        except Exception as e:
            logger.error(
                f"Error updating dashboard widgets for tenant {tenant_id}: {e}")
            return []

    async def create_dashboard_layout(
        self,
        tenant_id: uuid.UUID,
        dashboard_type: str,
        layout_name: str,
        theme: str = "light"
    ) -> Dict[str, Any]:
        """
        Create a new dashboard layout.

        Args:
            tenant_id: Merchant tenant identifier
            dashboard_type: Type of dashboard
            layout_name: Name for the layout
            theme: Theme to apply

        Returns:
            Created dashboard layout configuration
        """
        try:
            tenant_key = str(tenant_id)
            layout_id = f"{tenant_key}_{dashboard_type}_{uuid.uuid4().hex[:8]}"

            # Create default widgets for this dashboard type
            widget_configs = self._get_dashboard_widget_configs(
                dashboard_type, "standard")
            widgets = []

            for i, config in enumerate(widget_configs):
                widget = await self._create_widget_from_template(
                    tenant_key, config, position=self._calculate_widget_position(
                        i, config["size"])
                )
                if widget:
                    widgets.append(widget)

            # Create dashboard layout
            layout = DashboardLayout(
                layout_id=layout_id,
                tenant_id=tenant_key,
                dashboard_type=dashboard_type,
                name=layout_name,
                widgets=widgets,
                grid_config=self.grid_config.copy(),
                theme=theme,
                created_at=datetime.utcnow(),
                last_modified=datetime.utcnow()
            )

            # Store layout
            self.dashboard_layouts[layout_id] = layout

            return self._layout_to_dict(layout)

        except Exception as e:
            logger.error(
                f"Error creating dashboard layout for tenant {tenant_id}: {e}")
            return {"error": str(e)}

    async def get_dashboard_layout(
        self,
        tenant_id: uuid.UUID,
        dashboard_type: str
    ) -> Dict[str, Any]:
        """Get dashboard layout for a tenant and dashboard type."""
        try:
            tenant_key = str(tenant_id)
            layout = await self._get_dashboard_layout(tenant_key, dashboard_type)

            if layout:
                return self._layout_to_dict(layout)
            else:
                # Create default layout if none exists
                return await self.create_dashboard_layout(
                    tenant_id, dashboard_type, f"Default {dashboard_type.title()} Dashboard"
                )

        except Exception as e:
            logger.error(
                f"Error getting dashboard layout for tenant {tenant_id}: {e}")
            return {"error": str(e)}

    def _get_dashboard_widget_configs(self, dashboard_type: str, monitoring_tier: str) -> List[Dict[str, Any]]:
        """Get widget configurations for a specific dashboard type."""
        base_configs = {
            "executive": [
                {"template": "revenue_summary", "priority": 1},
                {"template": "order_volume", "priority": 2},
                {"template": "conversion_rate", "priority": 3},
                {"template": "top_products", "priority": 4}
            ],
            "operations": [
                {"template": "system_health", "priority": 1},
                {"template": "performance_metrics", "priority": 2},
                {"template": "conversion_rate", "priority": 3}
            ],
            "sales": [
                {"template": "sales_funnel", "priority": 1},
                {"template": "top_products", "priority": 2},
                {"template": "geographic_sales", "priority": 3},
                {"template": "conversion_rate", "priority": 4}
            ],
            "performance": [
                {"template": "performance_metrics", "priority": 1},
                {"template": "system_health", "priority": 2}
            ],
            "customer": [
                {"template": "top_products", "priority": 1},
                {"template": "conversion_rate", "priority": 2}
            ],
            "financial": [
                {"template": "revenue_summary", "priority": 1},
                {"template": "order_volume", "priority": 2}
            ]
        }

        configs = base_configs.get(dashboard_type.lower(), [])

        # Add premium widgets for higher tiers
        if monitoring_tier in ["premium", "enterprise"]:
            configs.extend([
                {"template": "geographic_sales", "priority": 10}
            ])

        return configs

    async def _create_widget_from_template(
        self,
        tenant_id: str,
        config: Dict[str, Any],
        position: Dict[str, int]
    ) -> Optional[Widget]:
        """Create a widget from a template configuration."""
        try:
            template_name = config["template"]
            template = self.widget_templates.get(template_name)

            if not template:
                logger.warning(f"Unknown widget template: {template_name}")
                return None

            # Calculate widget dimensions based on size
            size = WidgetSize(template["size"])
            dimensions = self._get_widget_dimensions(size)

            widget = Widget(
                widget_id=str(uuid.uuid4()),
                title=template_name.replace("_", " ").title(),
                widget_type=template["type"],
                size=size,
                position={
                    "x": position["x"],
                    "y": position["y"],
                    "width": dimensions["width"],
                    "height": dimensions["height"]
                },
                data_source=template["config"].get("data_key", template_name),
                configuration={
                    **template["config"],
                    "chart_type": template.get("chart_type"),
                    "priority": config.get("priority", 5)
                },
                created_at=datetime.utcnow()
            )

            return widget

        except Exception as e:
            logger.error(f"Error creating widget from template {config}: {e}")
            return None

    def _calculate_widget_position(self, index: int, size: str) -> Dict[str, int]:
        """Calculate widget position in grid layout."""
        cols_per_row = 3  # Default 3 widgets per row

        if size == WidgetSize.LARGE or size == WidgetSize.EXTRA_LARGE:
            cols_per_row = 2
        elif size == WidgetSize.WIDE:
            cols_per_row = 1

        row = index // cols_per_row
        col = index % cols_per_row

        return {
            "x": col * (12 // cols_per_row),
            "y": row * 4
        }

    def _get_widget_dimensions(self, size: WidgetSize) -> Dict[str, int]:
        """Get widget dimensions based on size."""
        dimensions = {
            WidgetSize.SMALL: {"width": 3, "height": 2},
            WidgetSize.MEDIUM: {"width": 6, "height": 3},
            WidgetSize.LARGE: {"width": 6, "height": 4},
            WidgetSize.WIDE: {"width": 12, "height": 3},
            WidgetSize.TALL: {"width": 3, "height": 6},
            WidgetSize.EXTRA_LARGE: {"width": 8, "height": 5}
        }

        return dimensions.get(size, {"width": 6, "height": 3})

    async def _get_dashboard_layout(self, tenant_id: str, dashboard_type: str) -> Optional[DashboardLayout]:
        """Get existing dashboard layout for tenant and type."""
        for layout in self.dashboard_layouts.values():
            if (layout.tenant_id == tenant_id and
                layout.dashboard_type == dashboard_type and
                    layout.is_active):
                return layout
        return None

    def _widget_to_dict(self, widget: Widget) -> Dict[str, Any]:
        """Convert Widget to dictionary."""
        return {
            "widget_id": widget.widget_id,
            "title": widget.title,
            "type": widget.widget_type.value,
            "size": widget.size.value,
            "position": widget.position,
            "data_source": widget.data_source,
            "configuration": widget.configuration,
            "is_visible": widget.is_visible,
            "created_at": widget.created_at.isoformat()
        }

    def _layout_to_dict(self, layout: DashboardLayout) -> Dict[str, Any]:
        """Convert DashboardLayout to dictionary."""
        return {
            "layout_id": layout.layout_id,
            "tenant_id": layout.tenant_id,
            "dashboard_type": layout.dashboard_type,
            "name": layout.name,
            "widgets": [self._widget_to_dict(w) for w in layout.widgets],
            "grid_config": layout.grid_config,
            "theme": layout.theme,
            "created_at": layout.created_at.isoformat(),
            "last_modified": layout.last_modified.isoformat(),
            "is_active": layout.is_active
        }

    async def get_available_widgets(self) -> List[Dict[str, Any]]:
        """Get list of available widget templates."""
        widgets = []
        for name, template in self.widget_templates.items():
            widgets.append({
                "name": name,
                "title": name.replace("_", " ").title(),
                "type": template["type"].value,
                "chart_type": template.get("chart_type"),
                "default_size": template["size"].value,
                "description": f"{template['type'].value.title()} widget for {name.replace('_', ' ')}"
            })

        return widgets

    async def get_available_themes(self) -> Dict[str, Dict[str, str]]:
        """Get available dashboard themes."""
        return self.themes.copy()

    async def apply_theme_to_dashboard(
        self,
        tenant_id: uuid.UUID,
        dashboard_type: str,
        theme_name: str
    ) -> Dict[str, Any]:
        """Apply theme to a dashboard."""
        try:
            tenant_key = str(tenant_id)
            layout = await self._get_dashboard_layout(tenant_key, dashboard_type)

            if not layout:
                return {"success": False, "error": "Dashboard layout not found"}

            if theme_name not in self.themes:
                return {"success": False, "error": "Theme not found"}

            layout.theme = theme_name
            layout.last_modified = datetime.utcnow()

            return {
                "success": True,
                "theme": theme_name,
                "theme_config": self.themes[theme_name],
                "applied_at": layout.last_modified.isoformat()
            }

        except Exception as e:
            logger.error(f"Error applying theme to dashboard: {e}")
            return {"success": False, "error": str(e)}

    async def export_dashboard_config(
        self,
        tenant_id: uuid.UUID,
        dashboard_type: str
    ) -> Dict[str, Any]:
        """Export dashboard configuration for backup or migration."""
        try:
            tenant_key = str(tenant_id)
            layout = await self._get_dashboard_layout(tenant_key, dashboard_type)

            if not layout:
                return {"error": "Dashboard layout not found"}

            export_config = {
                "version": "1.0",
                "exported_at": datetime.utcnow().isoformat(),
                "dashboard": self._layout_to_dict(layout),
                "widget_templates": {
                    name: template for name, template in self.widget_templates.items()
                    if any(w.data_source == name for w in layout.widgets)
                }
            }

            return export_config

        except Exception as e:
            logger.error(f"Error exporting dashboard config: {e}")
            return {"error": str(e)}

    async def get_health_status(self) -> str:
        """Get service health status."""
        if not self.is_running:
            return "stopped"
        return "healthy"
