import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Button } from '@/components/ui/Button';

// Add Jest type declarations
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeInTheDocument(): R;
      toHaveClass(className: string): R;
      toHaveBeenCalledTimes(n: number): R;
    }
    type Mock = {
      (): any;
      (...args: any[]): any;
    };
    function fn(): Mock;
  }

  function describe(name: string, fn: () => void): void;
  function it(name: string, fn: () => void): void;
  function expect<T>(actual: T): jest.Matchers<T>;
}

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
        screen.getByText('Click me').click();
        expect(handleClick).toHaveBeenCalledTimes(1);
    });
});