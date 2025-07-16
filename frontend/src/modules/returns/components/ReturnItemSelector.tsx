import React, { useState, useEffect } from 'react';
import { OrderItem } from '@/modules/order/models/order';
import { ReturnItemCreate, ReturnReason } from '../models/return';
import { formatCurrency } from '@/utils/format';
import { ReturnReasonSelector } from './ReturnReasonSelector';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Separator } from '@/components/ui/separator';
import { MinusIcon, PlusIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ReturnItemSelectorProps {
  orderItems: OrderItem[];
  selectedItems: ReturnItemCreate[];
  onItemsChange: (items: ReturnItemCreate[]) => void;
  isInvalid?: boolean;
  errorMessage?: string;
}

/**
 * Component for selecting order items to return with quantity support
 */
export const ReturnItemSelector: React.FC<ReturnItemSelectorProps> = ({
  orderItems,
  selectedItems,
  onItemsChange,
  isInvalid = false,
  errorMessage = 'Please select at least one item to return'
}) => {
  const [returnableItems, setReturnableItems] = useState<OrderItem[]>([]);

  // Filter out items that are not returnable (e.g., already fully returned)
  useEffect(() => {
    const filteredItems = orderItems.filter(item => {
      const availableQuantity = item.quantity - (item.returned_quantity || 0);
      return availableQuantity > 0;
    });
    setReturnableItems(filteredItems);
  }, [orderItems]);

  // Check if an item is selected
  const isItemSelected = (itemId: string) => {
    return selectedItems.some(item => item.order_item_id === itemId);
  };

  // Get the return quantity for an item
  const getReturnQuantity = (itemId: string) => {
    const found = selectedItems.find(item => item.order_item_id === itemId);
    return found ? found.quantity : 0;
  };

  // Get the reason for an item
  const getItemReason = (itemId: string) => {
    const found = selectedItems.find(item => item.order_item_id === itemId);
    return found ? found.reason : '';
  };

  // Get the notes for an item
  const getItemNotes = (itemId: string) => {
    const found = selectedItems.find(item => item.order_item_id === itemId);
    return found ? found.customer_notes || '' : '';
  };

  // Toggle item selection
  const toggleItemSelection = (item: OrderItem) => {
    if (isItemSelected(item.id)) {
      // Remove item
      onItemsChange(selectedItems.filter(i => i.order_item_id !== item.id));
    } else {
      // Add item with quantity of 1 and default reason
      const availableQuantity = item.quantity - (item.returned_quantity || 0);
      onItemsChange([
        ...selectedItems,
        {
          order_item_id: item.id,
          quantity: 1,
          reason: ReturnReason.DEFECTIVE,
          customer_notes: ''
        }
      ]);
    }
  };

  // Update item quantity
  const updateItemQuantity = (itemId: string, quantity: number) => {
    const item = orderItems.find(i => i.id === itemId);
    if (!item) return;

    const availableQuantity = item.quantity - (item.returned_quantity || 0);
    quantity = Math.min(Math.max(1, quantity), availableQuantity);

    const updatedItems = selectedItems.map(item => {
      if (item.order_item_id === itemId) {
        return { ...item, quantity };
      }
      return item;
    });

    onItemsChange(updatedItems);
  };

  // Update item reason
  const updateItemReason = (itemId: string, reason: ReturnReason | '') => {
    if (reason === '') return;

    const updatedItems = selectedItems.map(item => {
      if (item.order_item_id === itemId) {
        return { ...item, reason: reason as ReturnReason };
      }
      return item;
    });

    onItemsChange(updatedItems);
  };

  // Update item notes
  const updateItemNotes = (itemId: string, notes: string) => {
    const updatedItems = selectedItems.map(item => {
      if (item.order_item_id === itemId) {
        return { ...item, customer_notes: notes };
      }
      return item;
    });

    onItemsChange(updatedItems);
  };

  return (
    <div className="space-y-4 w-full">
      <h3 className="font-bold text-lg">Select Items to Return</h3>

      {returnableItems.length === 0 ? (
        <p className="text-gray-500">No items available for return.</p>
      ) : (
        <div className="space-y-4">
          {returnableItems.map((item) => {
            const isSelected = isItemSelected(item.id);
            const availableQuantity = item.quantity - (item.returned_quantity || 0);

            return (
              <div
                key={item.id}
                className={cn(
                  "border rounded-md p-4 transition-all duration-200",
                  isSelected
                    ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                    : "border-gray-200 dark:border-gray-700"
                )}
              >
                <div className={cn("flex items-center space-x-4", isSelected && "mb-4")}>
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={() => toggleItemSelection(item)}
                    className="w-5 h-5"
                  />

                  <img
                    src={item.product_image || '/images/placeholder-product.png'}
                    alt={item.product_name}
                    className="w-15 h-15 object-cover rounded-md"
                  />

                  <div className="flex-1 space-y-1">
                    <h4 className="font-medium">{item.product_name}</h4>
                    {item.variant_name && (
                      <p className="text-sm text-gray-500">
                        Variant: {item.variant_name}
                      </p>
                    )}
                    <div className="flex items-center space-x-2 text-sm">
                      <span>{formatCurrency(item.unit_price / 100)}</span>
                      <span className="text-gray-500">·</span>
                      <span className="text-gray-500">
                        Qty: {item.quantity} {item.returned_quantity ? `(${item.returned_quantity} returned)` : ''}
                      </span>
                    </div>
                  </div>

                  {isSelected && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="flex items-center space-x-2">
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => updateItemQuantity(item.id, getReturnQuantity(item.id) - 1)}
                              disabled={getReturnQuantity(item.id) <= 1}
                            >
                              <MinusIcon className="h-4 w-4" />
                            </Button>
                            <Input
                              type="number"
                              value={getReturnQuantity(item.id)}
                              onChange={(e) => updateItemQuantity(item.id, parseInt(e.target.value) || 1)}
                              min={1}
                              max={availableQuantity}
                              className="w-16 text-center"
                            />
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => updateItemQuantity(item.id, getReturnQuantity(item.id) + 1)}
                              disabled={getReturnQuantity(item.id) >= availableQuantity}
                            >
                              <PlusIcon className="h-4 w-4" />
                            </Button>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>You can return up to {availableQuantity} items</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                </div>

                {isSelected && (
                  <div className="mt-4">
                    <Separator className="my-3" />
                    <ReturnReasonSelector
                      selectedReason={getItemReason(item.id) as ReturnReason}
                      explanation={getItemNotes(item.id)}
                      onReasonChange={(reason) => updateItemReason(item.id, reason)}
                      onExplanationChange={(notes) => updateItemNotes(item.id, notes)}
                      isRequired={true}
                      isInvalid={false}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {isInvalid && (
        <p className="text-red-500 text-sm mt-2">{errorMessage}</p>
      )}
    </div>
  );
};

export default ReturnItemSelector;
