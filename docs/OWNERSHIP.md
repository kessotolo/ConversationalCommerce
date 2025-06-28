# ConversationalCommerce Product Ownership Structure

## Overview

This document defines the ownership structure for the ConversationalCommerce platform. It establishes clear responsibilities for each Product Manager (PM) and provides guidelines for collaboration across domains. This structure was designed to:

- Align technical modules with business outcomes
- Establish clear decision-making authority
- Reduce cross-team dependencies
- Support team growth and scaling

## Product Manager Domains and Responsibilities

### PM1: Merchant & Tenant Experience

**Role Summary:** Responsible for all aspects of the merchant's experience using our platform, from onboarding to daily operations.

**Business Goals:**
- Maximize merchant activation and retention
- Optimize onboarding completion rates
- Increase team member invitations and activations
- Improve merchant feature adoption

**Domain Ownership:**
- Merchant onboarding flows
- Business profile management
- Team management and permissions
- Merchant settings and preferences
- Tenant configuration
- KYC (Know Your Customer) processes

**Key Technical Areas:**
- `/frontend/src/modules/tenant`
- `/backend/app/models/tenant.py`
- `/backend/app/models/seller_profiles.py`
- `/backend/app/models/kyc_document.py`
- `/backend/app/models/kyc_info.py`
- `/frontend/src/modules/core` (merchant-facing components)
- Onboarding wizard workflows and UI

**Key Performance Indicators (KPIs):**
- Merchant activation rate
- Onboarding completion rate (and time-to-completion)
- Team invitation acceptance rate
- Merchant 30/60/90-day retention
- Feature adoption rates by merchants

### PM2: Buyer Experience & Storefront

**Role Summary:** Responsible for the end customer experience across all storefront touchpoints, ensuring intuitive product discovery and purchase journeys.

**Business Goals:**
- Maximize conversion rates on storefronts
- Increase buyer engagement metrics
- Optimize product discovery
- Improve theme adoption and customization

**Domain Ownership:**
- Storefront UI/UX
- Theme engine and customization
- Product discovery features
- Buyer onboarding
- Checkout UX (UI portion)
- All customer-facing interfaces

**Key Technical Areas:**
- `/frontend/src/modules/storefront`
- `/frontend/src/modules/theme`
- `/frontend/src/modules/product` (buyer-facing components)
- `/backend/app/models/storefront_themes.py`
- `/backend/app/models/products.py` (display aspects)
- Mobile-first UI implementation
- Product listing and detail pages

**Key Performance Indicators (KPIs):**
- Buyer conversion rate
- Average session duration
- Pages per session
- Product detail page engagement
- Theme adoption and customization rate
- Buyer Net Promoter Score (NPS)

### PM3: Conversation & Commerce in Chat

**Role Summary:** Responsible for the conversational commerce capabilities, enabling transactions through messaging channels.

**Business Goals:**
- Drive commerce through messaging channels
- Maximize conversational engagement
- Improve natural language understanding
- Increase conversion from chat to purchase

**Domain Ownership:**
- Messaging interfaces
- Conversation flows and state management
- External channel integrations (WhatsApp/IG/TikTok)
- Natural Language Processing (NLP)
- Conversational cart
- Chat-based checkout experiences

**Key Technical Areas:**
- `/frontend/src/modules/conversation`
- `/backend/app/conversation`
- `/backend/app/models/conversation_events.py`
- Messaging API integrations
- Webhook endpoints for external messaging platforms
- NLP training and implementation

**Key Performance Indicators (KPIs):**
- Conversation initiation rate
- Chat-to-order conversion rate
- NLP intent recognition accuracy
- Average conversation duration
- Channel-specific engagement metrics
- Revenue generated through conversational channels

### PM4: Orders, Payments & Fulfillment

**Role Summary:** Responsible for the complete transaction lifecycle from payment processing through fulfillment and post-purchase experiences.

**Business Goals:**
- Maximize order completion rate
- Optimize payment processing success
- Streamline fulfillment operations
- Drive repeat purchases

**Domain Ownership:**
- Order lifecycle management
- Payment processing
- Payment methods and saved payment information
- Shipping and fulfillment
- Address management
- Post-purchase experiences

**Key Technical Areas:**
- `/frontend/src/modules/order`
- `/frontend/src/modules/payment`
- `/backend/app/services/payment`
- `/backend/app/services/shipping`
- `/backend/app/models/orders.py`
- `/backend/app/models/saved_payment_methods.py`
- `/backend/app/models/address_book.py`

**Key Performance Indicators (KPIs):**
- Order completion rate
- Payment success rate
- Average order value
- Shipping time accuracy
- Fulfillment SLA compliance
- Repeat purchase rate
- Cart abandonment rate

### PM5: Monitoring, Analytics & Enforcement

**Role Summary:** Responsible for platform health, data insights, compliance and enforcement policies.

