# API Versioning Strategy

## Overview

The Conversational Commerce Platform uses a path-based API versioning strategy to ensure backward compatibility while allowing for innovation and evolution of the API. This document outlines our approach to versioning, when to create new versions, and guidelines for migrating between versions.

## Versioning Strategy

### Path-Based Versioning

We use path-based versioning where the API version is included in the URL path:

```
/api/v1/orders
/api/v2/orders
```

This approach offers several advantages:

- Clear distinction between different API versions
- Easy to understand and implement for API consumers
- Allows multiple versions to coexist in the codebase
- Facilitates gradual migration of clients from one version to another

### Current API Versions

- **v1**: Original API, stable and backward compatible
- **v2**: Enhanced API with improved features and breaking changes

## When to Create a New API Version

A new API version should be created when making changes that are not backward compatible with the current version. Examples include:

1. **Changing the resource model structure** (e.g., renaming, removing, or restructuring fields)
2. **Modifying the behavior of an existing endpoint** in a way that changes its output or expected input
3. **Changing authentication or authorization mechanisms**
4. **Introducing significant new functionality** that requires a different design approach

For changes that maintain backward compatibility (e.g., adding new fields, new endpoints, or optional parameters), versioning is not necessary.

## Implementation Guidelines

### Directory Structure

The API code is organized by version in the codebase:

```
/app/api/
  /v1/
    /endpoints/
      orders.py
      products.py
      ...
  /v2/
    /endpoints/
      orders.py
      products.py
      ...
```

### Documentation

- Each API version must be fully documented
- Changes between versions must be clearly noted
- Documentation should include examples of how to use each version

### Maintenance Policy

- **v1 API**: Will be maintained for a minimum of 12 months after v2 is released
- **v2 API**: Currently active development version
- Deprecation notices will be communicated at least 3 months before an API version is phased out

## Migration Plan

### For API Consumers

1. **Review documentation** for the new API version
2. **Identify breaking changes** between versions
3. **Update client code** to handle the new API structure
4. **Test thoroughly** with the new version
5. **Switch endpoints** from `/api/v1/...` to `/api/v2/...`
6. **Monitor for issues** after migration

### For API Developers

1. **Never modify existing v1 endpoints** in ways that break backward compatibility
2. **Implement new features in v2** when they require breaking changes
3. **Duplicate common code** only when necessary; prefer shared utilities
4. **Create v2 parallel implementations** for endpoints requiring breaking changes
5. **Update documentation** for both v1 and v2 APIs
6. **Add tests** for both v1 and v2 endpoints

## Best Practices

1. **Client-Side Compatibility**: Consider implementing client-side adapters to handle both versions
2. **Progressive Migration**: Migrate one endpoint at a time rather than all at once
3. **Monitoring**: Track usage of different API versions to inform deprecation timelines
4. **Communication**: Proactively inform users about new versions and deprecation plans

## Examples

### Example: Breaking Change in Orders API

**v1 Orders Response:**

```json
{
  "id": "order_123",
  "customer": "John Doe",
  "total": 100.0
}
```

**v2 Orders Response:**

```json
{
  "id": "order_123",
  "customer": {
    "first_name": "John",
    "last_name": "Doe"
  },
  "amount": {
    "value": 100.0,
    "currency": "USD"
  }
}
```

This change requires a new version because the structure of customer and total/amount fields changed significantly.
