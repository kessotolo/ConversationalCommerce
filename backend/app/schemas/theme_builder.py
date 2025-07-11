from datetime import datetime
from typing import Dict, List, Optional, Union
from uuid import UUID

from pydantic import BaseModel, Field, validator


# Color and Typography Schemas
class ColorPalette(BaseModel):
    """Color palette configuration for themes."""

    primary: str = Field(..., description="Primary brand color (hex)")
    secondary: str = Field(..., description="Secondary brand color (hex)")
    accent: str = Field(..., description="Accent color for highlights (hex)")
    background: str = Field(..., description="Main background color (hex)")
    surface: str = Field(..., description="Surface/card background color (hex)")
    text_primary: str = Field(..., description="Primary text color (hex)")
    text_secondary: str = Field(..., description="Secondary text color (hex)")
    border: str = Field(..., description="Border color (hex)")
    success: str = Field(..., description="Success state color (hex)")
    warning: str = Field(..., description="Warning state color (hex)")
    error: str = Field(..., description="Error state color (hex)")

    @validator("*")
    def validate_hex_color(cls, v):
        if not v.startswith("#") or len(v) not in [4, 7, 9]:
            raise ValueError("Color must be a valid hex color (e.g., #FF0000)")
        return v


class TypographySettings(BaseModel):
    """Typography configuration for themes."""

    font_family_primary: str = Field(..., description="Primary font family")
    font_family_secondary: str = Field(..., description="Secondary font family")
    font_size_base: str = Field(..., description="Base font size (e.g., 16px)")
    font_size_h1: str = Field(..., description="H1 font size")
    font_size_h2: str = Field(..., description="H2 font size")
    font_size_h3: str = Field(..., description="H3 font size")
    font_size_h4: str = Field(..., description="H4 font size")
    font_size_h5: str = Field(..., description="H5 font size")
    font_size_h6: str = Field(..., description="H6 font size")
    font_weight_normal: int = Field(..., description="Normal font weight")
    font_weight_medium: int = Field(..., description="Medium font weight")
    font_weight_bold: int = Field(..., description="Bold font weight")
    line_height_base: float = Field(..., description="Base line height")
    letter_spacing_base: str = Field(..., description="Base letter spacing")


class SpacingConfig(BaseModel):
    """Spacing configuration for themes."""

    spacing_xs: str = Field(..., description="Extra small spacing")
    spacing_sm: str = Field(..., description="Small spacing")
    spacing_md: str = Field(..., description="Medium spacing")
    spacing_lg: str = Field(..., description="Large spacing")
    spacing_xl: str = Field(..., description="Extra large spacing")
    spacing_2xl: str = Field(..., description="2x large spacing")
    spacing_3xl: str = Field(..., description="3x large spacing")


class BreakpointConfig(BaseModel):
    """Breakpoint configuration for responsive design."""

    mobile: str = Field(..., description="Mobile breakpoint (e.g., 768px)")
    tablet: str = Field(..., description="Tablet breakpoint (e.g., 1024px)")
    desktop: str = Field(..., description="Desktop breakpoint (e.g., 1280px)")
    wide: str = Field(..., description="Wide desktop breakpoint (e.g., 1536px)")


class ThemeSection(BaseModel):
    """A section in the theme layout."""

    id: str = Field(..., description="Unique section identifier")
    type: str = Field(..., description="Section type (header, hero, products, etc.)")
    title: Optional[str] = Field(None, description="Section title")
    visible: bool = Field(True, description="Whether section is visible")
    order: int = Field(..., description="Section order in layout")
    config: Dict[str, Union[str, int, bool, List[str]]] = Field(
        default_factory=dict, description="Section-specific configuration"
    )


class ThemeLayoutSchema(BaseModel):
    """Complete theme layout configuration."""

    sections: List[ThemeSection] = Field(..., description="Layout sections")
    colors: ColorPalette = Field(..., description="Color palette")
    typography: TypographySettings = Field(..., description="Typography settings")
    spacing: SpacingConfig = Field(..., description="Spacing configuration")
    breakpoints: BreakpointConfig = Field(..., description="Breakpoint configuration")

    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat(),
        }


