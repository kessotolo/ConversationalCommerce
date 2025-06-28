# Banner Orchestrator Workflows

## Create Banner

1. Validate input data (if needed)
2. Check tenant and user existence
3. Check permissions
4. Check asset existence
5. Create banner (CRUD)
6. Track asset usage
7. Return result

```mermaid
graph TD
  A[API Endpoint] --> B[BannerOrchestrator]
  B --> C[CRUD: create_banner]
  C --> D[Permissions]
  C --> E[Asset Check]
  C --> F[Track Asset Usage]
```

## Publish Banner

1. Check tenant and user existence
2. Check permissions
3. Get banner
4. Set status to published, update timestamps
5. Commit and return

```mermaid
graph TD
  A[API Endpoint] --> B[BannerOrchestrator]
  B --> C[Publish: publish_banner]
  C --> D[Permissions]
  C --> E[Update Status]
```

## Reorder Banners

1. Check tenant and user existence
2. Check permissions
3. Update display_order for each banner
4. Commit and return updated banners

```mermaid
graph TD
  A[API Endpoint] --> B[BannerOrchestrator]
  B --> C[Order: reorder_banners]
  C --> D[Permissions]
  C --> E[Update display_order]
```

---

- All orchestrator functions coordinate sub-services and enforce modularity.
- Each submodule (CRUD, publish, order) is single-responsibility.
- All permission checks and error handling are centralized.