# ConversationalCommerce Coding Rules

## 1. File & Component Organization
- **One React component per file**. No multi-component files except for small helpers.
- **Maximum file length:** 500 lines. Split large files into subcomponents or utility modules.
- **Directory structure:**
  - `core/` for base types, services, and cross-cutting concerns
  - `modules/<domain>/` for feature modules (e.g., `tenant`, `analytics`, `settings`)
  - `components/ui/` for UI primitives (shadcn/ui, Tailwind, semantic HTML)
- **No bridge files:** All imports must be direct from their module's public API. Do not use legacy `/types/` bridge patterns.

## 2. Import Rules
- **Absolute imports** only, using the `@/` alias for all internal modules.
- **No indirect imports** (bridge files, barrel files) unless explicitly defined as a module public API.
- **No cross-module imports** except via public APIs.

## 3. Type Safety
- **TypeScript strict mode** must be enabled (`strict: true` in `tsconfig.json`).
- **No `any` types**. Use explicit, precise types and interfaces.
- **Prefer domain models** from `core/models/base` and module models over ad-hoc types.

## 4. Database & Model Rules
- **UUID primary keys mandatory:** All database models MUST use UUID primary keys with the pattern:
  ```python
  id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
  ```
- **UUID foreign keys mandatory:** All foreign key relationships MUST use UUIDs:
  ```python
  tenant_id = Column(UUID(as_uuid=True), ForeignKey("tenants.id"), nullable=False)
  ```
- **No Integer or String primary keys** except for legacy system integrations with explicit justification.
- **Consistent imports:** Always import `uuid` and `UUID` from `sqlalchemy.dialects.postgresql`:
  ```python
  import uuid
  from sqlalchemy.dialects.postgresql import UUID
  ```
- **Multi-tenant isolation:** All tenant-scoped models MUST include `tenant_id` as a UUID foreign key.
- **Relationship consistency:** All model relationships must reference UUID fields consistently.

## 5. Accessibility & Testability
- **All form controls:**
  - Must have a `<label>` with `htmlFor` linked to the input's `id`.
  - Add `aria-label` where necessary for clarity.
  - Use `data-testid` attributes for all elements referenced in tests.
- **Semantic HTML** is required for all UI and forms.
- **WCAG AA** accessibility compliance is mandatory.

## 6. Styling
- **Tailwind CSS** is the default for all new styles.
- **No inline styles** except for dynamic cases.
- **shadcn/ui primitives** must use camelCase filenames and imports (e.g., `button.tsx`, not `Button.tsx`).
- **No Chakra UI or Material UI**. All legacy code must be migrated.

## 7. Linting & Formatting
- **ESLint** and **Prettier** must be enabled and run on every commit (pre-commit hook).
- **No lint or type errors** allowed in main or feature branches.

## 8. Testing
- **React Testing Library** for all component tests.
- **No reliance on brittle selectors** (use `data-testid` and accessible roles/labels).
- **Tests must pass before merging.**

## 9. Build & Environment
- **No client-only hooks** (e.g., `useSearchParams`) outside `<React.Suspense>` boundaries in Next.js App Router.
- **No build-time hacks**. Use environment variables and provider patterns for SSR/SSG compatibility.

## 10. Implementation Standards
- **No mocks and hacks:** Real implementation only. No mock services, stub implementations, or temporary workarounds.
- **Production-ready code:** All code must be production-grade from the start.
- **Complete implementations:** No half-finished features or placeholder code in main branches.

## 11. Documentation
- **All modules** must have a `README.md` describing their API, usage, and extension points.
- **All architectural decisions** must be documented in `/docs/`.

---

> _For any questions, consult the module README, `/docs/`, or ask the core maintainers._
