# Deployment Guide for Conversational Commerce

This guide provides comprehensive instructions for deploying the Conversational Commerce frontend application to both Netlify and Vercel environments.

## Architecture Overview

The frontend uses a clean modular monolith architecture with build-safe authentication. This approach:

- Eliminates the need for hacky build-time file modifications
- Follows proper architectural boundaries between modules
- Handles authentication safely during static generation
- Supports both the Pages Router and App Router components

## Prerequisites

- Node.js v18.17.0 or higher
- npm v9.6.7 or higher
- Git access to the repository

## Environment Variables

The following environment variables must be set in your deployment platform:

```
# Required for production
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_****    # Your actual Clerk publishable key
CLERK_SECRET_KEY=sk_****                     # Your actual Clerk secret key
NEXT_PUBLIC_API_URL=https://your-api.com     # Backend API URL

# Build configuration (set automatically by CI)
IS_BUILD_TIME=true                           # Set to true during build process
NEXT_TELEMETRY_DISABLED=1                    # Disable Next.js telemetry during build
```

During build time, the `IS_BUILD_TIME` variable is used to detect build environment and disable authentication-related operations that would cause static generation errors.

## Deployment to Netlify

### Setup

1. Connect your repository to Netlify
2. Configure the build settings:
   - Build command: `npm run build`
   - Publish directory: `.next`
3. Set environment variables in Netlify UI:
   - Add all required environment variables
   - For build-time, Netlify automatically sets `IS_BUILD_TIME=true`

### netlify.toml Configuration

The root `netlify.toml` file includes:

```toml
[build]
  command = "npm run build"
  publish = ".next"

[build.environment]
  NEXT_TELEMETRY_DISABLED = "1"
  NODE_OPTIONS = "--max_old_space_size=4096"
  # These are intentionally empty during build time
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY = ""
  CLERK_SECRET_KEY = ""
  IS_BUILD_TIME = "true"

[build.processing]
  skip_processing = false

[build.processing.css]
  bundle = true
  minify = true

[build.processing.js]
  bundle = true
  minify = true

[build.processing.images]
  compress = true

[[plugins]]
  package = "@netlify/plugin-nextjs"
```

## Deployment to Vercel

### Setup

1. Import your repository to Vercel
2. Configure the project:
   - Framework Preset: Next.js
   - Root Directory: `./frontend`
3. Set environment variables in Vercel UI:
   - Add all required environment variables
   - Add `IS_BUILD_TIME=true` for build-time safety

### vercel.json Configuration

Create a `vercel.json` file with:

```json
{
  "buildCommand": "npm run build",
  "env": {
    "IS_BUILD_TIME": "true",
    "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY": "",
    "CLERK_SECRET_KEY": ""
  }
}
```

## Build Process

The build process follows these steps:

1. Standard Next.js build (`next build`)
2. Authentication is disabled during build through environment variables
3. SafeClerkProvider detects build environment and bypasses Clerk
4. Pages are statically generated safely without auth errors
5. Deployment platform deploys the built assets

### Build-time vs. Runtime

- **Build-time**: Authentication is disabled by setting empty Clerk keys and `IS_BUILD_TIME=true`
- **Runtime**: Full authentication using the actual API keys

## Troubleshooting

### Common Build Issues

1. **Authentication Errors**

   - Symptoms: Errors with Clerk hooks outside ClerkProvider
   - Solution: Ensure all components use the core `useAuth` hook and that build-time detection is working

2. **Module Recognition Issues**

   - Symptoms: Next.js not recognizing certain pages as proper modules
   - Solution: Ensure export syntax is correct and remove any URL-encoded folder names

3. **ESLint/TypeScript Errors**
   - Symptoms: Build fails with ESLint or TypeScript errors
   - Solution: Temporarily disable with:
     ```js
     // in next.config.js
     eslint: { ignoreDuringBuilds: true },
     typescript: { ignoreBuildErrors: true },
     ```

## Type Safety and Code Quality

The application uses TypeScript and ESLint for code quality. In the build pipeline:

1. TypeScript type checking can be enabled/disabled in `next.config.js`
2. ESLint can be configured with different levels of strictness for local development vs. build

To incrementally re-enable type checking and linting:

1. Fix type errors in one module at a time
2. Re-enable TypeScript checking once core modules are fixed
3. Add pre-commit hooks for local validation

## Best Practices

- Always use the core domain's `useAuth` hook rather than direct Clerk hooks
- Test builds locally before pushing to production
- Keep Clerk keys empty during build time
- Update environment variables on all deployment platforms when keys change
- Run type checking locally before pushing code
