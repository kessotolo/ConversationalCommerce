'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, ArrowDownToLine, ArrowUpFromLine, Edit2, Trash2, RefreshCw, Tag } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ProductStatus } from '@/modules/product/models/product';
import { productBulkOperationsService } from '@/modules/product/services/ProductBulkOperationsService';
import { productCsvService } from '@/modules/product/services/ProductCsvService';
import { useToast } from '@/components/ui/use-toast';

/**
 * Props for the BulkProductActions component
 *
 * @interface BulkProductActionsProps
 * @property {string[]} selectedProductIds - IDs of selected products
 * @property {Product[]} selectedProducts - Full product objects for selected products
 * @property {string} tenantId - Current tenant ID
 * @property {function} onOperationComplete - Callback after operation completes
 * @property {function} clearSelection - Function to clear selection after operation
 */
interface BulkProductActionsProps {
  /** IDs of selected products */
  selectedProductIds: string[];
  /** Full product objects for selected products (used for CSV export) */
  selectedProducts: any[];
  /** Current tenant ID */
  tenantId: string;
  /** Callback after operation completes */
  onOperationComplete: () => void;
  /** Function to clear selection after operation */
  clearSelection: () => void;
}

/**
 * BulkProductActions Component
 * Provides UI for performing bulk operations on selected products
 *
 * @param {BulkProductActionsProps} props - Component props
 * @returns {JSX.Element} Rendered component with bulk action buttons
 */
