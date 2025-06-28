import type { NextPage } from 'next';
import { useUser } from '@clerk/nextjs';
import { Container, Box, CircularProgress, Typography } from '@mui/material';
import Head from 'next/head';
import { useRouter } from 'next/router';
import React, { useEffect } from 'react';

import { MobileNav } from '@/components/layout/MobileNav';
import AnalyticsDashboard from '@/components/analytics/AnalyticsDashboard';

/**
 * Dashboard page that includes analytics components 
 * Protected by authentication check
 */
const DashboardPage: NextPage = () => {
  const router = useRouter();
  const { isLoaded, isSignedIn } = useUser();

  // Auth protection
  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.push('/sign-in');
    }
  }, [isLoaded, isSignedIn, router]);

  // Show loading state while checking auth
  if (!isLoaded || !isSignedIn) {
    return (
      <Box 
        display="flex" 
        flexDirection="column"
        alignItems="center" 
        justifyContent="center" 
        minHeight="100vh"
        py={4}
      >
        <CircularProgress size={40} />
        <Typography mt={2} variant="body1" color="text.secondary">
          Loading dashboard...
        </Typography>
      </Box>
    );
  }

  return (
    <>
      <Head>
        <title>Dashboard | Conversational Commerce</title>
        <meta name="description" content="Business analytics and performance dashboard" />
      </Head>

      <Box component="main" sx={{ pb: 8, pt: 2 }}>
        <Container maxWidth="xl">
          <Typography variant="h4" component="h1" sx={{ mb: 4, mt: 2 }}>
            Analytics Dashboard
          </Typography>
          <AnalyticsDashboard />
        </Container>
      </Box>
      
      <MobileNav />
    </>
  );
};

export default DashboardPage;
