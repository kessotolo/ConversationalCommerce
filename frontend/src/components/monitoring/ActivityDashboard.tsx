import RefreshIcon from '@mui/icons-material/Refresh';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Grid from '@mui/material/Grid';
import IconButton from '@mui/material/IconButton';
import Paper from '@mui/material/Paper';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';
import { formatDistanceToNow } from 'date-fns';
import React, { useEffect, useState } from 'react';

import { useWebSocket } from '@/hooks/useWebSocket';

import AuditLogTable from './AuditLogTable';
import NotificationCenter from './NotificationCenter';

import type { ChipProps } from '@mui/material/Chip';

interface Activity {
  id: string;
  user_id: string;
  resource_type: string;
  action: string;
  status_code: number;
  path: string;
  method: string;
  duration: number;
  timestamp: string;
  ip_address: string;
  user_agent: string;
  details: Record<string, unknown>;
  severity: 'low' | 'medium' | 'high';
}

interface ActivityStats {
  total: number;
  byType: Record<string, number>;
  byStatus: Record<number, number>;
  byUser: Record<string, number>;
}

type ChipColor = ChipProps['color'];
function toChipColor(val: string): ChipColor {
  const allowed: ChipColor[] = [
    'default',
    'error',
    'warning',
    'info',
    'primary',
    'success',
    'secondary',
  ];
  return allowed.includes(val as ChipColor) ? (val as ChipColor) : 'default';
}

const ActivityDashboard: React.FC = () => {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [stats, setStats] = useState<ActivityStats>({
    total: 0,
    byType: {},
    byStatus: {},
    byUser: {},
  });
  const [
    ,/* filter */
    /* setFilter */
  ] = useState<{ resourceType: string; statusCode: string; user: string }>({
    resourceType: '',
    statusCode: '',
    user: '',
  });

  const [tenantId, setTenantId] = useState<string>('');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (typeof window !== 'undefined') {
      setTenantId(localStorage.getItem('tenant_id') ?? '');
    }
  }, []);

  // WebSocket connection - only establish when tenantId is available
  const { lastMessage } = useWebSocket(
    tenantId
      ? `${process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:8080'}/ws/monitoring/${tenantId}`
      : '',
  );

  useEffect(() => {
    if (lastMessage && typeof lastMessage === 'object') {
      try {
        // WebSocketMessage already contains parsed data in its payload
        if (lastMessage.type === 'activity' && lastMessage.payload) {
          const activityData = lastMessage.payload as Activity;
          setActivities((prev) => [activityData, ...prev].slice(0, 100));
          updateStats(activityData);
        }
      } catch (error) {
        console.error('Error processing WebSocket message:', error);
      }
    }
  }, [lastMessage]);

  const updateStats = (activity: Activity) => {
    setStats((prev) => ({
      total: prev.total + 1,
      byType: {
        ...prev.byType,
        [activity.resource_type]: (prev.byType[activity.resource_type] ?? 0) + 1,
      },
      byStatus: {
        ...prev.byStatus,
        [activity.status_code]: (prev.byStatus[activity.status_code] ?? 0) + 1,
      },
      byUser: {
        ...prev.byUser,
        [activity.user_id]: (prev.byUser[activity.user_id] ?? 0) + 1,
      },
    }));
  };

  const handleRefresh = () => {
    // Clear activities and fetch new ones
    setActivities([]);
    setStats({
      total: 0,
      byType: {},
      byStatus: {},
      byUser: {},
    });
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high':
        return 'error';
      case 'medium':
        return 'warning';
      default:
        return 'info';
    }
  };

  const getMethodColor = (method: string) => {
    switch (method.toUpperCase()) {
      case 'GET':
        return 'primary';
      case 'POST':
        return 'success';
      case 'PUT':
      case 'PATCH':
        return 'warning';
      case 'DELETE':
        return 'error';
      default:
        return 'default';
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <h1 className="text-2xl font-bold mb-4">Activity Dashboard</h1>
      <div className="mb-8">{mounted && <NotificationCenter />}</div>
      <div>{mounted && tenantId && <AuditLogTable tenantId={tenantId} />}</div>
      {/* Stats Cards */}
      <Grid container spacing={3}>
        <Grid component="div" sx={{ gridColumn: { xs: 'span 12', md: 'span 4' } }}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6">Total Activities</Typography>
            <Typography variant="h3">{stats.total}</Typography>
          </Paper>
        </Grid>

        <Grid component="div" sx={{ gridColumn: { xs: 'span 12', md: 'span 4' } }}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6">Active Users</Typography>
            <Typography variant="h3">{Object.keys(stats.byUser).length}</Typography>
          </Paper>
        </Grid>

        <Grid component="div" sx={{ gridColumn: { xs: 'span 12', md: 'span 4' } }}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6">Resource Types</Typography>
            <Typography variant="h3">{Object.keys(stats.byType).length}</Typography>
          </Paper>
        </Grid>
      </Grid>

      {/* Activity Table */}
      <Paper sx={{ mt: 3, p: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
          <Typography variant="h6">Activity Log</Typography>
          <IconButton onClick={handleRefresh}>
            <RefreshIcon />
          </IconButton>
        </Box>

        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Time</TableCell>
                <TableCell>User</TableCell>
                <TableCell>Action</TableCell>
                <TableCell>Resource</TableCell>
                <TableCell>Method</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Severity</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {activities.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center">
                    No activities to display
                  </TableCell>
                </TableRow>
              ) : (
                activities.map((activity) => (
                  <TableRow key={activity.id}>
                    <TableCell>
                      {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}
                    </TableCell>
                    <TableCell>{activity.user_id}</TableCell>
                    <TableCell>{activity.action}</TableCell>
                    <TableCell>{activity.resource_type}</TableCell>
                    <TableCell>
                      <Chip
                        label={activity.method}
                        color={toChipColor(getMethodColor(activity.method))}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>{activity.status_code}</TableCell>
                    <TableCell>
                      <Chip
                        label={activity.severity}
                        color={toChipColor(getSeverityColor(activity.severity))}
                        size="small"
                      />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Box>
  );
};

export default ActivityDashboard;
