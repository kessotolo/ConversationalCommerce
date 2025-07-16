import * as React from "react"
import { useEffect, useRef, useCallback, useState } from "react"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { X } from "lucide-react"

import { cn } from "@/lib/utils"

const Dialog = DialogPrimitive.Root

const DialogTrigger = React.forwardRef<
    React.ElementRef<typeof DialogPrimitive.Trigger>,
    React.ComponentPropsWithoutRef<typeof DialogPrimitive.Trigger>
>(({ className, ...props }, ref) => (
    <DialogPrimitive.Trigger
        ref={ref}
        className={cn(className)}
        aria-haspopup="dialog"
        {...props}
    />
))

DialogTrigger.displayName = DialogPrimitive.Trigger.displayName

const DialogPortal = DialogPrimitive.Portal

const DialogClose = DialogPrimitive.Close

const DialogOverlay = React.forwardRef<
    React.ElementRef<typeof DialogPrimitive.Overlay>,
    React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
    <DialogPrimitive.Overlay
        ref={ref}
        className={cn(
            "fixed inset-0 z-50 bg-background/80 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
            className
        )}
        {...props}
    />
))
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName

interface DialogContentProps extends React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> {
  /**
   * If true, will focus the first focusable element within the dialog on open
   */
  autoFocus?: boolean;
  
  /**
   * If true, will restore focus to the element that triggered the dialog when closed
   */
  restoreFocus?: boolean;
  
  /**
   * Custom description for the dialog (will override any DialogDescription component)
   */
  description?: string;
  
  /**
   * If true, will implement a focus trap that keeps focus within the dialog
   */
  trapFocus?: boolean;
}

const DialogContent = React.forwardRef<
    React.ElementRef<typeof DialogPrimitive.Content>,
    DialogContentProps
>(({ 
  className, 
  children, 
  autoFocus = true, 
  restoreFocus = true, 
  trapFocus = true,
  description,
  ...props 
}, ref) => {
    const contentRef = useRef<HTMLDivElement>(null);
    const triggerRef = useRef<HTMLElement | null>(null);
    const [titleId, setTitleId] = useState<string | undefined>();
    const [descriptionId, setDescriptionId] = useState<string | undefined>();
    
    // Find title and description elements to establish ARIA relationships
    useEffect(() => {
      if (contentRef.current) {
        const titleElement = contentRef.current.querySelector('[id^="dialog-title"]');
        const descriptionElement = contentRef.current.querySelector('[id^="dialog-description"]');
        
        if (titleElement) {
          setTitleId(titleElement.id);
        }
        
        if (descriptionElement) {
          setDescriptionId(descriptionElement.id);
        }
      }
    }, []);
    
    // Store the element that had focus before the dialog opened
    useEffect(() => {
      if (restoreFocus) {
        triggerRef.current = document.activeElement as HTMLElement;
      }
      
      // Focus the first focusable element when opened
      if (autoFocus && contentRef.current) {
        const focusableElements = contentRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href]:not([aria-disabled="true"]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"]):not([aria-disabled="true"])'
        );
        
        if (focusableElements.length > 0) {
          // Focus first element with delay to ensure animation completes
          setTimeout(() => {
            focusableElements[0]?.focus();
          }, 50);
        } else {
          // If no focusable elements, focus the dialog itself
          contentRef.current.focus();
        }
      }
      
      return () => {
        // Restore focus when dialog closes with a delay to ensure cleanup
        if (restoreFocus && triggerRef.current) {
          setTimeout(() => triggerRef.current?.focus(), 50);
        }
      };
    }, [autoFocus, restoreFocus]);
    
    // Implement focus trap
    const handleKeyDown = useCallback(
      (event: React.KeyboardEvent<HTMLDivElement>) => {
        if (!trapFocus || !contentRef.current) return;
        
        // Handle Escape key
        if (event.key === "Escape") {
          event.preventDefault();
          // Let Radix handle the dialog close
          return;
        }
        
        // Only handle Tab key for focus trapping
        if (event.key !== "Tab") return;
        
        const focusableElements = Array.from(
          contentRef.current.querySelectorAll<HTMLElement>(
            'button:not([disabled]), [href]:not([aria-disabled="true"]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"]):not([aria-disabled="true"])'
          )
        );
        
        if (focusableElements.length === 0) return;
        
        // Safe access with type narrowing
        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];
        
        // TypeScript checks to ensure elements are defined
        if (!firstElement || !lastElement) return;
        
        if (event.shiftKey) {
          // If shift + tab and on first element, cycle to last element
          if (document.activeElement === firstElement) {
            event.preventDefault();
            lastElement.focus();
          }
        } else {
          // If tab and on last element, cycle to first element
          if (document.activeElement === lastElement) {
            event.preventDefault();
            firstElement.focus();
          }
        }
      },
      [trapFocus]
    );
    
    return (
      <DialogPortal>
          <DialogOverlay />
          <DialogPrimitive.Content
              ref={(node) => {
                // Handle both the forwarded ref and our local ref
                if (typeof ref === 'function') ref(node);
                else if (ref) ref.current = node;
                // Use type assertion to avoid read-only property error
                if (node) {
                  (contentRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
                }
              }}
              className={cn(
                  "fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-lg outline-none",
                  className
              )}
              // ARIA attributes for accessibility
              aria-modal="true"
              role="dialog"
              aria-labelledby={titleId}
              aria-describedby={description ? "dialog-custom-description" : descriptionId}
              tabIndex={-1} // Make the dialog container focusable
              onKeyDown={handleKeyDown}
              {...props}
          >
              {description && (
                <div id="dialog-custom-description" className="sr-only">
                  {description}
                </div>
              )}
              {children}
              <DialogPrimitive.Close 
                  className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground"
                  aria-label="Close dialog"
              >
                  <X className="h-4 w-4" />
                  <span className="sr-only">Close</span>
              </DialogPrimitive.Close>
          </DialogPrimitive.Content>
      </DialogPortal>
    );
})
DialogContent.displayName = DialogPrimitive.Content.displayName

