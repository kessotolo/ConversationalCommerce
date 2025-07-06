'use client';

import { useState, useEffect } from 'react';
import { Edit2, Trash2, Plus, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/Table';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/AlertDialog';
import type { ProductVariant, VariantOption } from '../../models/product';
import { ProductVariantService } from '../../services/ProductVariantService';
import { useTenant } from '@/modules/tenant/hooks/useTenant';
import { formatCurrency } from '@/lib/utils/currency';

interface VariantListProps {
  productId: string;
  onEdit: (variant: ProductVariant) => void;
  onAdd: () => void;
  refresh: boolean;
  onRefreshComplete: () => void;
}

/**
 * Component for displaying and managing product variants in a list
 */
export function VariantList({
  productId,
  onEdit,
  onAdd,
  refresh,
  onRefreshComplete
}: VariantListProps) {
  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [loading, setLoading] = useState(false);
  const [options, setOptions] = useState<VariantOption[]>([]);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [variantToDelete, setVariantToDelete] = useState<ProductVariant | null>(null);
  const { tenant } = useTenant();
  const { toast } = useToast();

  // Load variants and options
  useEffect(() => {
    if (!productId || !tenant?.id) return;
    
    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch variants
        const variantData = await ProductVariantService.getProductVariants(
          productId, 
          tenant.id
        );
        setVariants(variantData);
        
        // Fetch options
        const optionData = await ProductVariantService.getVariantOptions(
          productId, 
          tenant.id
        );
        setOptions(optionData);
      } catch (error) {
        toast({
          title: "Error loading variants",
          description: "Failed to load product variants. Please try again.",
          variant: "destructive",
        });
        console.error("Error fetching variants:", error);
      } finally {
        setLoading(false);
        onRefreshComplete();
      }
    };

    if (refresh) {
      fetchData();
    }
  }, [productId, tenant?.id, refresh, toast, onRefreshComplete]);

  // Get variant option value names
  const getValueNames = (variant: ProductVariant): string => {
    if (!variant.option_values || variant.option_values.length === 0) {
      return '-';
    }

    // Map option values to their names using options
    const valueNames: string[] = [];
    
    variant.option_values.forEach(optionValue => {
      const option = options.find(o => o.id === optionValue.option_id);
      if (option) {
        const value = option.values.find(v => v.id === optionValue.value_id);
        if (value) {
          valueNames.push(`${option.name}: ${value.name}`);
        }
      }
    });

    return valueNames.join(' / ');
  };

  // Handle delete variant
  const handleDelete = async () => {
    if (!variantToDelete || !tenant?.id) return;
    
    try {
      await ProductVariantService.deleteProductVariant(
        variantToDelete.id,
        tenant.id
      );
      
      setVariants(variants.filter(v => v.id !== variantToDelete.id));
      
      toast({
        title: "Variant deleted",
        description: "Product variant was successfully deleted.",
      });
    } catch (error) {
      toast({
        title: "Error deleting variant",
        description: "Failed to delete product variant. Please try again.",
        variant: "destructive",
      });
      console.error("Error deleting variant:", error);
    } finally {
      setVariantToDelete(null);
      setDeleteDialogOpen(false);
    }
  };

  // Confirmation dialog for variant deletion
  const confirmDelete = (variant: ProductVariant) => {
    setVariantToDelete(variant);
    setDeleteDialogOpen(true);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Product Variants</CardTitle>
        <Button onClick={onAdd}>
          <Plus className="h-4 w-4 mr-2" />
          Add Variant
        </Button>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center items-center p-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : variants.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>No variants found for this product.</p>
            <Button 
              variant="outline" 
              onClick={onAdd}
              className="mt-4"
            >
              Create your first variant
            </Button>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>SKU</TableHead>
                <TableHead>Variant</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Inventory</TableHead>
                <TableHead>Default</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {variants.map((variant) => (
                <TableRow key={variant.id}>
                  <TableCell className="font-mono text-sm">
                    {variant.sku}
                  </TableCell>
                  <TableCell>
                    {variant.name || getValueNames(variant)}
                  </TableCell>
                  <TableCell>
                    {variant.price ? formatCurrency(variant.price.amount, variant.price.currency) : '-'}
                  </TableCell>
                  <TableCell>
                    {variant.inventory_quantity !== undefined ? variant.inventory_quantity : '-'}
                  </TableCell>
                  <TableCell>
                    {variant.is_default && (
                      <Badge variant="outline" className="bg-primary/10">
                        Default
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => onEdit(variant)}
                      >
                        <Edit2 className="h-4 w-4" />
                        <span className="sr-only">Edit</span>
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-500 hover:text-red-700"
                        onClick={() => confirmDelete(variant)}
                      >
                        <Trash2 className="h-4 w-4" />
                        <span className="sr-only">Delete</span>
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm deletion</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this variant? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-500 hover:bg-red-600"
              onClick={handleDelete}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
