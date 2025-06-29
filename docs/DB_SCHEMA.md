# ConversationalCommerce Database Schema

This document outlines the database schema of the ConversationalCommerce platform, describing the main tables and their relationships.

## Core Tables

### Users and Authentication

**users**
- Primary key: `id` (UUID)
- Key fields: `email`, `is_seller`, `tenant_id`
- Relationships:
  - One-to-many with `complaints`, `violations`
  - One-to-one with `buyer_profile`, `seller_profile`

**buyer_profile**
- Primary key: `id` (UUID)
- Key fields: `user_id`, `phone_number`, `full_name`, `preferred_language`
- Relationships:
  - Many-to-one with `users`
  - One-to-many with `address_book`, `saved_payment_methods`, `orders`

**seller_profile**
- Primary key: `id` (UUID)
- Key fields: `user_id`, `business_name`, `business_type`, `phone_number`
- Relationships:
  - Many-to-one with `users`
  - One-to-many with `products`, `orders`
  - One-to-one with `seller_onboarding`

**tenant**
- Primary key: `id` (UUID)
- Key fields: `name`, `domain`, `subscription_tier`, `is_active`
- Relationships:
  - One-to-many with `users`, `team_members`, `team_invites`, `products`
  - One-to-one with `storefront`

### Team Management

**team_members**
- Primary key: `id` (UUID)
- Key fields: `tenant_id`, `user_id`, `role`, `permissions`
- Relationships:
  - Many-to-one with `tenant`
  - Many-to-one with `users`

**team_invites**
- Primary key: `id` (UUID)
- Key fields: `tenant_id`, `email`, `role`, `status`, `expires_at`, `created_by`
- Relationships:
  - Many-to-one with `tenant`

### Products and Commerce

**products**
- Primary key: `id` (UUID)
- Key fields: `name`, `description`, `price`, `tenant_id`, `seller_id`, `inventory_count`, `is_active`
- Relationships:
  - Many-to-one with `tenant`
  - Many-to-one with `seller_profile`
  - One-to-many with `orders`

**orders**
- Primary key: `id` (UUID)
- Key fields: `product_id`, `seller_id`, `tenant_id`, `customer_id`, `status`, `channel`, `total_amount`
- Relationships:
  - Many-to-one with `products`
  - Many-to-one with `buyer_profile`
  - One-to-many with `order_items`
  - One-to-many with `order_returns`
  - One-to-one with `order_channel_meta`

**order_items**
- Primary key: `id` (UUID)
- Key fields: `order_id`, `product_id`, `quantity`, `unit_price`, `subtotal`
- Relationships:
  - Many-to-one with `orders`
  - Many-to-one with `products`

**order_returns**
- Primary key: `id` (UUID)
- Key fields: `order_id`, `status`, `reason`, `approved_by`, `return_date`
- Relationships:
  - Many-to-one with `orders`

**order_channel_meta**
- Primary key: `id` (UUID)
- Key fields: `order_id`, `channel_type`, `channel_data`
- Relationships:
  - One-to-one with `orders`

### Address and Payment

**address_book**
- Primary key: `id` (UUID)
- Key fields: `user_id`, `address_type`, `is_default`, `recipient_name`, `street_address`, `city`, `state`, `country`
- Relationships:
  - Many-to-one with `buyer_profile`

**saved_payment_method**
- Primary key: `id` (UUID)
- Key fields: `user_id`, `payment_type`, `is_default`, `card_last_four`, `expiry_month`, `expiry_year`
- Relationships:
  - Many-to-one with `buyer_profile`

### Notifications and Preferences

**notification_preferences**
- Primary key: `id` (UUID)
- Key fields: `user_id`, `notification_type`, `email_enabled`, `sms_enabled`, `push_enabled`, `in_app_enabled`
- Relationships:
  - Many-to-one with `users`

## Seller Onboarding and Verification

**seller_onboarding**
- Primary key: `id` (UUID)
- Key fields: `seller_id`, `onboarding_status`, `verification_status`, `submitted_at`, `verified_at`, `rejected_at`
- Relationships:
  - One-to-one with `seller_profile`
  - One-to-many with `kyc_documents`

**kyc_document**
- Primary key: `id` (UUID)
- Key fields: `seller_onboarding_id`, `document_type`, `document_url`, `verification_status`
- Relationships:
  - Many-to-one with `seller_onboarding`

**kyc_info**
- Primary key: `id` (UUID)
- Key fields: `seller_id`, `business_registration_number`, `tax_id`, `verification_status`
- Relationships:
  - One-to-one with `seller_onboarding`

## Storefront and User Interface

