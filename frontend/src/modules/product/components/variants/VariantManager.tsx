'use client';

import { useState } from 'react';
import { PlusCircle } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import type { VariantOption } from '../../models/product';
import { VariantOptionType } from '../../models/product';
import { VariantOptionItem } from './VariantOptionItem';

/**
 * Props for the VariantManager component
 */
interface VariantManagerProps {
  /** Initial variant options to populate the component */
  initialOptions?: VariantOption[];
  /** Callback when options are changed */
  onChange: (options: VariantOption[]) => void;
}

/**
 * Main component for managing product variants and options
 * Orchestrates the creation and management of variant options
 */
export function VariantManager({
  initialOptions = [],
  onChange,
}: VariantManagerProps) {
  const [options, setOptions] = useState<VariantOption[]>(initialOptions);
  const [showAddOption, setShowAddOption] = useState(false);
  const [newOptionName, setNewOptionName] = useState('');
  const [newOptionType, setNewOptionType] = useState<VariantOptionType>(VariantOptionType.COLOR);
  const { toast } = useToast();

  /**
   * Update a variant option
   */
  const handleUpdateOption = (updatedOption: VariantOption) => {
    const updatedOptions = options.map((opt) =>
      opt.id === updatedOption.id ? updatedOption : opt
    );

    setOptions(updatedOptions);
    onChange(updatedOptions);
  };

  /**
   * Delete a variant option
   */
  const handleDeleteOption = (optionId: string) => {
    const updatedOptions = options.filter((opt) => opt.id !== optionId);
    setOptions(updatedOptions);
    onChange(updatedOptions);
  };

  /**
   * Add a new variant option
   */
  const handleAddOption = () => {
    if (!newOptionName.trim()) {
      toast({
        title: "Error",
        description: "Option name cannot be empty",
        variant: "destructive",
      });
      return;
    }

    const newOption: VariantOption = {
      id: `temp-${Date.now()}`, // This would be replaced with a server-generated ID
      name: newOptionName.trim(),
      type: newOptionType,
      values: [],
    };

    const updatedOptions = [...options, newOption];
    setOptions(updatedOptions);
    onChange(updatedOptions);

    setNewOptionName('');
    setShowAddOption(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Product Variants</h3>
      </div>

      <div className="space-y-4">
        {options.map((option) => (
          <VariantOptionItem
            key={option.id}
            option={option}
            onUpdate={handleUpdateOption}
            onDelete={handleDeleteOption}
          />
        ))}

        {showAddOption ? (
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col gap-4">
                <div>
                  <Label htmlFor="optionName">Option Name</Label>
                  <Input
                    id="optionName"
                    value={newOptionName}
                    onChange={(e) => setNewOptionName(e.target.value)}
                    placeholder="e.g., Size, Color, Material"
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="optionType">Option Type</Label>
                  <Select
                    value={newOptionType}
                    onValueChange={(value) => setNewOptionType(value as VariantOptionType)}
                  >
                    <SelectTrigger id="optionType" className="mt-1">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.values(VariantOptionType).map((type) => (
                        <SelectItem key={type} value={type}>
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex justify-end gap-2 mt-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowAddOption(false);
                      setNewOptionName('');
                    }}
                  >
                    Cancel
                  </Button>
                  <Button onClick={handleAddOption}>Add Option</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Button
            variant="outline"
            className="w-full"
            onClick={() => setShowAddOption(true)}
          >
            <PlusCircle className="h-4 w-4 mr-1" />
            Add Variant Option
          </Button>
        )}
      </div>
    </div>
  );
}