# Theme Version Schemas
class ThemeVersionCreate(BaseModel):
    """Schema for creating a new theme version."""

    theme_id: UUID = Field(..., description="Parent theme ID")
    version_number: str = Field(..., description="Version number (e.g., 1.0.0)")
    name: str = Field(..., description="User-friendly version name")
    description: Optional[str] = Field(None, description="Version description")
    layout: ThemeLayoutSchema = Field(..., description="Complete theme layout")
    is_published: bool = Field(False, description="Whether to publish this version")


class ThemeVersionUpdate(BaseModel):
    """Schema for updating a theme version."""

    name: Optional[str] = Field(None, description="Version name")
    description: Optional[str] = Field(None, description="Version description")
    layout: Optional[ThemeLayoutSchema] = Field(None, description="Theme layout")
    is_published: Optional[bool] = Field(None, description="Publish status")


class ThemeVersionResponse(BaseModel):
    """Schema for theme version responses."""

    id: UUID
    theme_id: UUID
    version_number: str
    name: str
    description: Optional[str]
    layout: ThemeLayoutSchema
    is_published: bool
    created_by: UUID
    created_at: datetime
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True


# Theme Builder Schemas
class ThemeBuilderState(BaseModel):
    """Current state of the theme builder."""

    layout: ThemeLayoutSchema = Field(..., description="Current theme layout")
    selected_section: Optional[str] = Field(None, description="Currently selected section")
    preview_device: str = Field("mobile", description="Current preview device")
    is_dirty: bool = Field(False, description="Whether there are unsaved changes")


class ThemeBuilderAction(BaseModel):
    """Action to perform in the theme builder."""

    action_type: str = Field(..., description="Action type (add_section, update_colors, etc.)")
    payload: Dict[str, Union[str, int, bool, List[str]]] = Field(
        default_factory=dict, description="Action payload"
    )


# WhatsApp Integration Schemas
class WhatsAppThemeCommand(BaseModel):
    """WhatsApp command for theme operations."""

    command: str = Field(..., description="Command (preview, publish, reset, list)")
    theme_name: Optional[str] = Field(None, description="Theme name for specific commands")
    version_name: Optional[str] = Field(None, description="Version name for specific commands")


class WhatsAppThemeResponse(BaseModel):
    """Response to WhatsApp theme commands."""

    success: bool = Field(..., description="Whether command was successful")
    message: str = Field(..., description="Response message")
    data: Optional[Dict[str, Union[str, List[str]]]] = Field(
        None, description="Additional response data"
    )


# Preset Templates
class ThemeTemplate(BaseModel):
    """A preset theme template."""

    id: str = Field(..., description="Template identifier")
    name: str = Field(..., description="Template name")
    description: str = Field(..., description="Template description")
    category: str = Field(..., description="Template category")
    preview_image: str = Field(..., description="Preview image URL")
    layout: ThemeLayoutSchema = Field(..., description="Template layout")
    tags: List[str] = Field(default_factory=list, description="Template tags")


# API Request/Response Schemas
class ThemeBuilderCreateRequest(BaseModel):
    """Request to create a new theme."""

    name: str = Field(..., description="Theme name")
    description: Optional[str] = Field(None, description="Theme description")
    template_id: Optional[str] = Field(None, description="Template to start from")
    layout: Optional[ThemeLayoutSchema] = Field(None, description="Initial layout")


class ThemeBuilderUpdateRequest(BaseModel):
    """Request to update a theme."""

    name: Optional[str] = Field(None, description="Theme name")
    description: Optional[str] = Field(None, description="Theme description")
    layout: Optional[ThemeLayoutSchema] = Field(None, description="Updated layout")


class ThemeBuilderResponse(BaseModel):
    """Response for theme builder operations."""

    id: UUID
    name: str
    description: Optional[str]
    layout: ThemeLayoutSchema
    current_version: Optional[ThemeVersionResponse]
    versions: List[ThemeVersionResponse]
    created_at: datetime
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True