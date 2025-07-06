import React, { useState, useEffect } from 'react';
import { formatDate } from '@/utils/format';
import { ReturnService } from '@/modules/returns/services/ReturnService';
import { ReturnStatus, ReturnRequestResponse } from '@/modules/returns/models/return';
import { useTenantContext } from '@/modules/tenant/hooks/useTenantContext';
import { useRouter } from 'next/router';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { SearchIcon, ChevronRightIcon, Loader2, AlertCircle, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

const ReturnApprovalDashboard: React.FC = () => {
  const { tenant } = useTenantContext();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [returns, setReturns] = useState<ReturnRequestResponse[]>([]);
  const [filteredReturns, setFilteredReturns] = useState<ReturnRequestResponse[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Fetch return requests when the component mounts
  useEffect(() => {
    const fetchReturns = async () => {
      if (!tenant?.id) return;

      try {
        setLoading(true);
        setError(null);

        // In a real implementation, this would use pagination from the API
        // For now, we're fetching all returns and doing client-side pagination
        const response = await ReturnService.getAllReturnRequests(tenant.id, currentPage);

        setReturns(response.items);
        setTotalPages(Math.ceil(response.total / response.page_size));

      } catch (err) {
        setError('Failed to load return requests');
        console.error('Error fetching returns:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchReturns();
  }, [tenant?.id, currentPage]);

  // Apply filters whenever returns, status filter, or search query changes
  useEffect(() => {
    let filtered = [...returns];

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(item => item.status === statusFilter);
    }

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(item =>
        item.return_number.toLowerCase().includes(query) ||
        item.id.toLowerCase().includes(query) ||
        item.customer_id.toLowerCase().includes(query)
      );
    }

    setFilteredReturns(filtered);
  }, [returns, statusFilter, searchQuery]);

  // Get status badge variant
  const getStatusVariant = (status: ReturnStatus): "default" | "secondary" | "destructive" | "outline" => {
    const statusVariants: Record<ReturnStatus, "default" | "secondary" | "destructive" | "outline"> = {
      [ReturnStatus.REQUESTED]: 'outline',
      [ReturnStatus.UNDER_REVIEW]: 'secondary',
      [ReturnStatus.APPROVED]: 'default',
      [ReturnStatus.RECEIVED]: 'default',
      [ReturnStatus.PARTIAL_APPROVED]: 'outline',
      [ReturnStatus.REJECTED]: 'destructive',
      [ReturnStatus.CANCELLED]: 'secondary',
      [ReturnStatus.COMPLETED]: 'default'
    };

    return statusVariants[status] || 'secondary';
  };

  // Navigate to return details
  const handleViewReturn = (returnId: string) => {
    router.push(`/seller/returns/${returnId}`);
  };

  if (!tenant?.id) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Tenant information not available
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Return Requests</h1>

      <Tabs defaultValue="all" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="all">All Returns</TabsTrigger>
          <TabsTrigger value="pending">Pending Approval</TabsTrigger>
          <TabsTrigger value="approved">Approved</TabsTrigger>
          <TabsTrigger value="completed">Completed</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          {/* Header with filters */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="relative w-full md:w-80">
              <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search by return # or customer"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            <div className="flex items-center space-x-4">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  {Object.values(ReturnStatus).map(status => (
                    <SelectItem key={status} value={status}>
                      {ReturnService.getStatusDescriptions()[status]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Returns list */}
          {loading ? (
            <div className="flex justify-center items-center h-48">
              <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
            </div>
          ) : error ? (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : filteredReturns.length === 0 ? (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                No return requests found matching your criteria
              </AlertDescription>
            </Alert>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Return #</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Items</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredReturns.map((returnRequest) => (
                    <TableRow
                      key={returnRequest.id}
                      className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-900"
                      onClick={() => handleViewReturn(returnRequest.id)}
                    >
                      <TableCell className="font-medium">{returnRequest.return_number}</TableCell>
                      <TableCell>{formatDate(returnRequest.requested_at)}</TableCell>
                      <TableCell>{returnRequest.items?.length || 0} item(s)</TableCell>
                      <TableCell>
                        <Badge variant={getStatusVariant(returnRequest.status)}>
                          {ReturnService.getStatusDescriptions()[returnRequest.status]}
                        </Badge>
                      </TableCell>
                      <TableCell>{ReturnService.getReasonDescriptions()[returnRequest.reason]}</TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleViewReturn(returnRequest.id);
                          }}
                          className="flex items-center space-x-1"
                        >
                          <span>Review</span>
                          <ChevronRightIcon className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center mt-6">
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(currentPage - 1)}
                >
                  Previous
                </Button>

                <span className="text-sm text-gray-600">
                  Page {currentPage} of {totalPages}
                </span>

                <Button
                  variant="outline"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(currentPage + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </TabsContent>

        {/* Additional tabs (simplified implementation) */}
        <TabsContent value="pending" className="space-y-4">
          <p className="text-gray-600">Pending approval returns will be displayed here</p>
        </TabsContent>
        <TabsContent value="approved" className="space-y-4">
          <p className="text-gray-600">Approved returns will be displayed here</p>
        </TabsContent>
        <TabsContent value="completed" className="space-y-4">
          <p className="text-gray-600">Completed returns will be displayed here</p>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ReturnApprovalDashboard;
