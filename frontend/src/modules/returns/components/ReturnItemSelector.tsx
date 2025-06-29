import React, { useState, useEffect } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Image,
  Checkbox,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
  FormControl,
  FormLabel,
  FormErrorMessage,
  Divider,
  Badge,
  useColorModeValue,
  Tooltip,
  Select
} from '@chakra-ui/react';
import { OrderItem } from '@/modules/orders/models/order';
import { ReturnItemCreate, ReturnReason } from '../models/return';
import { formatCurrency } from '@/utils/format';
import { ReturnReasonSelector } from './ReturnReasonSelector';

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
  
  // Colors
  const borderColor = useColorModeValue('gray.200', 'gray.700');
  const selectedBgColor = useColorModeValue('blue.50', 'blue.900');
  
  return (
    <VStack spacing={4} align="stretch" width="100%">
      <Text fontWeight="bold" fontSize="lg">Select Items to Return</Text>
      
      {returnableItems.length === 0 ? (
        <Text color="gray.500">No items available for return.</Text>
      ) : (
        <VStack spacing={4} align="stretch">
          {returnableItems.map((item) => {
            const isSelected = isItemSelected(item.id);
            const availableQuantity = item.quantity - (item.returned_quantity || 0);
            
            return (
              <Box 
                key={item.id}
                borderWidth="1px" 
                borderRadius="md" 
                borderColor={isSelected ? 'blue.500' : borderColor}
                bg={isSelected ? selectedBgColor : 'transparent'}
                p={4}
                transition="all 0.2s"
              >
                <HStack spacing={4} mb={isSelected ? 4 : 0}>
                  <Checkbox 
                    isChecked={isSelected}
                    onChange={() => toggleItemSelection(item)}
                    size="lg"
                  />
                  
                  <Image 
                    src={item.product_image || '/images/placeholder-product.png'}
                    alt={item.product_name}
                    boxSize="60px"
                    objectFit="cover"
                    borderRadius="md"
                  />
                  
                  <VStack align="start" flex={1}>
                    <Text fontWeight="medium">{item.product_name}</Text>
                    {item.variant_name && (
                      <Text fontSize="sm" color="gray.500">
                        Variant: {item.variant_name}
                      </Text>
                    )}
                    <HStack>
                      <Text>{formatCurrency(item.unit_price / 100)}</Text>
                      <Text color="gray.500">·</Text>
                      <Text color="gray.500">
                        Qty: {item.quantity} {item.returned_quantity ? `(${item.returned_quantity} returned)` : ''}
                      </Text>
                    </HStack>
                  </VStack>
                  
                  {isSelected && (
                    <Tooltip 
                      label={`You can return up to ${availableQuantity} items`}
                      placement="top"
                    >
                      <Box>
                        <NumberInput 
                          value={getReturnQuantity(item.id)}
                          onChange={(_, valueAsNumber) => updateItemQuantity(item.id, valueAsNumber)}
                          min={1}
                          max={availableQuantity}
                          size="sm"
                          w="80px"
                        >
                          <NumberInputField />
                          <NumberInputStepper>
                            <NumberIncrementStepper />
                            <NumberDecrementStepper />
                          </NumberInputStepper>
                        </NumberInput>
                      </Box>
                    </Tooltip>
                  )}
                </HStack>
                
                {isSelected && (
                  <Box mt={4}>
                    <Divider my={3} />
                    <ReturnReasonSelector 
                      selectedReason={getItemReason(item.id) as ReturnReason}
                      explanation={getItemNotes(item.id)}
                      onReasonChange={(reason) => updateItemReason(item.id, reason)}
                      onExplanationChange={(notes) => updateItemNotes(item.id, notes)}
                      isRequired={true}
                      isInvalid={false}
                    />
                  </Box>
                )}
              </Box>
            );
          })}
        </VStack>
      )}
      
      {isInvalid && (
        <FormErrorMessage mt={2}>{errorMessage}</FormErrorMessage>
      )}
    </VStack>
  );
};

export default ReturnItemSelector;
