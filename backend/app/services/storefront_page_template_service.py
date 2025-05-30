from typing import List, Optional, Dict, Any, Tuple
import uuid
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from sqlalchemy import desc, and_, or_, func
from fastapi import HTTPException, status
from app.models.storefront_page_template import StorefrontPageTemplate, PageTemplateType, TemplateStatus
from app.models.tenant import Tenant
from app.models.user import User
from app.services.storefront_permissions_service import has_permission


async def create_page_template(
    db: Session,
    tenant_id: uuid.UUID,
    user_id: uuid.UUID,
    name: str,
    template_type: PageTemplateType,
    structure: Dict[str, Any],
    description: Optional[str] = None,
    is_default: bool = False,
    tags: Optional[List[str]] = None,
    status: TemplateStatus = TemplateStatus.DRAFT
) -> StorefrontPageTemplate:
    """
    Create a new page template.
    
    Args:
        db: Database session
        tenant_id: UUID of the tenant
        user_id: UUID of the user creating the template
        name: Template name
        template_type: Type of page template
        structure: Template structure defining sections and component slots
        description: Optional description of the template
        is_default: Whether this is the default template for its type
        tags: Optional tags for categorizing the template
        status: Template status (default: DRAFT)
        
    Returns:
        Newly created StorefrontPageTemplate
        
    Raises:
        HTTPException: 404 if tenant or user not found
        HTTPException: 403 if user doesn't have permission
    """
    # Check if tenant exists
    tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()
    if not tenant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tenant not found"
        )
    
    # Check if user exists
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Check permission
    has_perm = await has_permission(
        db=db,
        tenant_id=tenant_id,
        user_id=user_id,
        required_permission="edit",
        section=None  # For now, using global permission
    )
    
    if not has_perm:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to create page templates"
        )
    
    # Validate template structure
    await validate_template_structure(template_type, structure)
    
    # If this is set as the default template, clear default flag from other templates of same type
    if is_default:
        default_templates = db.query(StorefrontPageTemplate).filter(
            StorefrontPageTemplate.tenant_id == tenant_id,
            StorefrontPageTemplate.template_type == template_type,
            StorefrontPageTemplate.is_default == True
        ).all()
        
        for template in default_templates:
            template.is_default = False
    
    # Create the template
    template = StorefrontPageTemplate(
        tenant_id=tenant_id,
        name=name,
        template_type=template_type,
        structure=structure,
        description=description,
        is_default=is_default,
        tags=tags or [],
        status=status,
        created_by=user_id
    )
    
    db.add(template)
    db.commit()
    db.refresh(template)
    
    return template


async def update_page_template(
    db: Session,
    tenant_id: uuid.UUID,
    template_id: uuid.UUID,
    user_id: uuid.UUID,
    name: Optional[str] = None,
    structure: Optional[Dict[str, Any]] = None,
    description: Optional[str] = None,
    is_default: Optional[bool] = None,
    tags: Optional[List[str]] = None,
    status: Optional[TemplateStatus] = None
) -> StorefrontPageTemplate:
    """
    Update an existing page template.
    
    Args:
        db: Database session
        tenant_id: UUID of the tenant
        template_id: UUID of the template to update
        user_id: UUID of the user updating the template
        name: Optional new template name
        structure: Optional new template structure
        description: Optional new description
        is_default: Optional new is_default flag
        tags: Optional new tags
        status: Optional new status
        
    Returns:
        Updated StorefrontPageTemplate
        
    Raises:
        HTTPException: 404 if tenant, user, or template not found
        HTTPException: 403 if user doesn't have permission
        HTTPException: 400 if structure is invalid
    """
    # Check if tenant exists
    tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()
    if not tenant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tenant not found"
        )
    
    # Check if user exists
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Get the template
    template = db.query(StorefrontPageTemplate).filter(
        StorefrontPageTemplate.id == template_id,
        StorefrontPageTemplate.tenant_id == tenant_id
    ).first()
    
    if not template:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Page template not found"
        )
    
    # Check permission
    has_perm = await has_permission(
        db=db,
        tenant_id=tenant_id,
        user_id=user_id,
        required_permission="edit",
        section=None
    )
    
    if not has_perm:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to update page templates"
        )
    
    # Validate structure if provided
    if structure is not None:
        await validate_template_structure(template.template_type, structure)
    
    # Update is_default flag
    if is_default is not None and is_default and not template.is_default:
        # Clear default flag from other templates of same type
        default_templates = db.query(StorefrontPageTemplate).filter(
            StorefrontPageTemplate.tenant_id == tenant_id,
            StorefrontPageTemplate.template_type == template.template_type,
            StorefrontPageTemplate.is_default == True,
            StorefrontPageTemplate.id != template_id
        ).all()
        
        for other_template in default_templates:
            other_template.is_default = False
    
    # Update fields if provided
    if name is not None:
        template.name = name
    
    if structure is not None:
        template.structure = structure
    
    if description is not None:
        template.description = description
    
    if is_default is not None:
        template.is_default = is_default
    
    if tags is not None:
        template.tags = tags
    
    if status is not None:
        # If transitioning to published, track that
        if status == TemplateStatus.PUBLISHED and template.status != TemplateStatus.PUBLISHED:
            template.published_at = datetime.now(timezone.utc)
            template.published_by = user_id
        
        template.status = status
    
    # Update modified_at timestamp
    template.modified_at = datetime.now(timezone.utc)
    template.modified_by = user_id
    
    db.commit()
    db.refresh(template)
    
    return template