**Business Goals:**
- Ensure platform reliability and performance
- Drive data-informed decision making
- Maintain content quality standards
- Ensure regulatory compliance

**Domain Ownership:**
- System monitoring and alerting
- Analytics dashboards
- Business intelligence
- Content moderation
- Policy enforcement
- Admin tools and reporting

**Key Technical Areas:**
- `/frontend/src/modules/monitoring`
- `/frontend/src/modules/dashboard`
- `/backend/app/api/v1/endpoints/dashboard.py`
- Violation tracking systems
- Content moderation tools
- Admin panels and reporting systems

**Key Performance Indicators (KPIs):**
- Platform uptime
- Incident response time
- Dashboard usage metrics
- Content review turnaround time
- Policy violation detection rate
- Admin task completion efficiency

## Cross-Domain Collaboration

Many features require collaboration between multiple domains. This section outlines the collaboration model for such features.

### Collaboration Principles

1. **Primary Owner Assignment**: Every feature must have one PM designated as the primary owner, even if it spans multiple domains.

2. **Early Collaboration**: Cross-domain features must involve all relevant PMs from the planning stage.

3. **Clear Interfaces**: Teams should define clear interfaces between domains when building cross-domain features.

4. **Documentation**: All cross-domain features must include documentation of ownership boundaries and interfaces.

### Common Cross-Domain Features

| Feature | Primary Owner | Contributing Owners | Collaboration Approach |
|---------|--------------|---------------------|------------------------|
| Checkout in Chat | PM3 | PM4 | PM3 owns the conversation flow and UI; PM4 owns the payment processing and order creation. They collaborate on the checkout experience design. |
| Product Display in Chat | PM3 | PM2 | PM3 owns the conversation context; PM2 provides product display components that can be embedded in conversations. |
| Merchant Analytics Dashboard | PM5 | PM1 | PM5 owns the analytics infrastructure and display; PM1 defines merchant-specific requirements and KPIs. |
| Order Status Notifications | PM4 | PM3 | PM4 owns the order status changes and triggers; PM3 owns the notification delivery through messaging channels. |
| Storefront Payment Integration | PM2 | PM4 | PM2 owns the checkout UI; PM4 owns the payment processing logic. |

### Decision Making Process

For cross-domain features, use the following process to resolve disagreements:

1. **Direct Discussion**: The involved PMs should first attempt to resolve the issue directly.

2. **Design Review**: If needed, conduct a formal design review with all affected PMs.

3. **Prioritization Framework**: Use the agreed-upon prioritization framework to evaluate trade-offs.

4. **Escalation**: If consensus cannot be reached, escalate to the Head of Product for final decision.

## Implementation Guidelines

### Adding New Features

1. **Ownership Identification**: Identify the appropriate PM owner(s) before development starts.

2. **Documentation**: Update relevant documentation to reflect any new ownership boundaries.

3. **Code Review**: Ensure code reviews include relevant PM owners or their designated reviewers.

### Repository Management

1. **CODEOWNERS**: The repository uses GitHub's CODEOWNERS feature to automatically assign reviewers based on ownership.

2. **Branch Protection**: Protected branches require approval from assigned code owners.

3. **Review Requirements**: Pull requests affecting multiple domains require approval from all affected domain owners.

## Getting Help

If you're unsure about which PM owns a particular feature or area:

1. Check this document and the CODEOWNERS file.
2. Review the module structure and match it to the PM domains.
3. Ask in the #product-ownership Slack channel.
4. For urgent issues, contact the Head of Product.

## Onboarding New Team Members

New team members should:

1. Read this ownership document in full
2. Meet with each PM to understand their domain
3. Review the module boundaries in the codebase
4. Participate in a walkthrough of a cross-domain feature

## Revision History

| Date | Version | Changes | Author |
|------|---------|---------|--------|
| 2025-06-23 | 1.0 | Initial version | Kess |

## Appendices

### Appendix A: Module to Owner Mapping

| Module | Owner | Notes |
|--------|-------|-------|
| tenant | PM1 | Includes all tenant configuration |
| conversation | PM3 | All messaging capabilities |
| product | PM2/PM4 | PM2 owns display aspects, PM4 owns catalog management |
| order | PM4 | Complete order lifecycle |
| payment | PM4 | All payment processing |
| storefront | PM2 | Customer-facing UI |
| theme | PM2 | Appearance customization |
| shipping | PM4 | Fulfillment and logistics |
| monitoring | PM5 | System health and metrics |
| dashboard | PM5 | Analytics and reporting |

### Appendix B: Terminology

| Term | Definition |
|------|------------|
| Domain | A business area with cohesive functionality |
| Module | A technical implementation of domain concepts |
| Primary Owner | The PM with final decision authority for a feature |
| Contributing Owner | PMs who provide input but don't have final decision authority |
