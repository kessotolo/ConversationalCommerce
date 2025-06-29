'use client';

import { useState } from 'react';
import { PlusCircle, X, Move, Edit2, Trash2 } from 'lucide-react';
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
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/Select';
import { Label } from '@/components/ui/Label';
import { useToast } from '@/components/ui/use-toast';
import { 
  VariantOption, 
  VariantOptionType, 
  VariantOptionValue 
} from '../models/product';

/**
 * Props for the VariantOptionValueItem component
 */
interface VariantOptionValueItemProps {
  value: VariantOptionValue;
  onEdit: (value: VariantOptionValue) => void;
  onDelete: (id: string) => void;
  optionId: string;
}

/**
 * Component for a sortable variant option value item
 */
function SortableOptionValueItem({ value, onEdit, onDelete, optionId }: VariantOptionValueItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id: value.id,
    data: {
      optionId,
    },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-2 p-2 border rounded-md mb-2 bg-white"
    >
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab p-1 hover:bg-gray-100 rounded-md"
        type="button"
      >
        <Move className="h-4 w-4 text-gray-500" />
      </button>
      <div className="flex-grow truncate">{value.name}</div>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onEdit(value)}
        className="p-1 h-auto"
      >
        <Edit2 className="h-4 w-4" />
        <span className="sr-only">Edit</span>
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onDelete(value.id)}
        className="p-1 h-auto text-red-500 hover:text-red-700"
      >
        <Trash2 className="h-4 w-4" />
        <span className="sr-only">Delete</span>
      </Button>
    </div>
  );
}

/**
 * Props for the VariantOptionItem component
 */
interface VariantOptionItemProps {
  option: VariantOption;
  onUpdate: (updatedOption: VariantOption) => void;
  onDelete: (id: string) => void;
}

/**
 * Component for a variant option with its values
 */
function VariantOptionItem({ option, onUpdate, onDelete }: VariantOptionItemProps) {
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
                <Select value={optionType} onValueChange={setOptionType}>
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

/**
 * Props for the VariantManager component
 */
interface VariantManagerProps {
  initialOptions?: VariantOption[];
  onChange: (options: VariantOption[]) => void;
}

/**
 * Main component for managing product variants and options
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
