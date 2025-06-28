"""
Storefront Template Validator

This module contains functions for validating page template structures.
"""

from typing import Any, Dict

from fastapi import HTTPException, status

from app.models.storefront_page_template import PageTemplateType


def validate_template_structure(
    template_type: PageTemplateType, structure: Dict[str, Any]
) -> None:
    """
    Validate template structure based on its type.

    Args:
        template_type: Type of page template
        structure: Structure to validate

    Raises:
        HTTPException: 400 if structure is invalid
    """
    # Base validation for all template types
    if not isinstance(structure, dict):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Template structure must be a JSON object",
        )

    # Check required root keys
    required_keys = ["layout", "sections"]
    missing_keys = [key for key in required_keys if key not in structure]
    if missing_keys:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Missing required keys in template structure: {', '.join(missing_keys)}",
        )

    # Validate layout
    if not isinstance(structure["layout"], str):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Layout must be a string",
        )

    # Validate sections
    if not isinstance(structure["sections"], list):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Sections must be an array",
        )

    # Validate each section
    for idx, section in enumerate(structure["sections"]):
        if not isinstance(section, dict):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Section at index {idx} must be an object",
            )

        # Check required section keys
        section_keys = ["id", "type", "slots"]
        missing_section_keys = [key for key in section_keys if key not in section]
        if missing_section_keys:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Missing required keys in section at index {idx}: {', '.join(missing_section_keys)}",
            )

        # Validate section id
        if not isinstance(section["id"], str):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Section id at index {idx} must be a string",
            )

        # Validate section type
        if not isinstance(section["type"], str):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Section type at index {idx} must be a string",
            )

        # Validate slots
        if not isinstance(section["slots"], list):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Slots in section at index {idx} must be an array",
            )

        # Validate each slot
        for slot_idx, slot in enumerate(section["slots"]):
            if not isinstance(slot, dict):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Slot at index {slot_idx} in section {idx} must be an object",
                )

            # Check required slot keys
            slot_keys = ["id", "type", "config"]
            missing_slot_keys = [key for key in slot_keys if key not in slot]
            if missing_slot_keys:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Missing required keys in slot at index {slot_idx} in section {idx}: {', '.join(missing_slot_keys)}",
                )

            # Validate slot id
            if not isinstance(slot["id"], str):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Slot id at index {slot_idx} in section {idx} must be a string",
                )

            # Validate slot type
            if not isinstance(slot["type"], str):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Slot type at index {slot_idx} in section {idx} must be a string",
                )

    # Type-specific validations
    if template_type == PageTemplateType.PRODUCT:
        _validate_product_template_structure(structure)
    elif template_type == PageTemplateType.CATEGORY:
        _validate_category_template_structure(structure)
    elif template_type == PageTemplateType.HOME:
        _validate_home_template_structure(structure)
    elif template_type == PageTemplateType.CMS:
        _validate_cms_template_structure(structure)


def _validate_product_template_structure(structure: Dict[str, Any]) -> None:
    """
    Validate a product page template structure.
    
    Args:
        structure: Template structure to validate
        
    Raises:
        HTTPException: 400 if structure is invalid for a product template
    """
    # Check for required sections for product pages
    required_section_types = ["product-details", "product-gallery"]
    section_types = [section["type"] for section in structure["sections"]]
    
    # Check if all required section types are present
    missing_section_types = [
        section_type
        for section_type in required_section_types
        if section_type not in section_types
    ]
    
    if missing_section_types:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Missing required section types for product template: {', '.join(missing_section_types)}",
        )


def _validate_category_template_structure(structure: Dict[str, Any]) -> None:
    """
    Validate a category page template structure.
    
    Args:
        structure: Template structure to validate
        
    Raises:
        HTTPException: 400 if structure is invalid for a category template
    """
    # Check for required sections for category pages
    required_section_types = ["category-header", "product-grid"]
    section_types = [section["type"] for section in structure["sections"]]
    
    # Check if all required section types are present
    missing_section_types = [
        section_type
        for section_type in required_section_types
        if section_type not in section_types
    ]
    
    if missing_section_types:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Missing required section types for category template: {', '.join(missing_section_types)}",
        )


def _validate_home_template_structure(structure: Dict[str, Any]) -> None:
    """
    Validate a home page template structure.
    
    Args:
        structure: Template structure to validate
        
    Raises:
        HTTPException: 400 if structure is invalid for a home template
    """
    # Home page is more flexible, but should have at least one section
    if len(structure["sections"]) < 1:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Home page template must have at least one section",
        )


def _validate_cms_template_structure(structure: Dict[str, Any]) -> None:
    """
    Validate a CMS page template structure.
    
    Args:
        structure: Template structure to validate
        
    Raises:
        HTTPException: 400 if structure is invalid for a CMS template
    """
    # CMS pages are flexible, but should have at least content section
    section_types = [section["type"] for section in structure["sections"]]
    if "content" not in section_types:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="CMS page template must have a content section",
        )
