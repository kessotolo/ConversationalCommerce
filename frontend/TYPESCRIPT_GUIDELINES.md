# TypeScript Guidelines and Best Practices

This document outlines guidelines and best practices to maintain type safety and prevent common TypeScript errors in the ConversationalCommerce frontend codebase.

## Common Issues and How to Avoid Them

### 1. JSX Pragma Conflicts (TS17004)

**Issue**: Multiple JSX pragmas leading to "Cannot use JSX unless the '--jsx' flag is provided" errors.

**Solution**:
- Do not add JSX pragmas (`/** @jsx jsx */`) in individual files when using Next.js with TypeScript.
- The project already has global JSX configuration in `tsconfig.json` with `"jsx": "preserve"`.
- For Emotion CSS-in-JS, use the `@emotion/react` import without the JSX pragma:
  ```tsx
  // ✅ CORRECT
  import { css } from '@emotion/react';
  
  // ❌ INCORRECT - Do not use JSX pragma
  /** @jsx jsx */
  import { css, jsx } from '@emotion/react';
  ```

### 2. Date Handling and Type Safety

**Issue**: Incorrect type handling with Date objects often leads to errors.

**Solution**:
- Always use proper type guards when working with date inputs:
  ```tsx
  // ✅ CORRECT
  function handleDateChange(date: Date | null) {
    if (date instanceof Date) {
      // Safe to use date methods
    }
  }
  
  // ❌ INCORRECT
  function handleDateChange(date: any) {
    // Unsafe access to date methods
    const year = date.getFullYear();
  }
  ```
- Consider using a date utility library like date-fns for complex date operations.

### 3. Component Props and Event Handlers

**Issue**: Unclear typing for component props and event handlers.

**Solution**:
- Always define explicit interfaces for component props:
  ```tsx
  // ✅ CORRECT
  interface ButtonProps {
    onClick?: React.MouseEventHandler<HTMLButtonElement>;
    children: React.ReactNode;
    disabled?: boolean;
  }
  
  // ❌ INCORRECT
  const Button = (props: any) => { ... }
  ```
- Use specific event types for handlers:
  ```tsx
  // ✅ CORRECT
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => { ... }
  
  // ❌ INCORRECT
  const handleChange = (e) => { ... }
  ```

### 4. Optional Chaining and Nullish Handling

**Issue**: Type errors from accessing possibly undefined properties.

**Solution**:
- Use optional chaining and nullish coalescing:
  ```tsx
  // ✅ CORRECT
  const userName = user?.profile?.name ?? 'Guest';
  
  // ❌ INCORRECT
  const userName = user.profile.name || 'Guest';
  ```
- Add proper null/undefined checks when TypeScript flags potential issues.

### 5. Import Issues

**Issue**: Unused imports causing TypeScript warnings.

**Solution**:
- Regularly clean up unused imports.
- Configure your editor to auto-remove unused imports on save.
- Do not comment out unused code; remove it or refactor to use it.

## Tools and Configuration

### Type Checking Before Commit

Run type checking before committing changes:

```bash
npm run type-check
```

### ESLint Configuration

Ensure ESLint is properly configured to catch TypeScript-specific issues:

```bash
npm run lint
```

## When Adding New Code

1. Ensure all new components have proper prop interfaces
2. Avoid using `any` type - be explicit about types
3. Use React's built-in event types for handlers
4. Test with `npm run type-check` before committing

Remember: A properly typed codebase is more maintainable, has fewer runtime errors, and provides better developer experience through IDE tooling.
