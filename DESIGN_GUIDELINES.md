# ConversationalCommerce Design Guidelines

## 1. Design System & UI Primitives
- **shadcn/ui** is the canonical source for all UI primitives (buttons, inputs, popovers, etc.).
- **Tailwind CSS** is used for all layout, spacing, and color.
- **No Chakra UI or Material UI**. All components must be migrated.
- **Component filenames:** Use `camelCase` (e.g., `toastProvider.tsx`, `popover.tsx`).

## 2. Layout & Responsiveness
- **Mobile-first** design. All UIs must look and work well on small screens.
- **Use Tailwind's responsive classes** for breakpoints and adaptive layouts.
- **No fixed pixel widths** except for icons or avatars.

## 3. Accessibility (a11y)
- **All interactive elements** must be keyboard accessible.
- **Use semantic HTML** (e.g., `<button>`, `<nav>`, `<form>`, `<input>`).
- **Color contrast** must meet WCAG AA standards.
- **Use `aria-label`, `aria-*` attributes** as needed for screen readers.

## 4. UX Patterns
- **Progressive disclosure:** Only show advanced options when needed.
- **Clear error and success states:** Use color and icons for feedback.
- **Non-blocking notifications:** Use toast notifications, not alerts.
- **Skeletons for loading:** Use skeleton screens for async content.
- **Consistent spacing and sizing:** Use Tailwind spacing scale.

## 5. Branding & Theming
- **Brand palette** is defined in Tailwind config. No ad-hoc colors.
- **Theme settings** should support light/dark mode where possible.
- **Custom themes** must extend, not override, the base Tailwind config.

## 6. Iconography & Imagery
- **Use SVG icons** (preferably Heroicons or shadcn/ui icons).
- **No raster images** for UI icons.
- **All images** must have `alt` text.

## 7. Documentation
- **All new components** must be documented with usage examples and props in the module README.
- **Design decisions** and rationale should be recorded in `/docs/`.

---

> _For questions about UI/UX, consult `/docs/DESIGN_GUIDELINES.md` or the design lead._
