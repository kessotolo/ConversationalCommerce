# Storefront Editor Technical Guide

This document provides a comprehensive technical guide to the Storefront Editor components, their interactions, and implementation details.

## Architecture Overview

The Storefront Editor follows a modular component architecture with a clear separation of concerns:

```
StorefrontEditor (Container)
├── AssetManagement
├── DraftManagement
├── VersionHistory
├── Permissions
└── BannerLogoManagement
    ├── BannerManagement
    │   ├── BannerList
    │   ├── BannerDetail
    │   └── CreateBannerModal
    └── LogoManagement
        ├── LogoList
        ├── LogoDetail
        └── CreateLogoModal
```

## Core Technical Principles

1. **Type Safety**: All components use TypeScript with strict type checking
2. **Consistent Error Handling**: API errors are handled consistently with user-friendly messages
3. **UX Considerations**: Loading states, empty states, and error states are handled with appropriate UI feedback
4. **Accessibility**: Components follow WCAG guidelines with proper ARIA attributes
5. **State Management**: Local component state with React hooks for simpler components, context for more complex shared state

## UUID Implementation

All identifiers use UUIDs following the PostgreSQL UUID type standards. This provides:

- Guaranteed uniqueness across distributed systems
- Improved security compared to sequential IDs
- Consistency with backend PostgreSQL implementation using `UUID(as_uuid=True)`

## Component Details

### Banner & Logo Management

#### BannerLogoManagement Component

**Purpose**: Container for banner and logo management with tab navigation
**Key Features**:
- Tab-based UI using Headless UI's Tab components
- Proper styling with Tailwind CSS
- Smooth tab transitions

**Implementation Notes**:
```tsx
// Simplified implementation
const BannerLogoManagement: React.FC<BannerLogoManagementProps> = ({ tenantId }) => {
  const [selectedTab, setSelectedTab] = useState(0);

  return (
    <Tab.Group selectedIndex={selectedTab} onChange={setSelectedTab}>
      <Tab.List>
        <Tab>Banners</Tab>
        <Tab>Logos</Tab>
      </Tab.List>
      <Tab.Panels>
        <Tab.Panel><BannerManagement tenantId={tenantId} /></Tab.Panel>
        <Tab.Panel><LogoManagement tenantId={tenantId} /></Tab.Panel>
      </Tab.Panels>
    </Tab.Group>
  );
};
```

#### BannerManagement Component

**Purpose**: Manages banner CRUD operations
**Key Features**:
- List/detail view structure
- Banner reordering with react-dnd
- Filtering and pagination

**API Interactions**:
- `getBanners`: Fetches banners with filtering and pagination
- `createBanner`: Creates a new banner
- `updateBanner`: Updates an existing banner
- `publishBanner`: Changes banner status to published
- `deleteBanner`: Removes a banner
- `reorderBanners`: Updates display order of banners

#### LogoManagement Component

**Purpose**: Manages logo CRUD operations
**Key Features**:
- List/detail view structure
- Filtering by logo type and status
- Scheduling with start/end dates

**API Interactions**:
- `getLogos`: Fetches logos with filtering and pagination
- `createLogo`: Creates a new logo
- `updateLogo`: Updates an existing logo
- `publishLogo`: Changes logo status to published
- `deleteLogo`: Removes a logo

**Logo Types**:
- PRIMARY: Main header logo
- SECONDARY: Alternative logo for specific contexts
- FOOTER: Logo used in the footer
- MOBILE: Optimized for mobile devices
- FAVICON: Browser tab icon

## Asset Integration

Both Banner and Logo management integrate with the Asset Management system:

1. **Asset Selection**: Both components allow selecting from existing assets
2. **Asset Preview**: Selected assets are displayed with proper image optimization
3. **Asset Usage Tracking**: Backend tracks which assets are used by banners/logos

## Permissions Integration

The Banner and Logo management respects the user's permissions:

- **Viewer**: Can view banners and logos but not edit
- **Editor**: Can create/edit banners and logos but not publish
- **Publisher**: Can publish banners and logos
- **Admin**: Full access including deletion

## Error Handling

All components implement consistent error handling:

```tsx
// Example error handling pattern
const [error, setError] = useState<string | null>(null);

try {
  await updateLogo(tenantId, logoId, logoData);
  setSuccessMessage('Logo updated successfully');
} catch (err) {
  setError('Failed to update logo. Please try again.');
  console.error('Error updating logo:', err);
}
```

## Testing Considerations

When testing these components:

1. **Mock API Responses**: Use mock implementations of API functions
2. **Test Different States**: Test loading, error, empty, and populated states
3. **Permission Testing**: Test with different user permission levels
4. **Edge Cases**: Test with various data scenarios (missing fields, etc.)

## Future Enhancements

Potential enhancements to consider:

1. **Batch Operations**: Support for bulk editing or deleting
2. **Advanced Filtering**: More sophisticated filtering options
3. **Image Optimization**: Integration with image optimization services
4. **A/B Testing**: Support for A/B testing of banners and logos
5. **Analytics Integration**: Track banner/logo performance

## Troubleshooting

Common issues and solutions:

1. **Missing Dependencies**: Ensure all required packages are installed
   ```
   npm install @headlessui/react @heroicons/react react-dnd react-dnd-html5-backend
   ```

2. **Type Errors**: Check that all props match their expected types

3. **Styling Issues**: Verify Tailwind CSS classes are correct and applied
