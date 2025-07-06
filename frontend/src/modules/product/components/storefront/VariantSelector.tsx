'use client';

import { useState, useEffect } from 'react';
import { Check, AlertCircle } from 'lucide-react';
import {
  Card,
  CardContent
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { formatCurrency } from '@/lib/utils/currency';
import type { VariantOption, ProductVariant, Product, VariantOptionValue } from '../../models/product';
import { ProductDomainMethods } from '../../models/product';

interface VariantSelectorProps {
  product: Product;
  onVariantChange: (variant: ProductVariant | null) => void;
}

/**
 * Component for selecting product variants in the storefront
 */
export function VariantSelector({ product, onVariantChange }: VariantSelectorProps) {
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({});
  const [availableOptionValues, setAvailableOptionValues] = useState<Record<string, string[]>>({});

  // Get default variant on initial load
  useEffect(() => {
    if (product && product.variants && product.variants.length > 0) {
      // Find the default variant or use the first one
      const defaultVariant = product.variants.find(v => v.is_default) || product.variants[0] || null;
      setSelectedVariant(defaultVariant);
      onVariantChange(defaultVariant);

      // Set initial selected options based on default variant
      if (defaultVariant && defaultVariant.option_values) {
        const initialOptions: Record<string, string> = {};
        defaultVariant.option_values.forEach(ov => {
          initialOptions[ov.option_id] = ov.value_id;
        });
        setSelectedOptions(initialOptions);
      }
    }
  }, [product, onVariantChange]);

  // Calculate available option values based on current selections
  useEffect(() => {
    if (!product.variants || !product.variant_options) return;

    const availableValues: Record<string, string[]> = {};

    // Initialize with all option values
    product.variant_options.forEach(option => {
      availableValues[option.id] = option.values.map(value => value.id);
    });

    // Determine which values are available based on current selections
    product.variant_options.forEach(option => {
      // Skip the current option when determining availability
      const otherOptionIds = product.variant_options
        ?.filter(o => o.id !== option.id)
        .map(o => o.id) || [];

      // Check if all other options are selected
      const allOtherOptionsSelected = otherOptionIds.every(
        optionId => selectedOptions[optionId]
      );

      // If all other options are selected, we need to find valid combinations
      if (allOtherOptionsSelected && otherOptionIds.length > 0) {
        const validValueIds: string[] = [];

        // For each variant, check if it matches the current selection pattern
        product.variants?.forEach(variant => {
          // Skip out-of-stock variants
          if (variant.inventory_quantity !== undefined && variant.inventory_quantity <= 0) {
            return;
          }

          // Create a map of option_id to value_id from the variant
          const variantOptionMap: Record<string, string> = {};
          variant.option_values?.forEach(ov => {
            variantOptionMap[ov.option_id] = ov.value_id;
          });

          // Check if this variant matches all other selected options
          const matchesOtherSelections = otherOptionIds.every(
            optionId => variantOptionMap[optionId] === selectedOptions[optionId]
          );

          // If matches, add this option's value to valid values
          if (matchesOtherSelections && variantOptionMap[option.id]) {
            const valueId = variantOptionMap[option.id];
            if (valueId) {
              validValueIds.push(valueId);
            }
          }
        });

        // Update available values for this option
        availableValues[option.id] = validValueIds;
      }
    });

    setAvailableOptionValues(availableValues);
  }, [product.variants, product.variant_options, selectedOptions]);

  // Find matching variant when options change
  useEffect(() => {
    if (!product.variants) return;

    const selectedOptionIds = Object.keys(selectedOptions);
    // Only try to find a variant if at least one option is selected
    if (selectedOptionIds.length === 0) return;

    // Find a variant that matches all selected options
    const matchingVariant = product.variants.find(variant => {
      // Create a map of option_id to value_id from the variant
      const variantOptionMap: Record<string, string> = {};
      variant.option_values?.forEach(ov => {
        variantOptionMap[ov.option_id] = ov.value_id;
      });

      // Check if all selected options match this variant
      return selectedOptionIds.every(
        optionId => variantOptionMap[optionId] === selectedOptions[optionId]
      );
    });

    setSelectedVariant(matchingVariant || null);
    onVariantChange(matchingVariant || null);
  }, [selectedOptions, product.variants, onVariantChange]);

  // Handle option selection
  const handleOptionSelect = (optionId: string, valueId: string) => {
    setSelectedOptions(prev => ({
      ...prev,
      [optionId]: valueId
    }));
  };

  // Find option value name by IDs
  const getOptionValueName = (optionId: string, valueId: string): string => {
    const option = product.variant_options?.find(o => o.id === optionId);
    const value = option?.values.find(v => v.id === valueId);
    return value?.name || '';
  };

  // Check if a value is available to select
  const isValueAvailable = (optionId: string, valueId: string): boolean => {
    return availableOptionValues[optionId]?.includes(valueId) || false;
  };

  // Check if a value is selected
  const isValueSelected = (optionId: string, valueId: string): boolean => {
    return selectedOptions[optionId] === valueId;
  };

  // Get stock status for the current variant
  const getStockStatus = (): JSX.Element | null => {
    if (!selectedVariant) return null;

    if (selectedVariant.inventory_quantity !== undefined) {
      if (selectedVariant.inventory_quantity <= 0) {
        return (
          <Alert variant="destructive" className="mt-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              This variant is currently out of stock
            </AlertDescription>
          </Alert>
        );
      } else if (selectedVariant.inventory_quantity < 5) {
        return (
          <Alert variant="default" className="mt-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Only {selectedVariant.inventory_quantity} items left in stock
            </AlertDescription>
          </Alert>
        );
      }
    }

    return (
      <Alert variant="default" className="mt-4">
        <Check className="h-4 w-4" />
        <AlertDescription>
          In stock and ready to ship
        </AlertDescription>
      </Alert>
    );
  };

  // If there are no variants, don't render the component
  if (!product.variants || product.variants.length === 0 || !product.variant_options || product.variant_options.length === 0) {
    return null;
  }

  return (
    <Card className="mb-6">
      <CardContent className="pt-6">
        {/* Variant Selection */}
        <div className="space-y-6">
          {product.variant_options.map((option) => (
            <div key={option.id} className="space-y-3">
              <Label className="text-base font-semibold">{option.name}</Label>
              <div className="flex flex-wrap gap-2">
                {option.values.map((value) => {
                  const isAvailable = isValueAvailable(option.id, value.id);
                  const isSelected = isValueSelected(option.id, value.id);

                  return (
                    <Button
                      key={value.id}
                      variant={isSelected ? "default" : "outline"}
                      size="sm"
                      onClick={() => handleOptionSelect(option.id, value.id)}
                      disabled={!isAvailable}
                      className={`
                        ${isSelected ? "ring-2 ring-primary" : ""}
                        ${!isAvailable ? "opacity-50 cursor-not-allowed" : ""}
                      `}
                    >
                      {value.name}
                      {isSelected && <Check className="ml-1 h-3 w-3" />}
                    </Button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <Separator className="my-4" />

        {/* Selected Variant Details */}
        {selectedVariant ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <div className="text-sm text-muted-foreground">
                  Selected Variant:
                  <span className="ml-2 font-medium text-foreground">
                    {selectedVariant.name ||
                      selectedVariant.option_values?.map(ov =>
                        getOptionValueName(ov.option_id, ov.value_id)
                      ).join(' / ')}
                  </span>
                </div>
                {selectedVariant.sku && (
                  <div className="text-xs text-muted-foreground">
                    SKU: {selectedVariant.sku}
                  </div>
                )}
              </div>
              <div className="text-xl font-bold">
                {selectedVariant.price ?
                  formatCurrency(selectedVariant.price.amount, selectedVariant.price.currency) :
                  formatCurrency(product.price.amount, product.price.currency)}

                {selectedVariant.sale_price && (
                  <span className="ml-2 text-sm line-through text-muted-foreground">
                    {formatCurrency(selectedVariant.price.amount, selectedVariant.price.currency)}
                  </span>
                )}
              </div>
            </div>

            {getStockStatus()}
          </div>
        ) : (
          <p className="text-center text-muted-foreground py-2">
            Please select all options to view variant details
          </p>
        )}
      </CardContent>
    </Card>
  );
}
