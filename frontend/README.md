This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/pages/api-reference/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `pages/index.tsx`. The page auto-updates as you edit the file.

[API routes](https://nextjs.org/docs/pages/building-your-application/routing/api-routes) can be accessed on [http://localhost:3000/api/hello](http://localhost:3000/api/hello). This endpoint can be edited in `pages/api/hello.ts`.

The `pages/api` directory is mapped to `/api/*`. Files in this directory are treated as [API routes](https://nextjs.org/docs/pages/building-your-application/routing/api-routes) instead of React pages.

This project uses [`next/font`](https://nextjs.org/docs/pages/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Multi-Tenancy & Tenant Resolution

This application supports multi-tenancy through a comprehensive tenant resolution system:

### Subdomain Generation

When a seller registers, the system automatically generates a subdomain from their business name:

- Subdomains are created by converting the business name to lowercase, replacing spaces with hyphens, and removing special characters
- If a subdomain is already taken, a number or random string is appended (e.g., "joes-coffee-2")
- Each store is accessible via its subdomain (e.g., `joes-coffee.yourplatform.com`)

### Custom Domain Support

Sellers can also point their purchased domains to their storefront:

- The platform detects both subdomain and custom domain access
- Domain ownership verification is done via DNS records
- Stores are accessible via both their subdomain and custom domain

### Storefront Management

The dashboard provides a comprehensive interface for managing and viewing storefronts:

- **Customize Storefront**: Access via the sidebar to edit storefront settings and appearance
- **View Live Storefront**: Direct link to the public-facing storefront with clear visual indicators
- **Smart Placeholder Handling**: System provides guidance when using placeholder or default domains
- **Enhanced UI**: Color-coded action buttons with improved accessibility and user experience

### Development Testing

For local development and testing:

```
# Test with a specific tenant
http://localhost:3000?subdomain=tenant1

# Default tenant
http://localhost:3000
```

### Implementation Architecture

- **Middleware**: Detects the access method (subdomain vs custom domain)
- **Context Provider**: Makes tenant info available throughout the app
- **Theme System**: Loads tenant-specific themes based on tenant resolution
- **UUID Support**: All models use PostgreSQL UUID types for primary and foreign keys

### Future Implementations

- Admin interface for sellers to manage their custom domains
- Automatic SSL certificate provisioning for custom domains
- DNS configuration wizard for sellers
- Enhanced storefront customization options

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn-pages-router) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/pages/building-your-application/deploying) for more details.
