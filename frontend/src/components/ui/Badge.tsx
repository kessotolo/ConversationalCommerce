import * as React from 'react';

// Minimal cn utility
function cn(...inputs: (string | undefined | null | false)[]): string {
  return inputs.filter(Boolean).join(' ');
}

// Minimal cva utility for variants
function cva(
  base: string,
  config: {
    variants: { [key: string]: { [key: string]: string } };
    defaultVariants: { [key: string]: string };
  },
) {
  return (options: { [key: string]: string | undefined } = {}) => {
    // Safety check: get the first variant key (should be 'variant' in our case)
    const variantKey = Object.keys(config.variants)[0];
    if (!variantKey) return base;
    
    // Get the variant value from options or default
    const variant = (options[variantKey] !== undefined) ? options[variantKey] : config.defaultVariants[variantKey];
    if (variant === undefined) return base;
    
    // Get the class for the variant
    const variantClasses = config.variants[variantKey];
    const variantClass = variantClasses && variant ? variantClasses[variant] || '' : '';
    return cn(base, variantClass);
  };
}

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-primary text-primary-foreground hover:bg-primary/80',
        secondary:
          'border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80',
        destructive:
          'border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80',
        outline: 'text-foreground',
        success: 'border-transparent bg-green-100 text-green-800 hover:bg-green-200',
        warning: 'border-transparent bg-amber-100 text-amber-800 hover:bg-amber-200',
        info: 'border-transparent bg-blue-100 text-blue-800 hover:bg-blue-200',
        pending: 'border-transparent bg-yellow-100 text-yellow-800 hover:bg-yellow-200',
        processing: 'border-transparent bg-blue-100 text-blue-800 hover:bg-blue-200',
        shipped: 'border-transparent bg-purple-100 text-purple-800 hover:bg-purple-200',
        delivered: 'border-transparent bg-green-100 text-green-800 hover:bg-green-200',
        cancelled: 'border-transparent bg-red-100 text-red-800 hover:bg-red-200',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning' | 'info' | 
    'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant: variant || '' }), className)} {...props} />;
}

export { Badge, badgeVariants };
