import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Shield, AlertTriangle, CheckCircle, Activity } from 'lucide-react';

interface Violation {
  id: string;
  type: string;
  severity: string;
  action: string;
  status: string;
  reason?: string;
  details?: unknown;
  start_at: string;
  end_at?: string;
  user_id?: string;
  detection_id?: string;
  created_at: string;
  updated_at: string;
}

interface ViolationStats {
  total: number;
  by_type: Record<string, number>;
  by_severity: Record<string, number>;
  by_action: Record<string, number>;
  by_status: Record<string, number>;
}

interface ViolationTrend {
  date: string;
  count: number;
}

const ViolationDashboard: React.FC = () => {
  const [violations, setViolations] = useState<Violation[]>([]);
  const [stats, setStats] = useState<ViolationStats | null>(null);
  const [trends, setTrends] = useState<ViolationTrend[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedViolation, setSelectedViolation] = useState<Violation | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState<boolean>(false);
  const [filters, setFilters] = useState<{
    status: string;
    action: string;
    severity: string;
    type: string;
  }>({
    status: '',
    action: '',
    severity: '',
    type: '',
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const tenantId = localStorage.getItem('tenant_id') ?? '';
        const query = new URLSearchParams(filters as Record<string, string>).toString();
        const baseUrl = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:8080';

        const [violationsRes, statsRes, trendsRes] = await Promise.all([
          fetch(`${baseUrl}/api/v1/monitoring/violations?tenant_id=${tenantId}&${query}`).then(
            (res) => res.json(),
          ),
          fetch(`${baseUrl}/api/v1/monitoring/violations/stats?tenant_id=${tenantId}`).then((res) =>
            res.json(),
          ),
          fetch(`${baseUrl}/api/v1/monitoring/violations/trends?tenant_id=${tenantId}`).then(
            (res) => res.json(),
          ),
        ]);

        setViolations(violationsRes);
        setStats(statsRes);
        setTrends(trendsRes);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    // Only run in browser environment
    if (typeof window !== 'undefined') {
      fetchData();
    }
  }, [filters]);

  const handleViewDetails = (violation: Violation) => {
    setSelectedViolation(violation);
    setDetailDialogOpen(true);
  };

  const handleCloseDetails = () => {
    setDetailDialogOpen(false);
  };

  const getSeverityVariant = (severity: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (severity.toLowerCase()) {
      case 'critical':
      case 'high':
        return 'destructive';
      case 'medium':
        return 'secondary';
      case 'low':
        return 'outline';
      default:
        return 'default';
    }
  };

  const getStatusVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (status.toLowerCase()) {
      case 'active':
        return 'destructive';
      case 'resolved':
        return 'default';
      default:
        return 'secondary';
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center space-x-2">
        <Shield className="h-6 w-6" />
        <h1 className="text-2xl font-bold">Security Violations Dashboard</h1>
      </div>

      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Violations</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{stats.by_status['active'] ?? 0}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Critical</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{stats.by_severity['critical'] ?? 0}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {trends.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Trends (last 30 days)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2 overflow-x-auto py-2">
              {trends.map((t) => (
                <div key={t.date} className="text-center min-w-[60px]">
                  <div className="text-xs text-gray-500">{t.date}</div>
                  <div className="text-sm font-medium">{t.count}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Violations</CardTitle>
          <div className="flex gap-2 flex-wrap">
            <Select value={filters.status} onValueChange={(value) => setFilters({ ...filters, status: value })}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filters.severity} onValueChange={(value) => setFilters({ ...filters, severity: value })}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Severity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Severity</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {violations.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    <div className="flex flex-col items-center space-y-2">
                      <CheckCircle className="h-12 w-12 text-green-500" />
                      <span className="text-lg font-medium">No violations found</span>
                      <span className="text-sm text-gray-500">Your system is secure</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                violations.map((violation) => (
                  <TableRow key={violation.id}>
                    <TableCell className="font-medium">{violation.type}</TableCell>
                    <TableCell>
                      <Badge variant={getSeverityVariant(violation.severity)}>
                        {violation.severity}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusVariant(violation.status)}>
                        {violation.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{violation.action}</TableCell>
                    <TableCell className="text-sm text-gray-500">
                      {new Date(violation.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewDetails(violation)}
                      >
                        View Details
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Details Dialog */}
      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Violation Details</DialogTitle>
          </DialogHeader>
          {selectedViolation && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium">Type</h4>
                  <p className="text-sm text-gray-600">{selectedViolation.type}</p>
                </div>
                <div>
                  <h4 className="font-medium">Severity</h4>
                  <Badge variant={getSeverityVariant(selectedViolation.severity)}>
                    {selectedViolation.severity}
                  </Badge>
                </div>
                <div>
                  <h4 className="font-medium">Status</h4>
                  <Badge variant={getStatusVariant(selectedViolation.status)}>
                    {selectedViolation.status}
                  </Badge>
                </div>
                <div>
                  <h4 className="font-medium">Action</h4>
                  <p className="text-sm text-gray-600">{selectedViolation.action}</p>
                </div>
              </div>

              {selectedViolation.reason && (
                <div>
                  <h4 className="font-medium">Reason</h4>
                  <p className="text-sm text-gray-600">{selectedViolation.reason}</p>
                </div>
              )}

              {selectedViolation.details !== undefined && selectedViolation.details !== null && (
                <div>
                  <h4 className="font-medium">Details</h4>
                  <pre className="text-xs bg-gray-100 p-2 rounded overflow-auto">
                    {typeof selectedViolation.details === 'string'
                      ? selectedViolation.details
                      : JSON.stringify(selectedViolation.details, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ViolationDashboard;
