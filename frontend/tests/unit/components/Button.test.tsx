import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Button, buttonVariants } from '@/components/ui/Button';
import { cn } from '@/lib/utils';

describe('Button Component', () => {
  it('renders button with correct text', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    render(<Button className="custom-class">Click me</Button>);
    expect(screen.getByText('Click me')).toHaveClass('custom-class');
  });

  it('handles click events', () => {
    const handleClick = jest.fn();
    render(<Button onClick={handleClick}>Click me</Button>);
    const button = screen.getByText('Click me');
    button.click();
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  describe('variants', () => {
    it('applies default variant when no variant is specified', () => {
      render(<Button>Default Button</Button>);
      const button = screen.getByText('Default Button');
      
      // Check for default variant classes
      expect(button).toHaveClass('bg-primary');
      expect(button).toHaveClass('text-primary-foreground');
    });

    it('applies destructive variant correctly', () => {
      render(<Button variant="destructive">Destructive Button</Button>);
      const button = screen.getByText('Destructive Button');
      
      expect(button).toHaveClass('bg-destructive');
      expect(button).toHaveClass('text-destructive-foreground');
    });

    it('applies outline variant correctly', () => {
      render(<Button variant="outline">Outline Button</Button>);
      const button = screen.getByText('Outline Button');
      
      expect(button).toHaveClass('border');
      expect(button).toHaveClass('border-input');
    });

    it('applies secondary variant correctly', () => {
      render(<Button variant="secondary">Secondary Button</Button>);
      const button = screen.getByText('Secondary Button');
      
      expect(button).toHaveClass('bg-secondary');
      expect(button).toHaveClass('text-secondary-foreground');
    });

    it('applies ghost variant correctly', () => {
      render(<Button variant="ghost">Ghost Button</Button>);
      const button = screen.getByText('Ghost Button');
      
      expect(button).toHaveClass('hover:bg-accent');
      expect(button).toHaveClass('hover:text-accent-foreground');
    });

    it('applies link variant correctly', () => {
      render(<Button variant="link">Link Button</Button>);
      const button = screen.getByText('Link Button');
      
      expect(button).toHaveClass('underline-offset-4');
      expect(button).toHaveClass('hover:underline');
      expect(button).toHaveClass('text-primary');
    });
  });

  describe('sizes', () => {
    it('applies default size when no size is specified', () => {
      render(<Button>Default Size</Button>);
      const button = screen.getByText('Default Size');
      
      expect(button).toHaveClass('h-10');
      expect(button).toHaveClass('py-2');
      expect(button).toHaveClass('px-4');
    });

    it('applies sm size correctly', () => {
      render(<Button size="sm">Small Button</Button>);
      const button = screen.getByText('Small Button');
      
      expect(button).toHaveClass('h-9');
      expect(button).toHaveClass('px-3');
      expect(button).toHaveClass('rounded-md');
    });

    it('applies lg size correctly', () => {
      render(<Button size="lg">Large Button</Button>);
      const button = screen.getByText('Large Button');
      
      expect(button).toHaveClass('h-11');
      expect(button).toHaveClass('px-8');
      expect(button).toHaveClass('rounded-md');
    });

    it('applies icon size correctly', () => {
      render(<Button size="icon">X</Button>);
      const button = screen.getByText('X');
      
      expect(button).toHaveClass('h-10');
      expect(button).toHaveClass('w-10');
    });
  });

  it('forwards ref correctly', () => {
    const ref = React.createRef<HTMLButtonElement>();
    render(<Button ref={ref}>Ref Button</Button>);
    
    expect(ref.current).not.toBeNull();
    expect(ref.current?.textContent).toBe('Ref Button');
  });

  it('should be disabled when disabled prop is provided', () => {
    render(<Button disabled>Disabled Button</Button>);
    const button = screen.getByText('Disabled Button');
    
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('disabled');
  });

  // Note: We can't effectively test asChild without a real implementation
  // as it would require a Slot component from Radix UI
});
