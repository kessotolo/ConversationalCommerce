'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

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
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/components/ui/use-toast';
import { useTenant } from '@/contexts/TenantContext';
import type { ProductVariant, VariantOption } from '../../models/product';
import { ProductVariantService } from '../../services/ProductVariantService';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

// Form validation schema - complex type inference with react-hook-form
const variantFormSchema = z.object({
  sku: z.string().min(1, 'SKU is required'),
  name: z.string().optional(),
  price: z.coerce.number().min(0, 'Price must be 0 or greater').optional(),
  inventory_quantity: z.coerce.number().int().min(0, 'Inventory must be 0 or greater').optional(),
  image_url: z.string().url('Invalid URL').optional().or(z.literal('')),
  barcode: z.string().optional(),
  weight: z.coerce.number().min(0).optional(),
  weight_unit: z.string().optional(),
  is_default: z.boolean(),
});

type VariantFormValues = z.infer<typeof variantFormSchema>;

interface VariantFormProps {
  productId: string;
  variant?: ProductVariant;
  options: VariantOption[];
  onSuccess: () => void;
  onCancel: () => void;
}

/**
 * Form component for creating or editing product variants
 */
export function VariantForm({
  productId,
  variant,
  options,
  onSuccess,
  onCancel
}: VariantFormProps) {
  const [loading, setLoading] = useState(false);
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({});
  const { tenant } = useTenant();
  const { toast } = useToast();

  // Initialize form with default values or variant data
  // @ts-ignore - Complex type inference issue with react-hook-form and zod schemas
  const form = useForm<VariantFormValues>({
    resolver: zodResolver(variantFormSchema),
    defaultValues: {
      sku: variant?.sku || '',
      name: variant?.name || '',
      price: variant?.price ? Number(variant.price.amount) : undefined,
      inventory_quantity: variant?.inventory_quantity,
      image_url: variant?.image_url || '',
      barcode: variant?.barcode || '',
      weight: variant?.weight,
      weight_unit: variant?.weight_unit || 'kg',
      is_default: variant?.is_default ?? false,
    },
  });

  // Populate selected options from variant data
  useEffect(() => {
    if (variant && variant.option_values && options.length > 0) {
      const optionSelections: Record<string, string> = {};

      variant.option_values.forEach((optionValue) => {
        optionSelections[optionValue.option_id] = optionValue.value_id;
      });

      setSelectedOptions(optionSelections);
    }
  }, [variant, options]);

  // Handle form submission
  const onSubmit = async (data: VariantFormValues) => {
    if (!tenant?.id) {
      toast({
        title: "Error",
        description: "Tenant information is missing.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      // Convert selectedOptions to the format expected by the API
      const optionValueIds = Object.values(selectedOptions);

      // Create the variant data object
      const variantData = {
        ...data,
        option_value_ids: optionValueIds,
      };

      if (variant) {
        // Update existing variant
        await ProductVariantService.updateProductVariant(
          variant.id,
          tenant.id,
          variantData
        );
        toast({
          title: "Success",
          description: "Product variant updated successfully.",
        });
      } else {
        // Create new variant
        await ProductVariantService.createProductVariant(
          productId,
          tenant.id,
          variantData
        );
        toast({
          title: "Success",
          description: "Product variant created successfully.",
        });
      }

      onSuccess();
    } catch (error) {
      console.error("Error saving variant:", error);
      toast({
        title: "Error",
        description: "Failed to save product variant. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Handle option selection
  const handleOptionChange = (optionId: string, valueId: string) => {
    setSelectedOptions((prev) => ({
      ...prev,
      [optionId]: valueId,
    }));
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>{variant ? 'Edit Variant' : 'Add Variant'}</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Basic Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Basic Information</h3>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="sku"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>SKU*</FormLabel>
                      <FormControl>
                        <Input placeholder="SKU-12345" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="Variant name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="price"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Price (Optional)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="inventory_quantity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Inventory Quantity</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="0"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="image_url"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Image URL</FormLabel>
                    <FormControl>
                      <Input placeholder="https://example.com/image.jpg" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <Separator />

            {/* Options */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Variant Options</h3>

              {options.length === 0 ? (
                <div className="text-center py-4 text-muted-foreground">
                  <p>No variant options defined for this product.</p>
                  <p className="text-sm">Create variant options first before adding variants.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {options.map((option) => (
                    <div key={option.id} className="space-y-2">
                      <FormLabel>{option.name}</FormLabel>
                      <Select
                        value={selectedOptions[option.id] || ''}
                        onValueChange={(value) => handleOptionChange(option.id, value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={`Select ${option.name}`} />
                        </SelectTrigger>
                        <SelectContent>
                          {option.values.map((value) => (
                            <SelectItem key={value.id} value={value.id}>
                              {value.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <Separator />

            {/* Additional Details */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Additional Details</h3>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="barcode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Barcode</FormLabel>
                      <FormControl>
                        <Input placeholder="Barcode" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-2">
                  <FormField
                    control={form.control}
                    name="weight"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Weight</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="0.00"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="weight_unit"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Unit</FormLabel>
                        <Select
                          value={field.value || 'kg'}
                          onValueChange={field.onChange}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="kg">kg</SelectItem>
                            <SelectItem value="g">g</SelectItem>
                            <SelectItem value="lb">lb</SelectItem>
                            <SelectItem value="oz">oz</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <FormField
                control={form.control}
                name="is_default"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Default Variant</FormLabel>
                      <p className="text-sm text-muted-foreground">
                        Set as the default variant for this product
                      </p>
                    </div>
                  </FormItem>
                )}
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Saving...' : variant ? 'Update Variant' : 'Create Variant'}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
