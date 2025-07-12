from datetime import datetime, timezone
from typing import List, Optional
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException

from backend.app.core.monitoring.rules_engine import Rule, RuleSeverity, rules_engine
from backend.app.core.security.clerk_multi_org import MultiOrgClerkTokenData as ClerkTokenData
from backend.app.core.security.dependencies import get_current_user

router = APIRouter()


@router.post("/rules", response_model=Rule)
async def create_rule(
    rule: Rule, current_user: ClerkTokenData = Depends(get_current_user)
):
    """Create a new monitoring rule"""
    # Ensure rule has an ID
    if not rule.id:
        rule.id = str(uuid4())

    # Set timestamps
    now = datetime.now(timezone.utc)
    rule.created_at = now
    rule.updated_at = now

    # Add rule to engine
    rules_engine.add_rule(rule)
    return rule


@router.get("/rules", response_model=List[Rule])
async def list_rules(
    tenant_id: str,
    severity: Optional[RuleSeverity] = None,
    current_user: ClerkTokenData = Depends(get_current_user),
):
    """List all rules for a tenant"""
    rules = rules_engine.get_rules(tenant_id)
    if severity:
        rules = [r for r in rules if r.severity == severity]
    return rules


@router.get("/rules/{rule_id}", response_model=Rule)
async def get_rule(
    rule_id: str,
    tenant_id: str,
    current_user: ClerkTokenData = Depends(get_current_user),
):
    """Get a specific rule"""
    rules = rules_engine.get_rules(tenant_id)
    rule = next((r for r in rules if r.id == rule_id), None)
    if not rule:
        raise HTTPException(status_code=404, detail="Rule not found")
    return rule


@router.put("/rules/{rule_id}", response_model=Rule)
async def update_rule(
    rule_id: str, rule: Rule, current_user: ClerkTokenData = Depends(get_current_user)
):
    """Update a rule"""
    if rule.id != rule_id:
        raise HTTPException(status_code=400, detail="Rule ID mismatch")

    rule.updated_at = datetime.now(timezone.utc)
    rules_engine.update_rule(rule)
    return rule


@router.delete("/rules/{rule_id}")
async def delete_rule(
    rule_id: str,
    tenant_id: str,
    current_user: ClerkTokenData = Depends(get_current_user),
):
    """Delete a rule"""
    rules_engine.remove_rule(rule_id, tenant_id)
    return {"status": "success", "message": "Rule deleted"}
