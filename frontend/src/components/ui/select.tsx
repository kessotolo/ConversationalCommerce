import { ChevronDown } from 'lucide-react';
import * as React from 'react';
import { useRef, useEffect, useState, createContext, useContext, useId } from 'react';

import { cn } from '@/lib/utils';

export interface SelectProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Current value of the select
   */
  value?: string;
  
  /**
   * Callback fired when the value changes
   */
  onValueChange?: (value: string) => void;
  
  /**
   * Default value of the select
   */
  defaultValue?: string;
  
  /**
   * Select components (Trigger, Value, Content, Items)
   */
  children: React.ReactNode;
  
  /**
   * Whether the select is disabled
   */
  disabled?: boolean;
  
  /**
   * Label for the select (for accessibility)
   */
  label?: string;
  
  /**
   * Error message when validation fails
   */
  error?: string;
  
  /**
   * ID to use for the select element
   */
  id?: string;
}

interface SelectContextType {
  isOpen: boolean;
  setIsOpen: React.Dispatch<React.SetStateAction<boolean>>;
  selectedValue: string;
  setSelectedValue: React.Dispatch<React.SetStateAction<string>>;
  onValueChange?: (value: string) => void;
  disabled?: boolean;
  selectId: string;
  labelId: string;
  listboxId: string;
  descriptionId?: string;
  errorId?: string;
  activeIndex: number;
  setActiveIndex: React.Dispatch<React.SetStateAction<number>>;
  itemsRef: React.MutableRefObject<HTMLButtonElement[]>;
}

const SelectContext = createContext<SelectContextType | undefined>(undefined);

function useSelectContext() {
  const context = useContext(SelectContext);
  if (!context) throw new Error('Select subcomponent must be used within a <Select>');
  return context;
}

export function Select({
  className,
  value,
  onValueChange,
  defaultValue,
  disabled,
  label,
  error,
  id: propId,
  children,
  ...props
}: SelectProps) {
  // State management
  const [isOpen, setIsOpen] = useState(false);
  const [selectedValue, setSelectedValue] = useState(value || defaultValue || '');
  const [activeIndex, setActiveIndex] = useState(-1);
  
  // Refs
  const ref = useRef<HTMLDivElement>(null);
  const itemsRef = useRef<HTMLButtonElement[]>([]);
  
  // Generate IDs for accessibility
  const generatedId = useId();
  const selectId = propId || `select-${generatedId}`;
  const labelId = `${selectId}-label`;
  const listboxId = `${selectId}-listbox`;
  const descriptionId = `${selectId}-description`;
  const errorId = error ? `${selectId}-error` : undefined;
  
  // Update selected value when prop value changes
  useEffect(() => {
    if (value !== undefined) {
      setSelectedValue(value);
    }
  }, [value]);

  // Click outside handler
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);
  
  // Reset active index when dropdown closes
  useEffect(() => {
    if (!isOpen) {
      setActiveIndex(-1);
    }
  }, [isOpen]);

  return (
    <SelectContext.Provider
      value={{
        isOpen,
        setIsOpen,
        selectedValue,
        setSelectedValue,
        onValueChange,
        disabled,
        selectId,
        labelId,
        listboxId,
        descriptionId,
        errorId,
        activeIndex,
        setActiveIndex,
        itemsRef
      }}
    >
      <div 
        className={cn(
          'relative', 
          error && 'has-error',
          disabled && 'opacity-50', 
          className
        )} 
        ref={ref} 
        {...props}
      >
        {label && (
          <label 
            id={labelId} 
            htmlFor={selectId} 
            className={cn(
              "block text-sm font-medium mb-1",
              error && "text-red-500"
            )}
          >
            {label}
          </label>
        )}
        
        {children}
        
        {error && (
          <div id={errorId} className="mt-1 text-sm text-red-500" role="alert">
            {error}
          </div>
        )}
      </div>
    </SelectContext.Provider>
  );
}

export interface SelectTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /**
   * Content to display in the trigger
   */
  children: React.ReactNode;
}

export function SelectTrigger({ className, children, ...props }: SelectTriggerProps) {
  const { 
    isOpen, 
    setIsOpen, 
    disabled, 
    selectId,
    labelId,
    listboxId,
    errorId,
    selectedValue 
  } = useSelectContext();
  
  // Handle keyboard interactions
  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (disabled) return;
    
    switch (event.key) {
      case 'Enter':
      case ' ':
      case 'ArrowDown':
        event.preventDefault();
        setIsOpen(true);
        break;
      case 'Escape':
        event.preventDefault();
        setIsOpen(false);
        break;
    }
  };
  
  return (
    <button
      id={selectId}
      type="button"
      className={cn(
        'flex h-10 w-full items-center justify-between rounded-md border bg-white px-3 py-2 text-sm ring-offset-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
        isOpen && 'border-gray-400',
        errorId ? 'border-red-500' : 'border-gray-300',
        className,
      )}
      onClick={() => !disabled && setIsOpen(!isOpen)}
      onKeyDown={handleKeyDown}
      aria-haspopup="listbox"
      aria-expanded={isOpen}
      aria-labelledby={labelId}
      aria-controls={isOpen ? listboxId : undefined}
      aria-invalid={errorId ? true : undefined}
      aria-describedby={errorId}
      aria-disabled={disabled}
      disabled={disabled}
      data-state={isOpen ? "open" : "closed"}
      {...props}
    >
      {children}
      <ChevronDown 
        className="h-4 w-4 opacity-50" 
        aria-hidden="true"
      />
    </button>
  );
}