async def get_page_template(
    db: Session,
    tenant_id: uuid.UUID,
    template_id: uuid.UUID
) -> Optional[StorefrontPageTemplate]:
    """
    Get a specific page template by ID.
    
    Args:
        db: Database session
        tenant_id: UUID of the tenant
        template_id: UUID of the template
        
    Returns:
        StorefrontPageTemplate or None if not found
        
    Raises:
        HTTPException: 404 if tenant not found
    """
    # Check if tenant exists
    tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()
    if not tenant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tenant not found"
        )
    
    # Get the template
    template = db.query(StorefrontPageTemplate).filter(
        StorefrontPageTemplate.id == template_id,
        StorefrontPageTemplate.tenant_id == tenant_id
    ).first()
    
    return template


async def list_page_templates(
    db: Session,
    tenant_id: uuid.UUID,
    template_type: Optional[PageTemplateType] = None,
    status: Optional[TemplateStatus] = None,
    tags: Optional[List[str]] = None,
    search_query: Optional[str] = None,
    only_defaults: bool = False,
    limit: int = 20,
    offset: int = 0
) -> Tuple[List[StorefrontPageTemplate], int]:
    """
    List page templates for a tenant with filtering.
    
    Args:
        db: Database session
        tenant_id: UUID of the tenant
        template_type: Optional filter by template type
        status: Optional filter by status
        tags: Optional filter by tags
        search_query: Optional search in name and description
        only_defaults: Whether to return only default templates
        limit: Maximum number of templates to return
        offset: Offset for pagination
        
    Returns:
        Tuple of (list of templates, total count)
        
    Raises:
        HTTPException: 404 if tenant not found
    """
    # Check if tenant exists
    tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()
    if not tenant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tenant not found"
        )
    
    # Base query
    query = db.query(StorefrontPageTemplate).filter(
        StorefrontPageTemplate.tenant_id == tenant_id
    )
    
    # Apply template type filter
    if template_type:
        query = query.filter(StorefrontPageTemplate.template_type == template_type)
    
    # Apply status filter
    if status:
        query = query.filter(StorefrontPageTemplate.status == status)
    
    # Apply default filter
    if only_defaults:
        query = query.filter(StorefrontPageTemplate.is_default == True)
    
    # Apply tag filter (simplified - would need database-specific implementation)
    if tags and len(tags) > 0:
        # For PostgreSQL, could use array overlap
        # query = query.filter(StorefrontPageTemplate.tags.overlap(tags))
        pass
    
    # Apply search query
    if search_query:
        search_terms = f"%{search_query}%"
        query = query.filter(
            or_(
                StorefrontPageTemplate.name.ilike(search_terms),
                StorefrontPageTemplate.description.ilike(search_terms)
            )
        )
    
    # Get total count
    total_count = query.count()
    
    # Apply sorting and pagination
    query = query.order_by(desc(StorefrontPageTemplate.created_at))
    query = query.offset(offset).limit(limit)
    
    # Execute query
    templates = query.all()
    
    return templates, total_count


