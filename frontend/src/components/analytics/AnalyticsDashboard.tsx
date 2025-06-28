import React, { useEffect, useState } from 'react';
import { Box, Paper, Typography, Grid, IconButton } from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import { useClerk } from '@clerk/clerk-react';

import DashboardOverview from '@/modules/dashboard/components/DashboardOverview';

/**
 * Analytics Dashboard component that displays business metrics
 * Follows similar structure to existing dashboard components for consistency
 */
const AnalyticsDashboard: React.FC = () => {
  const { user } = useClerk();
  const [tenantId, setTenantId] = useState<string>('');
  const [mounted, setMounted] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    setMounted(true);
    if (typeof window !== 'undefined') {
      setTenantId(localStorage.getItem('tenant_id') ?? '');
    }
  }, []);

  const handleRefresh = () => {
    setRefreshKey(prevKey => prevKey + 1);
  };

  if (!mounted) {
    return <div>Loading...</div>;
  }

  // If no tenant is selected, show a message
  if (!tenantId) {
    return (
      <Box sx={{ p: 3 }}>
        <Paper sx={{ p: 3, textAlign: 'center' }}>
          <Typography variant="h5" component="h2" gutterBottom>
            No store selected
          </Typography>
          <Typography variant="body1">
            Please select a store to view analytics data
          </Typography>
        </Paper>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Business Analytics
        </Typography>
        <Box>
          <IconButton onClick={handleRefresh} aria-label="refresh">
            <RefreshIcon />
          </IconButton>
        </Box>
      </Box>

      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Paper sx={{ p: 3 }}>
            <DashboardOverview key={refreshKey} />
          </Paper>
        </Grid>

        {/* Additional analytics sections can be added here in the future */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, height: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Typography variant="h6" color="textSecondary">
              Revenue Trends (Coming Soon)
            </Typography>
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, height: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Typography variant="h6" color="textSecondary">
              Order Statistics (Coming Soon)
            </Typography>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default AnalyticsDashboard;