const DialogHeader = ({
    className,
    ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
    <div
        className={cn(
            "flex flex-col space-y-1.5 text-center sm:text-left",
            className
        )}
        // Add semantic role for better screen reader navigation
        role="group"
        aria-labelledby="dialog-title"
        {...props}
    />
)
DialogHeader.displayName = "DialogHeader"

const DialogFooter = ({
    className,
    ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
    <div
        className={cn(
            "flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2",
            className
        )}
        // Add semantic role for better screen reader navigation
        role="group"
        aria-label="Dialog actions"
        {...props}
    />
)
DialogFooter.displayName = "DialogFooter"

const DialogTitle = React.forwardRef<
    React.ElementRef<typeof DialogPrimitive.Title>,
    React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, id, ...props }, ref) => {
    // Generate unique ID for ARIA labeling
    const titleId = id || `dialog-title-${React.useId()}`;
    
    return (
        <DialogPrimitive.Title
            ref={ref}
            className={cn(
                "text-lg font-semibold leading-none tracking-tight",
                className
            )}
            // Ensure dialog title is announced properly by screen readers
            id={titleId}
            {...props}
        />
    );
})
DialogTitle.displayName = DialogPrimitive.Title.displayName

const DialogDescription = React.forwardRef<
    React.ElementRef<typeof DialogPrimitive.Description>,
    React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, id, ...props }, ref) => {
    // Generate unique ID for ARIA descriptions
    const descriptionId = id || `dialog-description-${React.useId()}`;
    
    return (
        <DialogPrimitive.Description
            ref={ref}
            className={cn("text-sm text-muted-foreground", className)}
            id={descriptionId}
            {...props}
        />
    );
})
DialogDescription.displayName = DialogPrimitive.Description.displayName

export {
    Dialog,
    DialogPortal,
    DialogOverlay,
    DialogClose,
    DialogTrigger,
    DialogContent,
    DialogHeader,
    DialogFooter,
    DialogTitle,
    DialogDescription,
}