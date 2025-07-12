# Streamlined Seller Onboarding Flow

## Overview

The new onboarding flow provides a smooth, step-by-step experience for new sellers to set up their stores quickly and efficiently. This replaces the complex multi-step wizard with a focused, mobile-friendly approach.

## Flow Architecture

### 1. Signup Flow
```
User signs up with Clerk → Redirected to /store-setup → Complete onboarding → Dashboard
```

### 2. Authentication Check
- Clerk handles user authentication
- Users are redirected to `/store-setup` after signup
- Dashboard layout checks for tenant completion

### 3. Store Setup Process

#### Step 1: Store Basics
- **Store Name**: The public-facing name of the store
- **Business/Legal Name**: Legal entity name for compliance
- **Auto-generated subdomain**: Based on store name (e.g., "Joe's Coffee" → "joes-coffee.enwhe.io")

#### Step 2: Contact Information
- **Phone Number**: WhatsApp-enabled preferred for customer support
- **Email Address**: Business email for communications
- **Validation**: Both fields are required

#### Step 3: Business Details
- **Business Category**: Dropdown with predefined categories
- **Business Description**: Optional description for store context

### 4. Success Flow
- Shows success screen with store details
- Displays store URL and next steps
- Redirects to dashboard upon completion

## Technical Implementation

### Key Components

1. **`/store-setup` Page**: Main onboarding form with step-by-step wizard
2. **`StoreSetupSuccess` Component**: Success screen after completion
3. **Dashboard Layout**: Handles redirects and authentication checks
4. **Tenants API**: Creates new tenant/store records

### Form Validation

```typescript
// Step validation logic
const validateStep = (currentStep: number): boolean => {
  switch (currentStep) {
    case 1: // Store Basics
      return !!(formData.storeName && formData.businessName);
    case 2: // Contact Info
      return !!(formData.phoneNumber && formData.email);
    case 3: // Business Details
      return !!(formData.category && formData.description);
    default:
      return false;
  }
};
```

### API Integration

The onboarding form sends data to `/api/tenants` endpoint:

```typescript
{
  storeName: string;
  businessName: string;
  phoneNumber: string;
  storeEmail: string;
  category: string;
  subdomain: string;
  userId: string;
}
```

## User Experience Features

### Mobile-First Design
- Responsive layout that works on all devices
- Touch-friendly form controls
- Progress indicators for multi-step process

### Real-time Feedback
- Subdomain preview as user types store name
- Step validation with clear error messages
- Loading states during API calls

### Accessibility
- Proper form labels and ARIA attributes
- Keyboard navigation support
- Screen reader compatibility

## Business Categories

Available categories for store classification:
- Retail & Consumer Goods
- Food & Beverages
- Fashion & Apparel
- Electronics & Technology
- Health & Beauty
- Home & Furniture
- Art & Crafts
- Services
- Other

## Error Handling

### Form Validation Errors
- Required field validation
- Email format validation
- Phone number format suggestions

### API Errors
- Network connectivity issues
- Server error handling
- User-friendly error messages

### Recovery Options
- Users can go back to previous steps
- Form data persists during navigation
- Clear error messages with resolution steps

## Integration Points

### Clerk Authentication
- Seamless integration with Clerk signup
- Automatic user ID extraction
- Email pre-filling from Clerk profile

### Dashboard Integration
- Automatic redirect after completion
- Tenant context loading
- Store setup completion checks

### Legacy Onboarding
- Original complex onboarding still available at `/onboarding`
- Can be used for advanced setup scenarios
- Maintains backward compatibility

## Testing

### Manual Testing Checklist
- [ ] Sign up with Clerk
- [ ] Complete store setup form
- [ ] Verify subdomain generation
- [ ] Check success screen
- [ ] Verify dashboard redirect
- [ ] Test form validation
- [ ] Test error handling
- [ ] Test mobile responsiveness

### API Testing
```bash
# Test tenant creation
curl -X POST http://localhost:3000/api/tenants \
  -H "Content-Type: application/json" \
  -d '{
    "storeName": "Test Store",
    "businessName": "Test Business LLC",
    "phoneNumber": "+2348012345678",
    "storeEmail": "test@example.com",
    "category": "retail",
    "subdomain": "test-store",
    "userId": "test-user-id"
  }'
```

## Future Enhancements

### Planned Features
- KYC integration for compliance
- Domain customization options
- Team member invitation flow
- Store template selection
- Payment method setup

### Analytics Integration
- Onboarding completion tracking
- Step abandonment analysis
- Conversion rate optimization
- User behavior insights

## Troubleshooting

### Common Issues

1. **Form not submitting**
   - Check browser console for errors
   - Verify API endpoint is running
   - Check network connectivity

2. **Subdomain not generating**
   - Ensure store name is entered
   - Check for special characters
   - Verify subdomain uniqueness

3. **Dashboard redirect issues**
   - Check tenant creation success
   - Verify user authentication
   - Check tenant context loading

### Debug Steps
1. Check browser console for errors
2. Verify API endpoints are responding
3. Check network tab for failed requests
4. Verify Clerk authentication state
5. Check tenant context in React DevTools

## Performance Considerations

- Form data is stored in component state
- API calls are optimized with proper error handling
- Images are optimized for fast loading
- Progressive enhancement for slow connections

## Security

- All form data is validated server-side
- API endpoints require authentication
- Sensitive data is not logged
- HTTPS enforcement in production