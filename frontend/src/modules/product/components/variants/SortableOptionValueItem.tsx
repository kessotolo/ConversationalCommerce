'use client';

import { Move, Edit2, Trash2 } from 'lucide-react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

import { Button } from '@/components/ui/button';
import type { VariantOptionValue } from '../../models/product';

/**
 * Props for the SortableOptionValueItem component
 */
interface SortableOptionValueItemProps {
  /** The variant option value data */
  value: VariantOptionValue;
  /** Callback when edit is requested */
  onEdit: (value: VariantOptionValue) => void;
  /** Callback when delete is requested */
  onDelete: (id: string) => void;
  /** ID of the parent option */
  optionId: string;
}

/**
 * Component for a sortable variant option value item
 * Represents a single value within a variant option that can be
 * reordered via drag and drop
 */
export function SortableOptionValueItem({ 
  value, 
  onEdit, 
  onDelete, 
  optionId 
}: SortableOptionValueItemProps) {
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