export function BulkProductActions({
  selectedProductIds,
  selectedProducts,
  tenantId,
  onOperationComplete,
  clearSelection,
}: BulkProductActionsProps) {
  const { toast } = useToast();
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [csvImportFile, setCsvImportFile] = useState<File | null>(null);
  const [isImporting, setIsImporting] = useState(false);

  // Check if we have products selected
  const hasSelection = selectedProductIds.length > 0;

  /**
   * Handle status update for multiple products
   * @param status - New status to apply
   */
  const handleUpdateStatus = async (status: ProductStatus) => {
    if (!hasSelection) return;

    setIsProcessing(true);
    try {
      const result = await productBulkOperationsService.bulkUpdateStatus(
        selectedProductIds,
        status,
        tenantId
      );

      if (result.success) {
        toast({
          title: "Status Updated",
          description: `Updated ${selectedProductIds.length} products to ${status}`,
          variant: "success",
        });
        onOperationComplete();
        clearSelection();
      } else {
        toast({
          title: "Update Failed",
          description: result.error?.message || "Failed to update product status",
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
      setIsProcessing(false);
    }
  };

  /**
   * Handle bulk deletion of products
   */
  const handleDeleteProducts = async () => {
    if (!hasSelection) return;

    setIsDeleting(true);
    try {
      const result = await productBulkOperationsService.deleteProducts(
        selectedProductIds,
        tenantId
      );

      if (result.success) {
        toast({
          title: "Products Deleted",
          description: `Successfully deleted ${selectedProductIds.length} products`,
          variant: "success",
        });
        onOperationComplete();
        clearSelection();
      } else {
        toast({
          title: "Deletion Failed",
          description: result.error?.message || "Failed to delete products",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred during deletion",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
    }
  };

  /**
   * Handle CSV export of selected products
   */
  const handleExportCsv = () => {
    if (!hasSelection) return;

    setIsExporting(true);
    try {
      // Generate filename with timestamp
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `products-export-${timestamp}.csv`;

      productCsvService.downloadProductsCsv(selectedProducts, filename);

      toast({
        title: "Export Complete",
        description: `${selectedProducts.length} products exported to CSV`,
        variant: "success",
      });
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "Failed to export products to CSV",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  /**
   * Handle CSV file selection for import
   */
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setCsvImportFile(e.target.files[0] || null);
    } else {
      setCsvImportFile(null);
    }
  };

  /**
   * Handle CSV import of products
   */
  const handleImportCsv = async () => {
    if (!csvImportFile) {
      toast({
        title: "Import Failed",
        description: "Please select a CSV file to import",
        variant: "destructive",
      });
      return;
    }

    setIsImporting(true);
    try {
      // Read file contents
      const text = await csvImportFile.text();

      // Parse CSV
      const importedData = productCsvService.importProductsFromCsv(text);

      // Validate imported data
      const validation = productCsvService.validateImportedProducts(importedData);

      if (validation.errors.length) {
        toast({
          title: "Validation Error",
          description: `${validation.errors.length} validation errors found`,
          variant: "destructive",
        });

        // Here you could show detailed errors in UI
        console.error("Validation errors:", validation.errors);
        return;
      }

      // Here you would send the validated data to your API
      // This is just a placeholder to simulate success
      toast({
        title: "Import Started",
        description: `Processing ${validation.valid.length} products for import`,
        variant: "success",
      });

      // Navigate to import status page or refresh current page
      // router.push('/dashboard/products/import-status');

      onOperationComplete();
    } catch (error) {
      toast({
        title: "Import Failed",
        description: "Failed to process CSV file",
        variant: "destructive",
      });
    } finally {
      setIsImporting(false);
      setCsvImportFile(null);
    }
  };

  /**
   * Navigate to batch edit page for selected products
   */
  const handleBatchEdit = () => {
    if (!hasSelection) return;

    // Store selected product IDs in session storage for the edit page
    sessionStorage.setItem('batchEditProductIds', JSON.stringify(selectedProductIds));
    router.push('/dashboard/products/batch-edit');
  };

  /**
   * Navigate to bulk inventory update page for selected products
   */
  const handleBulkInventory = () => {
    if (!hasSelection) return;

    // Store selected product IDs in session storage for the edit page
    sessionStorage.setItem('bulkInventoryProductIds', JSON.stringify(selectedProductIds));
    router.push('/dashboard/products/bulk-inventory');
  };

  // Disable all actions if no products are selected
  if (!hasSelection) {
    return (
      <div className="bg-gray-50 p-4 rounded-lg shadow-sm mb-4">
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-500">
            Select products to perform bulk actions
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 p-4 rounded-lg shadow-sm mb-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-sm font-medium">
          {selectedProductIds.length} {selectedProductIds.length === 1 ? 'product' : 'products'} selected
        </div>

        <div className="flex flex-wrap gap-2">
          {/* Status Update */}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="flex items-center gap-1"
                disabled={isProcessing}
              >
                <RefreshCw className="h-4 w-4 mr-1" />
                Update Status
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-56 p-2">
              <div className="flex flex-col gap-1">
                {Object.values(ProductStatus).map((status) => (
                  <Button
                    key={status}
                    variant="ghost"
                    size="sm"
                    className="justify-start"
                    onClick={() => handleUpdateStatus(status)}
                  >
                    {status}
                  </Button>
                ))}
              </div>
            </PopoverContent>
          </Popover>

          {/* Batch Edit */}
          <Button
            variant="outline"
            size="sm"
            className="flex items-center gap-1"
            onClick={handleBatchEdit}
          >
            <Edit2 className="h-4 w-4 mr-1" />
            Batch Edit
          </Button>

          {/* Bulk Inventory */}
          <Button
            variant="outline"
            size="sm"
            className="flex items-center gap-1"
            onClick={handleBulkInventory}
          >
            <Tag className="h-4 w-4 mr-1" />
            Update Inventory
          </Button>

          {/* Export to CSV */}
          <Button
            variant="outline"
            size="sm"
            className="flex items-center gap-1"
            onClick={handleExportCsv}
            disabled={isExporting}
          >
            <ArrowDownToLine className="h-4 w-4 mr-1" />
            Export CSV
          </Button>

          {/* Import from CSV */}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="flex items-center gap-1"
              >
                <ArrowUpFromLine className="h-4 w-4 mr-1" />
                Import CSV
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-72 p-4">
              <div className="flex flex-col gap-4">
                <h4 className="font-medium">Import Products from CSV</h4>
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleFileChange}
                  className="text-sm"
                />
                <Button
                  onClick={handleImportCsv}
                  disabled={!csvImportFile || isImporting}
                  className="w-full"
                >
                  {isImporting ? 'Importing...' : 'Import'}
                </Button>
              </div>
            </PopoverContent>
          </Popover>

          {/* Delete */}
          <Button
            variant="destructive"
            size="sm"
            className="flex items-center gap-1"
            onClick={() => setDeleteDialogOpen(true)}
            disabled={isDeleting}
          >
            <Trash2 className="h-4 w-4 mr-1" />
            Delete
          </Button>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete {selectedProductIds.length} {selectedProductIds.length === 1 ? 'product' : 'products'}.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteProducts}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