export interface SelectValueProps {
  /**
   * Placeholder text when no value is selected
   */
  placeholder?: string;
}

export function SelectValue({ placeholder }: SelectValueProps) {
  const { selectedValue } = useSelectContext();
  return (
    <span className="flex-1 truncate">
      {selectedValue || placeholder || 'Select option'}
    </span>
  );
}

export interface SelectContentProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Select items to display in the dropdown
   */
  children: React.ReactNode;
}

export function SelectContent({ className, children, ...props }: SelectContentProps) {
  const { 
    isOpen, 
    setIsOpen, 
    listboxId,
    activeIndex,
    setActiveIndex,
    itemsRef
  } = useSelectContext();
  
  // Handle keyboard navigation
  const handleKeyDown = (event: React.KeyboardEvent) => {
    const itemCount = itemsRef.current.length;
    if (itemCount === 0) return;
    
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        setActiveIndex((prev) => (prev < itemCount - 1 ? prev + 1 : 0));
        break;
        
      case 'ArrowUp':
        event.preventDefault();
        setActiveIndex((prev) => (prev > 0 ? prev - 1 : itemCount - 1));
        break;
        
      case 'Home':
        event.preventDefault();
        setActiveIndex(0);
        break;
        
      case 'End':
        event.preventDefault();
        setActiveIndex(itemCount - 1);
        break;
        
      case 'Escape':
        event.preventDefault();
        setIsOpen(false);
        break;
        
      case 'Enter':
      case ' ':
        event.preventDefault();
        if (activeIndex >= 0 && activeIndex < itemCount) {
          itemsRef.current[activeIndex]?.click();
        }
        break;
    }
  };
  
  // Focus active item when activeIndex changes
  useEffect(() => {
    if (activeIndex >= 0 && activeIndex < itemsRef.current.length) {
      itemsRef.current[activeIndex]?.focus();
    }
  }, [activeIndex]);

  if (!isOpen) return null;

  return (
    <div
      id={listboxId}
      role="listbox"
      tabIndex={-1}
      className={cn(
        'absolute top-full z-50 mt-1 max-h-60 min-w-[8rem] overflow-auto rounded-md border border-gray-200 bg-white p-1 text-gray-950 shadow-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2',
        className,
      )}
      onKeyDown={handleKeyDown}
      aria-orientation="vertical"
      {...props}
    >
      <div className="flex flex-col gap-1 py-1">{children}</div>
    </div>
  );
}

export interface SelectItemProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /**
   * Value of the item
   */
  value: string;
  
  /**
   * Content to display in the item
   */
  children: React.ReactNode;
  
  /**
   * Whether the item is disabled
   */
  disabled?: boolean;
}

export function SelectItem({ className, value, children, disabled, ...props }: SelectItemProps) {
  const { 
    selectedValue, 
    setSelectedValue, 
    onValueChange, 
    setIsOpen,
    activeIndex,
    itemsRef 
  } = useSelectContext();

  const isSelected = selectedValue === value;
  const itemRef = useRef<HTMLButtonElement>(null);
  
  // Register this item with the parent for keyboard navigation
  useEffect(() => {
    if (itemRef.current) {
      const index = itemsRef.current.findIndex(item => item === itemRef.current);
      if (index === -1) {
        itemsRef.current.push(itemRef.current);
      }
      
      return () => {
        itemsRef.current = itemsRef.current.filter(item => item !== itemRef.current);
      };
    }
    
    // Return empty cleanup function when no ref is available
    return () => {};
  }, [itemsRef]);

  const handleSelect = () => {
    if (disabled) return;
    
    setSelectedValue(value);
    if (onValueChange) {
      onValueChange(value);
    }
    setIsOpen(false);
  };

  return (
    <button
      ref={itemRef}
      type="button"
      role="option"
      aria-selected={isSelected}
      data-highlighted={activeIndex === itemsRef.current.findIndex(item => item === itemRef.current)}
      data-disabled={disabled}
      disabled={disabled}
      className={cn(
        'relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 px-2 text-sm outline-none focus:bg-gray-100 data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
        isSelected && 'bg-gray-100 font-medium',
        className,
      )}
      onClick={handleSelect}
      {...props}
    >
      <span className="flex-1 truncate">{children}</span>
      {isSelected && (
        <span 
          className="absolute right-2 flex h-3.5 w-3.5 items-center justify-center"
          aria-hidden="true"
        >
          <svg
            width="15"
            height="15"
            viewBox="0 0 15 15"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M11.4669 3.72684C11.7558 3.91574 11.8369 4.30308 11.648 4.59198L7.39799 11.092C7.29783 11.2452 7.13556 11.3467 6.95402 11.3699C6.77247 11.3931 6.58989 11.3355 6.45446 11.2124L3.70446 8.71241C3.44905 8.48022 3.43023 8.08494 3.66242 7.82953C3.89461 7.57412 4.28989 7.55529 4.5453 7.78749L6.75292 9.79441L10.6018 3.90792C10.7907 3.61902 11.178 3.53795 11.4669 3.72684Z"
              fill="currentColor"
              fillRule="evenodd"
              clipRule="evenodd"
            />
          </svg>
        </span>
      )}
    </button>
  );
}
