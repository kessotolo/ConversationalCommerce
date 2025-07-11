from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


class LayoutUpdate(BaseModel):
    """Schema for updating page layout."""

    slots: Optional[Dict[str, Any]] = Field(
        None, description="Layout slots configuration"
    )
    components: Optional[List[Dict[str, Any]]] = Field(
        None, description="List of components in the layout"
    )
    metadata: Optional[Dict[str, Any]] = Field(
        None, description="Additional layout metadata"
    )
    version: Optional[int] = Field(
        None, description="Layout version for conflict resolution"
    )


class ComponentPlacement(BaseModel):
    """Schema for component placement in a page layout."""

    component_id: str = Field(..., description="ID of the component to place")
    slot_id: str = Field(...,
                         description="ID of the slot to place the component in")
    position: Optional[int] = Field(
        None, description="Position within the slot (0-based index)"
    )
    configuration: Optional[Dict[str, Any]] = Field(
        None, description="Component-specific configuration"
    )


class PageLayoutResponse(BaseModel):
    """Schema for page layout response."""

    success: bool = Field(..., description="Operation success status")
    page_id: str = Field(..., description="ID of the page")
    tenant_id: str = Field(..., description="ID of the tenant")
    layout: Optional[Dict[str, Any]] = Field(
        None, description="Current page layout"
    )
    message: str = Field(..., description="Response message")
    updated_at: Optional[str] = Field(
        None, description="Timestamp of last update"
    )
    updated_by: Optional[str] = Field(
        None, description="ID of user who last updated the layout"
    )


class ComponentAdditionResponse(BaseModel):
    """Schema for component addition response."""

    success: bool = Field(..., description="Operation success status")
    page_id: str = Field(..., description="ID of the page")
    component_id: str = Field(..., description="ID of the component")
    slot_id: str = Field(..., description="ID of the slot")
    position: Optional[int] = Field(
        None, description="Position within the slot"
    )
    message: str = Field(..., description="Response message")
    added_at: Optional[str] = Field(
        None, description="Timestamp of addition"
    )
    added_by: Optional[str] = Field(
        None, description="ID of user who added the component"
    )


class ComponentRemovalResponse(BaseModel):
    """Schema for component removal response."""

    success: bool = Field(..., description="Operation success status")
    page_id: str = Field(..., description="ID of the page")
    component_id: str = Field(..., description="ID of the component")
    slot_id: str = Field(..., description="ID of the slot")
    message: str = Field(..., description="Response message")
    removed_at: Optional[str] = Field(
        None, description="Timestamp of removal"
    )
    removed_by: Optional[str] = Field(
        None, description="ID of user who removed the component"
    )
