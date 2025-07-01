import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { 
  Card,
  Button,
  Tabs, 
  TabsList, 
  TabsTrigger, 
  TabsContent,
  Badge,
  Input,
  Textarea,
  Label,
  Switch,
  Separator,
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction
} from '../ui';
import { ArrowLeftIcon, TrashIcon, PencilIcon, EyeIcon } from '@heroicons/react/24/outline';
import { ColorPicker } from '../ui/ColorPicker';

interface Tenant {
  id: string;
  name: string;
  subdomain: string;
  custom_domain: string | null;
  display_name: string | null;
  logo_url: string | null;
  primary_color: string | null;
  secondary_color: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  contact_email: string | null;
  contact_phone: string | null;
  admin_user_id: string | null;
  stripe_customer_id: string | null;
}

interface TenantDetailProps {
  tenantId: string;
}

const TenantDetail: React.FC<TenantDetailProps> = ({ tenantId }) => {
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<string>('details');
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [formData, setFormData] = useState<Partial<Tenant>>({});
  const [isSaving, setIsSaving] = useState<boolean>(false);
  
  const router = useRouter();
  
  // Fetch tenant details
  const fetchTenantDetails = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/tenants/${tenantId}`);
      const data = await response.json();
      
      if (response.ok) {
        setTenant(data);
        setFormData(data);
      } else {
        console.error('Failed to fetch tenant details:', data.detail);
      }
    } catch (error) {
      console.error('Error fetching tenant details:', error);
    } finally {
      setLoading(false);
    }
  };
  
  // Load tenant on mount
  useEffect(() => {
    if (tenantId) {
      fetchTenantDetails();
    }
  }, [tenantId]);
  
  // Handle form field changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  
  // Handle switch toggle
  const handleSwitchChange = (name: string, checked: boolean) => {
    setFormData(prev => ({ ...prev, [name]: checked }));
  };
  
  // Handle color change
  const handleColorChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  
  // Save tenant changes
  const handleSave = async () => {
    setIsSaving(true);
    try {
      const response = await fetch(`/api/admin/tenants/${tenantId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setTenant(data);
        setFormData(data);
        setIsEditing(false);
      } else {
        console.error('Failed to update tenant:', data.detail);
      }
    } catch (error) {
      console.error('Error updating tenant:', error);
    } finally {
      setIsSaving(false);
    }
  };
  
  // Handle tenant deletion
  const handleDelete = async () => {
    try {
      const response = await fetch(`/api/admin/tenants/${tenantId}`, {
        method: 'DELETE',
      });
      
      if (response.ok) {
        router.push('/admin/tenants');
      } else {
        const data = await response.json();
        console.error('Failed to delete tenant:', data.detail);
      }
    } catch (error) {
      console.error('Error deleting tenant:', error);
    }
  };
  
  // Handle impersonation
  const handleImpersonate = async () => {
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
  
  // Preview tenant storefront
  const handlePreview = () => {
    if (!tenant) return;
    
    const baseUrl = tenant.custom_domain 
      ? `https://${tenant.custom_domain}` 
      : `https://${tenant.subdomain}.yourplatform.com`;
      
    window.open(baseUrl, '_blank');
  };
  
  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <p>Loading tenant details...</p>
      </div>
    );
  }
  
  if (!tenant) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <p className="text-red-500 mb-4">Tenant not found</p>
        <Button onClick={() => router.push('/admin/tenants')}>
          <ArrowLeftIcon className="h-4 w-4 mr-2" />
          Back to Tenants
        </Button>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <Button 
            variant="outline" 
            size="icon"
            onClick={() => router.push('/admin/tenants')}
          >
            <ArrowLeftIcon className="h-4 w-4" />
          </Button>
          <h1 className="text-2xl font-bold">
            {tenant.display_name || tenant.name}
          </h1>
          {tenant.is_active ? (
            <Badge variant="success">Active</Badge>
          ) : (
            <Badge variant="destructive">Inactive</Badge>
          )}
        </div>
        
        <div className="flex space-x-2">
          <Button variant="outline" onClick={handlePreview}>
            <EyeIcon className="h-4 w-4 mr-2" />
            Preview
          </Button>
          
          <Button onClick={handleImpersonate}>
            Login As Tenant
          </Button>
          
          {!isEditing ? (
            <Button 
              variant="outline" 
              onClick={() => setIsEditing(true)}
            >
              <PencilIcon className="h-4 w-4 mr-2" />
              Edit
            </Button>
          ) : (
            <>
              <Button 
                variant="outline" 
                onClick={() => {
                  setIsEditing(false);
                  setFormData(tenant);
                }}
              >
                Cancel
              </Button>
              
              <Button 
                onClick={handleSave}
                disabled={isSaving}
              >
                {isSaving ? 'Saving...' : 'Save Changes'}
              </Button>
            </>
          )}
          
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive">
                <TrashIcon className="h-4 w-4 mr-2" />
                Delete
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete the tenant 
                  "{tenant.name}" and all associated data.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete}>
                  Yes, delete tenant
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="branding">Branding & Appearance</TabsTrigger>
          <TabsTrigger value="domains">Domains & DNS</TabsTrigger>
        </TabsList>
        
        <TabsContent value="details" className="mt-6">
          <Card className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label htmlFor="name">Tenant Name</Label>
                {isEditing ? (
                  <Input
                    id="name"
                    name="name"
                    value={formData.name || ''}
                    onChange={handleInputChange}
                    className="mt-1"
                  />
                ) : (
                  <p className="mt-1">{tenant.name}</p>
                )}
              </div>
              
              <div>
                <Label htmlFor="display_name">Display Name</Label>
                {isEditing ? (
                  <Input
                    id="display_name"
                    name="display_name"
                    value={formData.display_name || ''}
                    onChange={handleInputChange}
                    className="mt-1"
                  />
                ) : (
                  <p className="mt-1">{tenant.display_name || '-'}</p>
                )}
              </div>
              
              <div>
                <Label htmlFor="contact_email">Contact Email</Label>
                {isEditing ? (
                  <Input
                    id="contact_email"
                    name="contact_email"
                    type="email"
                    value={formData.contact_email || ''}
                    onChange={handleInputChange}
                    className="mt-1"
                  />
                ) : (
                  <p className="mt-1">{tenant.contact_email || '-'}</p>
                )}
              </div>
              
              <div>
                <Label htmlFor="contact_phone">Contact Phone</Label>
                {isEditing ? (
                  <Input
                    id="contact_phone"
                    name="contact_phone"
                    value={formData.contact_phone || ''}
                    onChange={handleInputChange}
                    className="mt-1"
                  />
                ) : (
                  <p className="mt-1">{tenant.contact_phone || '-'}</p>
                )}
              </div>
              
              <div className="col-span-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="is_active">Active Status</Label>
                  {isEditing ? (
                    <Switch
                      id="is_active"
                      checked={formData.is_active}
                      onCheckedChange={(checked) => handleSwitchChange('is_active', checked)}
                    />
                  ) : (
                    <Badge variant={tenant.is_active ? "success" : "destructive"}>
                      {tenant.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  )}
                </div>
              </div>
              
              <div className="col-span-2">
                <Separator className="my-4" />
                <div className="text-sm text-gray-500">
                  <div className="mb-2">
                    <span className="font-medium">Created:</span> {new Date(tenant.created_at).toLocaleString()}
                  </div>
                  <div>
                    <span className="font-medium">Last Updated:</span> {new Date(tenant.updated_at).toLocaleString()}
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </TabsContent>
        
        <TabsContent value="branding" className="mt-6">
          <Card className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="col-span-2">
                <Label htmlFor="logo_url">Logo URL</Label>
                {isEditing ? (
                  <Input
                    id="logo_url"
                    name="logo_url"
                    value={formData.logo_url || ''}
                    onChange={handleInputChange}
                    className="mt-1"
                    placeholder="https://example.com/logo.png"
                  />
                ) : (
                  <div className="mt-1">
                    {tenant.logo_url ? (
                      <div className="flex items-center">
                        <img 
                          src={tenant.logo_url} 
                          alt="Tenant Logo" 
                          className="h-10 w-auto mr-4" 
                        />
                        <a 
                          href={tenant.logo_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline"
                        >
                          {tenant.logo_url}
                        </a>
                      </div>
                    ) : (
                      <p>No logo set</p>
                    )}
                  </div>
                )}
              </div>
              
              <div>
                <Label htmlFor="primary_color">Primary Color</Label>
                {isEditing ? (
                  <div className="mt-1 flex items-center space-x-2">
                    <ColorPicker 
                      id="primary_color"
                      color={formData.primary_color || '#000000'}
                      onChange={(color) => handleColorChange('primary_color', color)}
                    />
                    <Input
                      name="primary_color"
                      value={formData.primary_color || ''}
                      onChange={handleInputChange}
                      placeholder="#000000"
                    />
                  </div>
                ) : (
                  <div className="mt-1 flex items-center space-x-2">
                    {tenant.primary_color && (
                      <div 
                        className="w-6 h-6 rounded border border-gray-300" 
                        style={{ backgroundColor: tenant.primary_color }}
                      />
                    )}
                    <p>{tenant.primary_color || 'Not set'}</p>
                  </div>
                )}
              </div>
              
              <div>
                <Label htmlFor="secondary_color">Secondary Color</Label>
                {isEditing ? (
                  <div className="mt-1 flex items-center space-x-2">
                    <ColorPicker 
                      id="secondary_color"
                      color={formData.secondary_color || '#000000'}
                      onChange={(color) => handleColorChange('secondary_color', color)}
                    />
                    <Input
                      name="secondary_color"
                      value={formData.secondary_color || ''}
                      onChange={handleInputChange}
                      placeholder="#000000"
                    />
                  </div>
                ) : (
                  <div className="mt-1 flex items-center space-x-2">
                    {tenant.secondary_color && (
                      <div 
                        className="w-6 h-6 rounded border border-gray-300" 
                        style={{ backgroundColor: tenant.secondary_color }}
                      />
                    )}
                    <p>{tenant.secondary_color || 'Not set'}</p>
                  </div>
                )}
              </div>
            </div>
          </Card>
        </TabsContent>
        
        <TabsContent value="domains" className="mt-6">
          <Card className="p-6">
            <div className="grid grid-cols-1 gap-6">
              <div>
                <Label htmlFor="subdomain">Subdomain</Label>
                {isEditing ? (
                  <div className="mt-1 flex">
                    <Input
                      id="subdomain"
                      name="subdomain"
                      value={formData.subdomain || ''}
                      onChange={handleInputChange}
                      className="rounded-r-none"
                    />
                    <div className="flex items-center justify-center px-3 border border-l-0 rounded-r-md bg-gray-50 text-gray-500">
                      .yourplatform.com
                    </div>
                  </div>
                ) : (
                  <p className="mt-1">{tenant.subdomain}.yourplatform.com</p>
                )}
              </div>
              
              <div>
                <Label htmlFor="custom_domain">Custom Domain</Label>
                {isEditing ? (
                  <Input
                    id="custom_domain"
                    name="custom_domain"
                    value={formData.custom_domain || ''}
                    onChange={handleInputChange}
                    className="mt-1"
                    placeholder="example.com"
                  />
                ) : (
                  <p className="mt-1">{tenant.custom_domain || 'No custom domain set'}</p>
                )}
              </div>
              
              {tenant.custom_domain && (
                <div className="mt-4">
                  <h3 className="font-medium mb-2">DNS Configuration</h3>
                  <div className="bg-gray-50 p-4 rounded-md">
                    <p className="text-sm mb-2">
                      To set up your custom domain, add the following DNS records:
                    </p>
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-2">Record Type</th>
                          <th className="text-left py-2">Host</th>
                          <th className="text-left py-2">Value</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="border-b">
                          <td className="py-2">CNAME</td>
                          <td className="py-2">{tenant.custom_domain}</td>
                          <td className="py-2">cname.yourplatform.com</td>
                        </tr>
                        <tr>
                          <td className="py-2">TXT</td>
                          <td className="py-2">_yourplatform-verification.{tenant.custom_domain}</td>
                          <td className="py-2">verification={tenant.id}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default TenantDetail;