async def delete_page_template(
    db: Session,
    tenant_id: uuid.UUID,
    template_id: uuid.UUID,
    user_id: uuid.UUID
) -> bool:
    """
    Delete a page template.
    
    Args:
        db: Database session
        tenant_id: UUID of the tenant
        template_id: UUID of the template to delete
        user_id: UUID of the user deleting the template
        
    Returns:
        True if template was deleted, False if not found
        
    Raises:
        HTTPException: 404 if tenant or user not found
        HTTPException: 403 if user doesn't have permission
        HTTPException: 400 if template is in use or is the only default template
    """
    # Check if tenant exists
    tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()
    if not tenant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tenant not found"
        )
    
    # Check if user exists
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Get the template
    template = db.query(StorefrontPageTemplate).filter(
        StorefrontPageTemplate.id == template_id,
        StorefrontPageTemplate.tenant_id == tenant_id
    ).first()
    
    if not template:
        return False
    
    # Check permission
    has_perm = await has_permission(
        db=db,
        tenant_id=tenant_id,
        user_id=user_id,
        required_permission="delete",
        section=None
    )
    
    if not has_perm:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to delete page templates"
        )
    
    # Check if this is the only default template for its type
    if template.is_default:
        default_count = db.query(StorefrontPageTemplate).filter(
            StorefrontPageTemplate.tenant_id == tenant_id,
            StorefrontPageTemplate.template_type == template.template_type,
            StorefrontPageTemplate.is_default == True
        ).count()
        
        if default_count <= 1:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot delete the only default template for this page type"
            )
    
    # TODO: Check if template is in use before deleting
    # In a real implementation, check if the template is being used by any pages
    # before allowing deletion
    
    # Delete the template
    db.delete(template)
    db.commit()
    
    return True


async def publish_page_template(
    db: Session,
    tenant_id: uuid.UUID,
    template_id: uuid.UUID,
    user_id: uuid.UUID
) -> StorefrontPageTemplate:
    """
    Publish a page template.
    
    Args:
        db: Database session
        tenant_id: UUID of the tenant
        template_id: UUID of the template to publish
        user_id: UUID of the user publishing the template
        
    Returns:
        Published StorefrontPageTemplate
        
    Raises:
        HTTPException: 404 if tenant, user, or template not found
        HTTPException: 403 if user doesn't have permission
    """
    # Check if tenant exists
    tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()
    if not tenant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tenant not found"
        )
    
    # Check if user exists
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Get the template
    template = db.query(StorefrontPageTemplate).filter(
        StorefrontPageTemplate.id == template_id,
        StorefrontPageTemplate.tenant_id == tenant_id
    ).first()
    
    if not template:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Page template not found"
        )
    
    # Check permission
    has_perm = await has_permission(
        db=db,
        tenant_id=tenant_id,
        user_id=user_id,
        required_permission="publish",
        section=None
    )
    
    if not has_perm:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to publish page templates"
        )
    
    # Update status to published
    template.status = TemplateStatus.PUBLISHED
    template.published_at = datetime.now(timezone.utc)
    template.published_by = user_id
    template.modified_at = datetime.now(timezone.utc)
    template.modified_by = user_id
    
    db.commit()
    db.refresh(template)
    
    return template


