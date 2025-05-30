import React from 'react';
import { Select } from '@mui/material';import * as React from 'react';
import { cn } from "@/lib/utils";
import { ChevronDown } from "lucide-react";

export interface SelectProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: string;
  onValueChange?: (value: string) => void;
  defaultValue?: string;
  children: React.ReactNode;
}

export function Select({
  className,
  value,
  onValueChange,
  defaultValue,
  children,
  ...props
}: SelectProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [selectedValue, setSelectedValue] = React.useState(value || defaultValue || "");
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (value !== undefined) {
      setSelectedValue(value);
    }
  }, [value]);

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <div 
      className={cn("relative", className)} 
      ref={ref}
      {...props}
    >
      {children}
    </div>
  );
}

export interface SelectTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
}

export function SelectTrigger({
  className,
  children,
  ...props
}: SelectTriggerProps) {
  const context = React.useContext(React.createContext<{
    isOpen: boolean;
    setIsOpen: React.Dispatch<React.SetStateAction<boolean>>;
  }>({
    isOpen: false,
    setIsOpen: () => {},
  }));

  return (
    <button
      type="button"
      className={cn(
        "flex h-10 w-full items-center justify-between rounded-md border border-gray-300 bg-white px-3 py-2 text-sm ring-offset-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      onClick={() => context.setIsOpen(!context.isOpen)}
      {...props}
    >
      {children}
      <ChevronDown className="h-4 w-4 opacity-50" />
    </button>
  );
}

export interface SelectValueProps {
  placeholder?: string;
}

export function SelectValue({ placeholder }: SelectValueProps) {
  const context = React.useContext(React.createContext<{
    selectedValue: string;
  }>({
    selectedValue: "",
  }));

  return (
    <span className="flex-1 truncate">
      {context.selectedValue || placeholder || "Select option"}
    </span>
  );
}

export interface SelectContentProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export function SelectContent({
  className,
  children,
  ...props
}: SelectContentProps) {
  const context = React.useContext(React.createContext<{
    isOpen: boolean;
  }>({
    isOpen: false,
  }));

  if (!context.isOpen) return null;

  return (
    <div
      className={cn(
        "absolute top-full z-50 mt-1 max-h-60 min-w-[8rem] overflow-auto rounded-md border border-gray-200 bg-white p-1 text-gray-950 shadow-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
        className
      )}
      {...props}
    >
      <div className="flex flex-col gap-1 py-1">{children}</div>
    </div>
  );
}

export interface SelectItemProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  value: string;
  children: React.ReactNode;
}

export function SelectItem({
  className,
  value,
  children,
  ...props
}: SelectItemProps) {
  const context = React.useContext(React.createContext<{
    selectedValue: string;
    setSelectedValue: React.Dispatch<React.SetStateAction<string>>;
    onValueChange?: (value: string) => void;
    setIsOpen: React.Dispatch<React.SetStateAction<boolean>>;
  }>({
    selectedValue: "",
    setSelectedValue: () => {},
    onValueChange: undefined,
    setIsOpen: () => {},
  }));

  const isSelected = context.selectedValue === value;

  const handleSelect = () => {
    context.setSelectedValue(value);
    if (context.onValueChange) {
      context.onValueChange(value);
    }
    context.setIsOpen(false);
  };

  return (
    <button
      type="button"
      className={cn(
        "relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 px-2 text-sm outline-none focus:bg-gray-100 data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
        isSelected && "bg-gray-100 font-medium",
        className
      )}
      onClick={handleSelect}
      {...props}
    >
      <span className="flex-1 truncate">{children}</span>
      {isSelected && (
        <span className="absolute right-2 flex h-3.5 w-3.5 items-center justify-center">
          <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M11.4669 3.72684C11.7558 3.91574 11.8369 4.30308 11.648 4.59198L7.39799 11.092C7.29783 11.2452 7.13556 11.3467 6.95402 11.3699C6.77247 11.3931 6.58989 11.3355 6.45446 11.2124L3.70446 8.71241C3.44905 8.48022 3.43023 8.08494 3.66242 7.82953C3.89461 7.57412 4.28989 7.55529 4.5453 7.78749L6.75292 9.79441L10.6018 3.90792C10.7907 3.61902 11.178 3.53795 11.4669 3.72684Z" fill="currentColor" fillRule="evenodd" clipRule="evenodd"></path>
          </svg>
        </span>
      )}
    </button>
  );
}
