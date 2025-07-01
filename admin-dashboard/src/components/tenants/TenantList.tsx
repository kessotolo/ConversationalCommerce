import React, { useState, useEffect } from 'react';
import { 
  Table, 
  TableHeader, 
  TableBody, 
  TableRow, 
  TableCell, 
  TableHead,
  Card,
  Button,
  Badge,
  Input
} from '../ui';
import { PlusIcon, SearchIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import { useRouter } from 'next/router';

interface Tenant {
  id: string;
  name: string;
  subdomain: string;
  custom_domain: string | null;
  display_name: string;
  is_active: boolean;
  created_at: string;
}

const TenantList: React.FC = () => {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  
  const router = useRouter();
  
  // Fetch tenants from API
  const fetchTenants = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/tenants?page=${page}&search=${searchQuery}`);
      const data = await response.json();
      
      if (response.ok) {
        setTenants(data.items);
        setTotalPages(Math.ceil(data.total / data.page_size));
      } else {
        console.error('Failed to fetch tenants:', data.detail);
      }
    } catch (error) {
      console.error('Error fetching tenants:', error);
    } finally {
      setLoading(false);
    }
  };
  
  // Load tenants on mount and when dependencies change
  useEffect(() => {
    fetchTenants();
  }, [page, searchQuery]);
  
  // Handle search input change
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setPage(1); // Reset to first page on new search
  };
  
  // Handle tenant creation
  const handleCreateTenant = () => {
    router.push('/admin/tenants/create');
  };
  
  // Handle view tenant details
  const handleViewTenant = (tenantId: string) => {
    router.push(`/admin/tenants/${tenantId}`);
  };
  
  // Handle tenant impersonation
  const handleImpersonateTenant = async (tenantId: string) => {
    try {
      // Get admin token from storage
      const adminToken = localStorage.getItem('adminToken');
      
      if (!adminToken) {
        console.error('Admin token not found');
        return;
      }
      
      // Call impersonation service
      const response = await fetch(`/api/admin/impersonation/token/${tenantId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      const data = await response.json();
      
      if (response.ok) {
        // Store impersonation token
        sessionStorage.setItem('impersonationToken', data.token);
        sessionStorage.setItem('impersonationTenantId', tenantId);
        
        // Redirect to tenant storefront
        window.location.href = data.tenant.impersonation_url;
      } else {
        console.error('Failed to create impersonation token:', data.detail);
      }
    } catch (error) {
      console.error('Error creating impersonation token:', error);
    }
  };
  
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Tenant Management</h1>
        <Button onClick={handleCreateTenant}>
          <PlusIcon className="h-4 w-4 mr-2" />
          Create Tenant
        </Button>
      </div>
      
      <Card className="p-4">
        <div className="flex justify-between items-center mb-4">
          <div className="relative w-64">
            <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              type="text"
              placeholder="Search tenants..."
              value={searchQuery}
              onChange={handleSearchChange}
              className="pl-10"
            />
          </div>
          
          <Button variant="outline" onClick={fetchTenants}>
            <ArrowPathIcon className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
        
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Subdomain</TableHead>
              <TableHead>Custom Domain</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8">
                  Loading tenants...
                </TableCell>
              </TableRow>
            ) : tenants.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8">
                  No tenants found
                </TableCell>
              </TableRow>
            ) : (
              tenants.map((tenant) => (
                <TableRow key={tenant.id}>
                  <TableCell className="font-medium">
                    {tenant.display_name || tenant.name}
                  </TableCell>
                  <TableCell>{tenant.subdomain}</TableCell>
                  <TableCell>
                    {tenant.custom_domain || <span className="text-gray-400">None</span>}
                  </TableCell>
                  <TableCell>
                    {tenant.is_active ? (
                      <Badge variant="success">Active</Badge>
                    ) : (
                      <Badge variant="destructive">Inactive</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end space-x-2">
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => handleViewTenant(tenant.id)}
                      >
                        View
                      </Button>
                      <Button 
                        size="sm"
                        onClick={() => handleImpersonateTenant(tenant.id)}
                      >
                        Login As
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        
        {totalPages > 1 && (
          <div className="flex justify-between items-center mt-4">
            <div className="text-sm text-gray-500">
              Page {page} of {totalPages}
            </div>
            <div className="space-x-2">
              <Button 
                variant="outline" 
                size="sm"
                disabled={page === 1}
                onClick={() => setPage(page - 1)}
              >
                Previous
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                disabled={page === totalPages}
                onClick={() => setPage(page + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};

export default TenantList;