async def duplicate_page_template(
    db: Session,
    tenant_id: uuid.UUID,
    template_id: uuid.UUID,
    user_id: uuid.UUID,
    new_name: Optional[str] = None
) -> StorefrontPageTemplate:
    """
    Duplicate an existing page template.
    
    Args:
        db: Database session
        tenant_id: UUID of the tenant
        template_id: UUID of the template to duplicate
        user_id: UUID of the user duplicating the template
        new_name: Optional name for the duplicated template
        
    Returns:
        Newly created StorefrontPageTemplate (the duplicate)
        
    Raises:
        HTTPException: 404 if tenant, user, or template not found
        HTTPException: 403 if user doesn't have permission
    """
    # Check if tenant exists
    tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()
    if not tenant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tenant not found"
        )
    
    # Check if user exists
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Get the source template
    source_template = db.query(StorefrontPageTemplate).filter(
        StorefrontPageTemplate.id == template_id,
        StorefrontPageTemplate.tenant_id == tenant_id
    ).first()
    
    if not source_template:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Page template not found"
        )
    
    # Check permission
    has_perm = await has_permission(
        db=db,
        tenant_id=tenant_id,
        user_id=user_id,
        required_permission="edit",
        section=None
    )
    
    if not has_perm:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to duplicate page templates"
        )
    
    # Create a new name if not provided
    if not new_name:
        new_name = f"{source_template.name} (Copy)"
    
    # Create the duplicate template
    duplicate = StorefrontPageTemplate(
        tenant_id=tenant_id,
        name=new_name,
        template_type=source_template.template_type,
        structure=source_template.structure,
        description=source_template.description,
        is_default=False,  # Never copy the default flag
        tags=source_template.tags,
        status=TemplateStatus.DRAFT,  # Always start as draft
        created_by=user_id,
        duplicated_from=source_template.id
    )
    
    db.add(duplicate)
    db.commit()
    db.refresh(duplicate)
    
    return duplicate


async def get_default_template(
    db: Session,
    tenant_id: uuid.UUID,
    template_type: PageTemplateType
) -> Optional[StorefrontPageTemplate]:
    """
    Get the default template for a specific page type.
    
    Args:
        db: Database session
        tenant_id: UUID of the tenant
        template_type: Type of page template
        
    Returns:
        Default StorefrontPageTemplate or None if not found
        
    Raises:
        HTTPException: 404 if tenant not found
    """
    # Check if tenant exists
    tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()
    if not tenant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tenant not found"
        )
    
    # Get the default template
    template = db.query(StorefrontPageTemplate).filter(
        StorefrontPageTemplate.tenant_id == tenant_id,
        StorefrontPageTemplate.template_type == template_type,
        StorefrontPageTemplate.is_default == True,
        StorefrontPageTemplate.status == TemplateStatus.PUBLISHED
    ).first()
    
    return template


async def validate_template_structure(
    template_type: PageTemplateType,
    structure: Dict[str, Any]
) -> None:
    """
    Validate template structure based on its type.
    
    Args:
        template_type: Type of page template
        structure: Structure to validate
        
    Raises:
        HTTPException: 400 if structure is invalid
    """
    # This is a simplified validation - in a real implementation,
    # you would have more complex validation based on template type
    
    # Check that structure has required sections
    if "sections" not in structure:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Template structure must have a 'sections' field"
        )
    
    sections = structure["sections"]
    if not isinstance(sections, list) or len(sections) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Template structure 'sections' must be a non-empty list"
        )
    
    # Validate each section
    for i, section in enumerate(sections):
        if "id" not in section:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Section at index {i} must have an 'id'"
            )
        
        if "type" not in section:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Section at index {i} must have a 'type'"
            )
        
        # If section has slots, validate them
        if "slots" in section:
            slots = section["slots"]
            if not isinstance(slots, list):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Section 'slots' at index {i} must be a list"
                )
            
            for j, slot in enumerate(slots):
                if "id" not in slot:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"Slot at index {j} in section {i} must have an 'id'"
                    )
    
    # Type-specific validation
    if template_type == PageTemplateType.HOME:
        # Check for hero section
        has_hero = any(section.get("type") == "hero" for section in sections)
        if not has_hero:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Home page template must have a hero section"
            )
    
    elif template_type == PageTemplateType.PRODUCT:
        # Check for product details section
        has_product_details = any(section.get("type") == "product_details" for section in sections)
        if not has_product_details:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Product page template must have a product details section"
            )
    
    elif template_type == PageTemplateType.CATEGORY:
        # Check for product list section
        has_product_list = any(section.get("type") == "product_list" for section in sections)
        if not has_product_list:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Category page template must have a product list section"
            )
