# Dashboard Integration Strategy

## Current Dashboard Types

The ConversationalCommerce platform currently has two dashboard categories:

### 1. Business Analytics Dashboard
- Located at: `frontend/src/components/analytics/AnalyticsDashboard.tsx`
- Purpose: Display business KPIs and metrics (users, orders, revenue)
- Data Source: REST API (`/api/v1/dashboard/stats`)
- Refresh Mechanism: Manual refresh button
- Target Users: Business owners, store managers

### 2. Operational Monitoring Dashboards
- Located at: `frontend/src/components/monitoring/*Dashboard.tsx`
- Includes:
  - `ActivityDashboard.tsx`: User activity and API interactions
  - `ViolationDashboard.tsx`: Security and operational anomalies
- Data Source: WebSockets for real-time updates
- Refresh Mechanism: Real-time WebSocket events
- Target Users: System administrators, support staff

## Integration Recommendations

### 1. Component Extraction and Standardization

Extract common UI patterns into shared components:

```
frontend/src/components/ui/dashboard/
  ├── DashboardCard.tsx        # Standardized metric card component
  ├── DashboardHeader.tsx      # Header with title and refresh button
  ├── RefreshableSection.tsx   # Section with refresh capability
  ├── StatCard.tsx             # Simple metric display card
  └── LastUpdatedIndicator.tsx # Shows when data was last refreshed
```

### 2. Navigation Integration

Update navigation to provide easy access to all dashboards:

```tsx
// In MobileNav.tsx and MainNav.tsx
const dashboardItems = [
  { 
    title: 'Business Analytics', 
    path: '/dashboard',
    icon: <BarChartIcon />,
  },
  { 
    title: 'Activity Monitor', 
    path: '/monitoring/activity',
    icon: <ActivityIcon />,
  },
  { 
    title: 'Security Monitor', 
    path: '/monitoring/security',
    icon: <SecurityIcon />,
  },
];
```

### 3. Data Fetching Strategy

Standardize on a consistent approach for dashboard data:

- For real-time critical data: Use WebSocket connections
- For periodic business metrics: Use REST API with auto-refresh capability
- Provide manual refresh option for all dashboards

### 4. Design System Alignment

- Use consistent Material UI theming across all dashboards
- Standardize on shared color schemes for metrics (green for positive, red for alerts, etc.)
- Use consistent spacing, typography, and card designs

### 5. Implementation Plan

1. Create shared UI components first
2. Refactor existing dashboards to use these components
3. Update navigation to include all dashboard types
4. Standardize refresh mechanisms and data fetching patterns

## Future Considerations

- Dashboard permissions based on user roles
- Dashboard customization (drag and drop widgets)
- Export functionality for all dashboard data
- Mobile-optimized views for all dashboards
