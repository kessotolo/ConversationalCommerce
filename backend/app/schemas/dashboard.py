from pydantic import BaseModel, ConfigDict, Field


class DashboardStatsResponse(BaseModel):
    """Dashboard statistics response model."""
    
    totalUsers: int = Field(default=0, description="Total number of users/customers")
    totalOrders: int = Field(default=0, description="Total number of orders")
    totalRevenue: float = Field(default=0.0, description="Total revenue from all orders")

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "totalUsers": 0,
                "totalOrders": 0,
                "totalRevenue": 0.0
            }
        }
    )
