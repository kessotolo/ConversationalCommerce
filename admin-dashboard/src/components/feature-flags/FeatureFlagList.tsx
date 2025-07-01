import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { PlusIcon, PencilIcon, TrashIcon, ChevronRightIcon } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { usePermission } from '@/contexts/PermissionContext';
import { PermissionGuard } from '@/components/common/PermissionGuard';
import { api } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { FeatureFlag } from '@/types/feature-flags';
import FeatureFlagDialog from './FeatureFlagDialog';

export default function FeatureFlagList() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { can } = usePermission();
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedFlag, setSelectedFlag] = useState<FeatureFlag | null>(null);
  
  const { data: featureFlags, isLoading } = useQuery({
    queryKey: ['featureFlags'],
    queryFn: () => api.get('/api/admin/feature-flags').then(res => res.data)
  });
  
  const toggleFlagMutation = useMutation({
    mutationFn: ({ id, isEnabled }: { id: string, isEnabled: boolean }) => 
      api.put(`/api/admin/feature-flags/${id}`, { is_enabled: isEnabled }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['featureFlags'] });
      toast({
        title: 'Feature flag updated',
        description: 'The feature flag status has been updated successfully.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: 'Failed to update feature flag status.',
        variant: 'destructive',
      });
    }
  });
  
  const deleteFlagMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/api/admin/feature-flags/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['featureFlags'] });
      toast({
        title: 'Feature flag deleted',
        description: 'The feature flag has been deleted successfully.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: 'Failed to delete feature flag.',
        variant: 'destructive',
      });
    }
  });

  const handleToggleFlag = (flag: FeatureFlag) => {
    toggleFlagMutation.mutate({ 
      id: flag.id, 
      isEnabled: !flag.is_enabled 
    });
  };
  
  const handleEditFlag = (flag: FeatureFlag) => {
    setSelectedFlag(flag);
    setDialogOpen(true);
  };
  
  const handleDeleteFlag = (flag: FeatureFlag) => {
    if (window.confirm(`Are you sure you want to delete the feature flag "${flag.name}"?`)) {
      deleteFlagMutation.mutate(flag.id);
    }
  };
  
  const handleOpenCreateDialog = () => {
    setSelectedFlag(null);
    setDialogOpen(true);
  };
  
  const handleCloseDialog = () => {
    setDialogOpen(false);
  };
  
  const getFeatureTypeBadge = (type: string) => {
    switch (type) {
      case 'ui':
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">UI</Badge>;
      case 'api':
        return <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">API</Badge>;
      case 'integration':
        return <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">Integration</Badge>;
      default:
        return <Badge variant="outline">{type}</Badge>;
    }
  };
  
  if (isLoading) {
    return <div className="flex justify-center p-8">Loading feature flags...</div>;
  }
  
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Feature Flags</h2>
        <PermissionGuard permission="feature_flags:create">
          <Button onClick={handleOpenCreateDialog}>
            <PlusIcon className="h-4 w-4 mr-2" />
            Create Flag
          </Button>
        </PermissionGuard>
      </div>
      
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Key</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Last Updated</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {featureFlags && featureFlags.length > 0 ? (
              featureFlags.map((flag: FeatureFlag) => (
                <TableRow key={flag.id}>
                  <TableCell className="font-medium">{flag.name}</TableCell>
                  <TableCell className="font-mono text-sm">{flag.key}</TableCell>
                  <TableCell>{getFeatureTypeBadge(flag.feature_type)}</TableCell>
                  <TableCell>
                    <PermissionGuard permission="feature_flags:update">
                      <Switch 
                        checked={flag.is_enabled}
                        onCheckedChange={() => handleToggleFlag(flag)}
                      />
                    </PermissionGuard>
                    <PermissionGuard permission="feature_flags:update" fallback={
                      <Badge variant={flag.is_enabled ? "success" : "secondary"}>
                        {flag.is_enabled ? 'Enabled' : 'Disabled'}
                      </Badge>
                    } />
                  </TableCell>
                  <TableCell>{formatDate(flag.updated_at)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end space-x-2">
                      <PermissionGuard permission="feature_flags:update">
                        <Button variant="ghost" size="icon" onClick={() => handleEditFlag(flag)}>
                          <PencilIcon className="h-4 w-4" />
                        </Button>
                      </PermissionGuard>
                      <PermissionGuard permission="feature_flags:delete">
                        <Button variant="ghost" size="icon" onClick={() => handleDeleteFlag(flag)}>
                          <TrashIcon className="h-4 w-4" />
                        </Button>
                      </PermissionGuard>
                      <Button variant="ghost" size="icon" as="a" href={`/admin/feature-flags/${flag.id}`}>
                        <ChevronRightIcon className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-6 text-muted-foreground">
                  No feature flags found. Create your first feature flag to get started.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      
      {dialogOpen && (
        <FeatureFlagDialog
          open={dialogOpen}
          onClose={handleCloseDialog}
          featureFlag={selectedFlag}
        />
      )}
    </div>
  );
}
