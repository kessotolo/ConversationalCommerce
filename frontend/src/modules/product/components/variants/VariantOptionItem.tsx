'use client';

import { useState } from 'react';
import { PlusCircle, Edit2, Trash2 } from 'lucide-react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/Label';
import { useToast } from '@/components/ui/use-toast';
import type { 
  VariantOption, 
  VariantOptionType, 
  VariantOptionValue 
} from '../../models/product';
import { SortableOptionValueItem } from './SortableOptionValueItem';

/**
 * Props for the VariantOptionItem component
 */
interface VariantOptionItemProps {
  /** The variant option data */
  option: VariantOption;
  /** Callback when the option is updated */
  onUpdate: (updatedOption: VariantOption) => void;
  /** Callback when deletion is requested */
  onDelete: (id: string) => void;
}

/**
 * Component for managing a variant option with its values
 * Handles editing the option name/type and managing its values
 */
export function VariantOptionItem({ 
  option, 
  onUpdate, 
  onDelete 
}: VariantOptionItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [optionName, setOptionName] = useState(option.name);
  const [optionType, setOptionType] = useState(option.type);
  const [showAddValue, setShowAddValue] = useState(false);
  const [newValueName, setNewValueName] = useState('');
  const [editingValue, setEditingValue] = useState<VariantOptionValue | null>(null);
  const { toast } = useToast();

  // Set up DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  /**
   * Handle drag end for reordering option values
   */
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (over && active.id !== over.id) {
      const oldIndex = option.values.findIndex((v) => v.id === active.id);
      const newIndex = option.values.findIndex((v) => v.id === over.id);
      
      if (oldIndex !== -1 && newIndex !== -1) {
        const updatedValues = arrayMove(option.values, oldIndex, newIndex).map(
          (value, index) => ({ ...value, display_order: index })
        );
        
        onUpdate({
          ...option,
          values: updatedValues,
        });
      }
    }
  };

  /**
   * Save option edits
   */
  const handleSaveOption = () => {
    if (!optionName.trim()) {
      toast({
        title: "Error",
        description: "Option name cannot be empty",
        variant: "destructive",
      });
      return;
    }
    
    onUpdate({
      ...option,
      name: optionName.trim(),
      type: optionType,
    });
    
    setIsEditing(false);
  };

  /**
   * Add a new option value
   */
  const handleAddValue = () => {
    if (!newValueName.trim()) {
      toast({
        title: "Error",
        description: "Value name cannot be empty",
        variant: "destructive",
      });
      return;
    }
    
    const newValue: VariantOptionValue = {
      id: `temp-${Date.now()}`, // This would be replaced with a server-generated ID
      name: newValueName.trim(),
      display_order: option.values.length,
    };
    
    onUpdate({
      ...option,
      values: [...option.values, newValue],
    });
    
    setNewValueName('');
    setShowAddValue(false);
  };

  /**
   * Save edited option value
   */
  const handleSaveValue = () => {
    if (!editingValue || !editingValue.name.trim()) {
      toast({
        title: "Error",
        description: "Value name cannot be empty",
        variant: "destructive",
      });
      return;
    }
    
    const updatedValues = option.values.map((v) =>
      v.id === editingValue.id ? editingValue : v
    );
    
    onUpdate({
      ...option,
      values: updatedValues,
    });
    
    setEditingValue(null);
  };

  /**
   * Delete an option value
   */
  const handleDeleteValue = (valueId: string) => {
    const updatedValues = option.values
      .filter((v) => v.id !== valueId)
      .map((value, index) => ({ ...value, display_order: index }));
    
    onUpdate({
      ...option,
      values: updatedValues,
    });
  };

  return (
    <Card className="mb-4">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          {isEditing ? (
            <div className="flex gap-2 items-center w-full">
              <div className="flex-1">
                <Input
                  value={optionName}
                  onChange={(e) => setOptionName(e.target.value)}
                  placeholder="Option Name"
                />
              </div>
              <div className="w-40">
                <Select value={optionType} onValueChange={(value) => setOptionType(value as VariantOptionType)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Type" />
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
              <Button variant="default" onClick={handleSaveOption} size="sm">
                Save
              </Button>
              <Button variant="outline" onClick={() => setIsEditing(false)} size="sm">
                Cancel
              </Button>
            </div>
          ) : (
            <>
              <CardTitle className="text-lg">
                {option.name} <span className="text-gray-500 text-sm">({option.type})</span>
              </CardTitle>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={() => setIsEditing(true)}>
                  <Edit2 className="h-4 w-4 mr-1" />
                  Edit
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-red-500 hover:text-red-700"
                  onClick={() => onDelete(option.id)}
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Delete
                </Button>
              </div>
            </>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="mb-4">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={option.values.map((v) => v.id)}
              strategy={verticalListSortingStrategy}
            >
              {option.values.map((value) => (
                <SortableOptionValueItem
                  key={value.id}
                  value={value}
                  onEdit={setEditingValue}
                  onDelete={handleDeleteValue}
                  optionId={option.id}
                />
              ))}
            </SortableContext>
          </DndContext>
          
          {editingValue && (
            <div className="border p-3 rounded-md mb-3 bg-gray-50">
              <div className="flex flex-col gap-2">
                <Label htmlFor="valueName">Value Name</Label>
                <div className="flex gap-2">
                  <Input
                    id="valueName"
                    value={editingValue.name}
                    onChange={(e) =>
                      setEditingValue({ ...editingValue, name: e.target.value })
                    }
                  />
                  <Button variant="default" onClick={handleSaveValue} size="sm">
                    Save
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setEditingValue(null)}
                    size="sm"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </div>
          )}

          {showAddValue ? (
            <div className="border p-3 rounded-md bg-gray-50">
              <div className="flex flex-col gap-2">
                <Label htmlFor="newValue">New Value</Label>
                <div className="flex gap-2">
                  <Input
                    id="newValue"
                    value={newValueName}
                    onChange={(e) => setNewValueName(e.target.value)}
                    placeholder="Value Name"
                  />
                  <Button variant="default" onClick={handleAddValue} size="sm">
                    Add
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowAddValue(false);
                      setNewValueName('');
                    }}
                    size="sm"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => setShowAddValue(true)}
            >
              <PlusCircle className="h-4 w-4 mr-1" />
              Add Value
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
