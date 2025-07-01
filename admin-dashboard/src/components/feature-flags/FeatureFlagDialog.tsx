import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useToast } from '@/components/ui/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { FeatureFlag } from '@/types/feature-flags';

const featureFlagSchema = z.object({
  key: z.string().min(1, 'Key is required').max(100),
  name: z.string().min(1, 'Name is required').max(200),
  description: z.string().optional(),
  is_enabled: z.boolean().default(false),
  feature_type: z.string().min(1, 'Type is required'),
  config: z.any().optional(),
});

type FormValues = z.infer<typeof featureFlagSchema>;

interface FeatureFlagDialogProps {
  open: boolean;
  onClose: () => void;
  featureFlag: FeatureFlag | null;
}

export default function FeatureFlagDialog({ open, onClose, featureFlag }: FeatureFlagDialogProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const isEditMode = Boolean(featureFlag);

  const form = useForm<FormValues>({
    resolver: zodResolver(featureFlagSchema),
    defaultValues: featureFlag
      ? {
          key: featureFlag.key,
          name: featureFlag.name,
          description: featureFlag.description || '',
          is_enabled: featureFlag.is_enabled,
          feature_type: featureFlag.feature_type,
          config: featureFlag.config || {},
        }
      : {
          key: '',
          name: '',
          description: '',
          is_enabled: false,
          feature_type: 'ui',
          config: {},
        },
  });

  const createMutation = useMutation({
    mutationFn: (values: FormValues) => api.post('/api/admin/feature-flags', values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['featureFlags'] });
      toast({
        title: 'Feature flag created',
        description: 'The feature flag has been created successfully.',
      });
      onClose();
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: 'Failed to create feature flag.',
        variant: 'destructive',
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: (values: FormValues) =>
      api.put(`/api/admin/feature-flags/${featureFlag?.id}`, values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['featureFlags'] });
      toast({
        title: 'Feature flag updated',
        description: 'The feature flag has been updated successfully.',
      });
      onClose();
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: 'Failed to update feature flag.',
        variant: 'destructive',
      });
    },
  });

  const onSubmit = (values: FormValues) => {
    if (isEditMode) {
      updateMutation.mutate(values);
    } else {
      createMutation.mutate(values);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>
            {isEditMode ? 'Edit Feature Flag' : 'Create Feature Flag'}
          </DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input placeholder="New Checkout Flow" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="key"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Key</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="new_checkout_flow" 
                        {...field} 
                        disabled={isEditMode} // Can't change key once created
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Describe what this feature flag controls..."
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="feature_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a feature type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="ui">UI</SelectItem>
                        <SelectItem value="api">API</SelectItem>
                        <SelectItem value="integration">Integration</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="is_enabled"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                    <div className="space-y-0.5">
                      <FormLabel>Enabled</FormLabel>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>
            
            <div className="flex justify-end space-x-2 pt-4">
              <Button variant="outline" onClick={onClose} type="button">
                Cancel
              </Button>
              <Button type="submit" loading={createMutation.isPending || updateMutation.isPending}>
                {isEditMode ? 'Update' : 'Create'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