**storefront**
- Primary key: `id` (UUID)
- Key fields: `tenant_id`, `theme_id`, `is_published`, `custom_domain`
- Relationships:
  - One-to-one with `tenant`
  - Many-to-one with `storefront_theme`
  - One-to-many with `storefront_versions`
  - One-to-many with `storefront_drafts`

**storefront_theme**
- Primary key: `id` (UUID)
- Key fields: `name`, `description`, `is_system`, `tenant_id`
- Relationships:
  - Many-to-one with `tenant`
  - One-to-many with `storefronts`

**storefront_asset**
- Primary key: `id` (UUID)
- Key fields: `tenant_id`, `file_name`, `file_type`, `url`, `created_by`
- Relationships:
  - Many-to-one with `tenant`

**storefront_banner**
- Primary key: `id` (UUID)
- Key fields: `storefront_id`, `asset_id`, `is_active`, `banner_type`
- Relationships:
  - Many-to-one with `storefront`
  - Many-to-one with `storefront_asset`

## Conversation and Communication

**conversation_history**
- Primary key: `id` (UUID)
- Key fields: `tenant_id`, `channel_id`, `customer_id`, `message`, `direction`
- Relationships:
  - Many-to-one with `tenant`
  - Many-to-one with `customer`

**conversation_event**
- Primary key: `id` (UUID)
- Key fields: `conversation_id`, `event_type`, `metadata`
- Relationships:
  - Many-to-one with `conversation_history`

## Entity Relationship Diagram (Simplified)

```
┌─────────────┐       ┌───────────────┐       ┌──────────────┐
│  tenant     │←──────┤  users        │←──────┤ buyer_profile│
└─────┬───────┘       └───────┬───────┘       └──────┬───────┘
      │                       │                      │
      ▼                       ▼                      │
┌─────────────┐       ┌───────────────┐             │
│team_members │       │seller_profile │             │
└─────────────┘       └───────┬───────┘             │
                              │                      │
                              ▼                      │
┌─────────────┐       ┌───────────────┐             │
│team_invites │       │seller_onboarding│           │
└─────────────┘       └───────┬───────┘             │
                              │                      │
                              ▼                      │
┌─────────────┐       ┌───────────────┐             │
│kyc_documents│◀──────┤ kyc_info     │             │
└─────────────┘       └───────────────┘             │
                                                    │
┌─────────────┐       ┌───────────────┐             │
│ products    │──────▶│    orders     │◀────────────┘
└─────┬───────┘       └───────┬───────┘
      │                       │
      │                       ▼
      │               ┌───────────────┐       ┌──────────────┐
      └──────────────▶│  order_items  │       │order_returns │
                      └───────────────┘       └──────────────┘

┌─────────────┐       ┌───────────────┐       ┌──────────────┐
│address_book │◀──────┤buyer_profile  │─────▶│saved_payment_method│
└─────────────┘       └───────────────┘       └──────────────┘

┌─────────────┐       ┌───────────────┐       ┌──────────────┐
│  storefront │◀──────┤    tenant     │─────▶│storefront_theme│
└─────┬───────┘       └───────────────┘       └──────────────┘
      │
      ▼
┌─────────────┐       ┌───────────────┐
│storefront_banner│   │storefront_asset│
└─────────────┘       └───────────────┘
```

## Key Relationships

1. **Users & Tenants**:
   - Each user belongs to one tenant (except system admins)
   - Tenant isolation is enforced at the database level using Row-Level Security

2. **Buyer & Seller Profiles**:
   - Each user can have either a buyer or seller profile (or both)
   - Seller profiles connect to products, orders, and onboarding records

3. **Orders & Products**:
   - Orders contain order items that reference products
   - Orders track status, payment, and fulfillment information
   - Channel-specific metadata is stored in separate tables

4. **Team Management**:
   - Team members associate users with tenants and define roles
   - Team invites manage the invitation workflow

5. **Seller Verification**:
   - Seller onboarding tracks the verification process
   - KYC documents store verification documents and their status

## Database Design Principles

1. **Tenant Isolation**:
   - All tables with tenant-specific data have a `tenant_id` column
   - PostgreSQL Row-Level Security enforces tenant isolation
   - All queries include tenant context to ensure proper isolation

2. **Audit and Versioning**:
   - Most tables include `created_at` and `updated_at` timestamps
   - Key entities use optimistic locking with version fields
   - Critical operations are logged in audit tables

3. **Soft Deletions**:
   - Many entities implement soft delete with `is_deleted` flag
   - Allows for data recovery and maintains referential integrity

4. **Normalization**:
   - The schema follows normalization principles with minimal redundancy
   - Related data is connected through foreign keys
   - JSONB fields are used for flexible metadata when appropriate
