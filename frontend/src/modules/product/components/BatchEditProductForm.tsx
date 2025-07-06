'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/Form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/Textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/Checkbox';
import { useToast } from '@/components/ui/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/Alert';
import { AlertCircle } from 'lucide-react';
import { ProductStatus, ProductType } from '../models/product';
import { productBulkOperationsService } from '../services/ProductBulkOperationsService';

/**
 * Schema for batch edit form validation
 * Only includes fields that make sense to update in bulk
 */
const batchEditSchema = z.object({
  status: z.string().nullable(),
  price: z.string().nullable(),
  sale_price: z.string().nullable(),
  track_inventory: z.boolean().nullable(),
  categories: z.string().nullable(),
  tags: z.string().nullable(),
});

type BatchEditFormValues = z.infer<typeof batchEditSchema>;

interface BatchEditProductFormProps {
  tenantId: string;
}

/**
 * Batch Edit Product Form Component
 * Allows editing multiple products at once
 */
export function BatchEditProductForm({ tenantId }: BatchEditProductFormProps) {
  const { toast } = useToast();
  const router = useRouter();
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form definition using react-hook-form with zod validation
  const form = useForm<BatchEditFormValues>({
    resolver: zodResolver(batchEditSchema),
    defaultValues: {
      status: null,
      price: null,
      sale_price: null,
      track_inventory: null,
      categories: null,
      tags: null,
    },
  });

  // Load selected product IDs from session storage on component mount
  useEffect(() => {
    const storedIds = sessionStorage.getItem('batchEditProductIds');
    if (storedIds) {
      try {
        const parsedIds = JSON.parse(storedIds);
        setSelectedProductIds(parsedIds);
      } catch (error) {
        console.error('Failed to parse stored product IDs:', error);
        // Navigate back if we can't load the IDs
        router.push('/dashboard/products');
      }
    } else {
      // Navigate back if no IDs were stored
      router.push('/dashboard/products');
    }
  }, [router]);

  /**
   * Handle form submission
   * @param values Form values from react-hook-form
   */
  const onSubmit = async (values: BatchEditFormValues) => {
    if (!selectedProductIds.length) {
      toast({
        title: "No products selected",
        description: "There are no products selected for batch editing",
        variant: "destructive",
      });
      return;
    }

    // Filter out null values to only update fields that were changed
    const updates: Record<string, any> = {};
    
    if (values.status) {
      updates.status = values.status;
    }
    
    if (values.price !== null) {
      const priceValue = parseFloat(values.price);
      if (!isNaN(priceValue)) {
        updates.price = {
          amount: priceValue,
          // Note: This assumes all products use the same currency
          // In a real app, you might want to specify currency in the form
          currency: 'USD', 
        };
      }
    }
    
    if (values.sale_price !== null) {
      if (values.sale_price === '') {
        // Handle removing sale price
        updates.sale_price = null;
      } else {
        const salePriceValue = parseFloat(values.sale_price);
        if (!isNaN(salePriceValue)) {
          updates.sale_price = {
            amount: salePriceValue,
            currency: 'USD',
          };
        }
      }
    }
    
    if (values.track_inventory !== null) {
      updates.track_inventory = values.track_inventory;
    }
    
    if (values.categories !== null) {
      updates.categories = values.categories
        .split(',')
        .map(category => category.trim())
        .filter(category => category !== '');
    }
    
    if (values.tags !== null) {
      updates.tags = values.tags
        .split(',')
        .map(tag => tag.trim())
        .filter(tag => tag !== '');
    }
    
    // Only proceed if there are actual updates
    if (Object.keys(updates).length === 0) {
      toast({
        title: "No changes",
        description: "No fields were modified for batch update",
        variant: "info",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await productBulkOperationsService.batchEditProducts(
        selectedProductIds,
        updates,
        tenantId
      );
      
      if (result.success) {
        toast({
          title: "Products Updated",
          description: `Successfully updated ${selectedProductIds.length} products`,
          variant: "success",
        });
        
        // Clear session storage and redirect back to products page
        sessionStorage.removeItem('batchEditProductIds');
        router.push('/dashboard/products');
      } else {
        toast({
          title: "Update Failed",
          description: result.error?.message || "Failed to update products",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * Handle cancellation - clear storage and redirect
   */
  const handleCancel = () => {
    sessionStorage.removeItem('batchEditProductIds');
    router.push('/dashboard/products');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl font-bold">
          Batch Edit Products ({selectedProductIds.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Alert className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Note</AlertTitle>
          <AlertDescription>
            Only fields you change will be updated. Leave fields blank to keep their current values.
          </AlertDescription>
        </Alert>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Status Field */}
            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value || undefined}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="No change" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {Object.values(ProductStatus).map((status) => (
                        <SelectItem key={status} value={status}>
                          {status}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Update the status of all selected products
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {/* Price Field */}
            <FormField
              control={form.control}
              name="price"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Price</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="No change"
                      type="number"
                      step="0.01"
                      min="0"
                      {...field}
                      value={field.value || ''}
                      onChange={(e) => {
                        field.onChange(e.target.value);
                      }}
                    />
                  </FormControl>
                  <FormDescription>
                    Set a new price for all selected products (in USD)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {/* Sale Price Field */}
            <FormField
              control={form.control}
              name="sale_price"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Sale Price</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="No change"
                      type="number"
                      step="0.01"
                      min="0"
                      {...field}
                      value={field.value || ''}
                      onChange={(e) => {
                        field.onChange(e.target.value);
                      }}
                    />
                  </FormControl>
                  <FormDescription>
                    Set a new sale price for all selected products (leave empty to remove sale price)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {/* Track Inventory */}
            <FormField
              control={form.control}
              name="track_inventory"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                  <FormControl>
                    <Checkbox
                      checked={field.value === true}
                      onCheckedChange={(checked) => {
                        field.onChange(checked === 'indeterminate' ? null : checked);
                      }}
                      className="data-[state=indeterminate]:bg-primary"
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>Track Inventory</FormLabel>
                    <FormDescription>
                      Enable inventory tracking for all selected products
                    </FormDescription>
                  </div>
                </FormItem>
              )}
            />
            
            {/* Categories Field */}
            <FormField
              control={form.control}
              name="categories"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Categories</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="No change"
                      {...field}
                      value={field.value || ''}
                      onChange={(e) => {
                        field.onChange(e.target.value);
                      }}
                    />
                  </FormControl>
                  <FormDescription>
                    Enter category IDs, comma-separated
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {/* Tags Field */}
            <FormField
              control={form.control}
              name="tags"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tags</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="No change"
                      {...field}
                      value={field.value || ''}
                      onChange={(e) => {
                        field.onChange(e.target.value);
                      }}
                    />
                  </FormControl>
                  <FormDescription>
                    Enter tags, comma-separated
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {/* Action Buttons */}
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleCancel}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting || selectedProductIds.length === 0}
              >
                {isSubmitting ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
