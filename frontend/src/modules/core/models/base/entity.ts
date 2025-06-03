/**
 * Base entity interface with common properties
 * that all domain entities should implement
 */
export interface Entity {
  id: string; // Using string for UUID compatibility
  created_at?: string;
  updated_at?: string;
}

/**
 * Interface for entities that are scoped to a tenant
 * Used for multi-tenant isolation
 */
export interface TenantScoped extends Entity {
  tenant_id: string;
}
