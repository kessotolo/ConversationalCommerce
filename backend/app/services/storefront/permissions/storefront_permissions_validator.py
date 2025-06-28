"""
Storefront Permissions Validator

This module contains functions for validating storefront permissions
and configuration data against schemas.
"""

import json
from typing import Any, Dict, Tuple

import jsonschema
from jsonschema import ValidationError


def validate_json_schema(
    data: Dict[str, Any], schema: Dict[str, Any]
) -> Tuple[bool, str]:
    """
    Validate data against a JSON schema.

    Args:
        data: Data to validate
        schema: JSON schema to validate against

    Returns:
        Tuple of (is_valid, error_message)
    """
    try:
        jsonschema.validate(instance=data, schema=schema)
        return True, ""
    except ValidationError as e:
        return False, str(e)


def validate_theme_settings(
    theme_settings: Dict[str, Any],
) -> Tuple[bool, str]:
    """
    Validate theme settings against the theme schema.

    Args:
        theme_settings: Theme settings to validate

    Returns:
        Tuple of (is_valid, error_message)
    """
    # Define schema for theme settings
    theme_schema = {
        "type": "object",
        "properties": {
            "colors": {
                "type": "object",
                "properties": {
                    "primary": {"type": "string", "pattern": "^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$"},
                    "secondary": {"type": "string", "pattern": "^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$"},
                    "accent": {"type": "string", "pattern": "^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$"},
                    "background": {"type": "string", "pattern": "^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$"},
                    "text": {"type": "string", "pattern": "^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$"},
                },
                "required": ["primary", "secondary", "background", "text"],
            },
            "typography": {
                "type": "object",
                "properties": {
                    "headingFont": {"type": "string"},
                    "bodyFont": {"type": "string"},
                    "baseFontSize": {"type": "string", "pattern": "^\\d+(\\.\\d+)?px$"},
                    "lineHeight": {"type": ["number", "string"]},
                },
                "required": ["headingFont", "bodyFont", "baseFontSize"],
            },
            "spacing": {
                "type": "object",
                "properties": {
                    "baseSpacing": {"type": "string", "pattern": "^\\d+(\\.\\d+)?px$"},
                    "contentPadding": {"type": "string", "pattern": "^\\d+(\\.\\d+)?px$"},
                },
                "required": ["baseSpacing"],
            },
            "buttons": {
                "type": "object",
                "properties": {
                    "borderRadius": {"type": "string", "pattern": "^\\d+(\\.\\d+)?px$"},
                    "primaryColor": {"type": "string", "pattern": "^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$"},
                    "secondaryColor": {"type": "string", "pattern": "^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$"},
                },
                "required": ["borderRadius", "primaryColor"],
            },
        },
        "required": ["colors", "typography"],
    }

    return validate_json_schema(theme_settings, theme_schema)


def validate_layout_config(
    layout_config: Dict[str, Any],
) -> Tuple[bool, str]:
    """
    Validate layout configuration against the layout schema.

    Args:
        layout_config: Layout configuration to validate

    Returns:
        Tuple of (is_valid, error_message)
    """
    # Define schema for layout configuration
    layout_schema = {
        "type": "object",
        "properties": {
            "layout": {
                "type": "string",
                "enum": ["standard", "sidebar", "grid", "compact"],
            },
            "header": {
                "type": "object",
                "properties": {
                    "position": {"type": "string", "enum": ["fixed", "static"]},
                    "showLogo": {"type": "boolean"},
                    "showNavigation": {"type": "boolean"},
                    "backgroundColor": {"type": "string", "pattern": "^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$"},
                },
                "required": ["position", "showLogo"],
            },
            "footer": {
                "type": "object",
                "properties": {
                    "showFooter": {"type": "boolean"},
                    "showSocialLinks": {"type": "boolean"},
                    "backgroundColor": {"type": "string", "pattern": "^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$"},
                },
                "required": ["showFooter"],
            },
            "contentWidth": {
                "type": "string",
                "pattern": "^(\\d+(\\.\\d+)?px|\\d+(\\.\\d+)?%|auto)$",
            },
        },
        "required": ["layout", "header", "contentWidth"],
    }

    return validate_json_schema(layout_config, layout_schema)
