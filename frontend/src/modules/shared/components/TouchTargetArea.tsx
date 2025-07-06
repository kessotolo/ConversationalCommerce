import React, { ReactNode } from 'react';
import mobileOptimizationService from '../../../services/MobileOptimizationService';
import { cn } from '@/lib/utils';

interface TouchTargetAreaProps extends React.HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  minSize?: 'default' | 'small' | 'large' | 'none';
  enhanceForTouch?: boolean;
  preventScaling?: boolean;
}

/**
 * TouchTargetArea component
 *
 * Wraps child elements in a box with appropriate minimum size for touch targets
 * based on WCAG guidelines (44x44px minimum) and device characteristics.
 *
 * This improves mobile accessibility and touch interaction accuracy.
 *
 * @example
 * <TouchTargetArea>
 *   <Button>Click me</Button>
 * </TouchTargetArea>
 */
const TouchTargetArea: React.FC<TouchTargetAreaProps> = ({
  children,
  minSize = 'default',
  enhanceForTouch = true,
  preventScaling = false,
  className,
  style,
  ...rest
}) => {
  const deviceInfo = mobileOptimizationService.getDeviceInfo();
  const shouldEnhance = enhanceForTouch && deviceInfo.isTouchDevice && !preventScaling;

  // Get recommended minimum sizes based on device
  const getMinSize = () => {
    // If enhancement is disabled or explicitly set to none, return no minimum
    if (!shouldEnhance || minSize === 'none') return {};

    const { width, height } = mobileOptimizationService.getRecommendedTouchTargetSize();

    // Scale based on specified size variant
    let scaleFactor = 1;
    if (minSize === 'small') scaleFactor = 0.75;
    if (minSize === 'large') scaleFactor = 1.25;

    return {
      minWidth: `${width * scaleFactor / deviceInfo.pixelRatio}px`,
      minHeight: `${height * scaleFactor / deviceInfo.pixelRatio}px`,
    };
  };

  // Calculate additional padding for touch devices to improve hit area
  const getTouchPadding = () => {
    if (!shouldEnhance) return '';

    // Add more touch padding for small elements
    if (minSize === 'small') {
      return 'px-1 py-1';
    }

    return '';
  };

  const minSizeStyles = getMinSize();
  const touchPaddingClass = getTouchPadding();

  return (
    <div
      className={cn(
        "inline-flex items-center justify-center",
        touchPaddingClass,
        className
      )}
      style={{
        ...minSizeStyles,
        ...style,
      }}
      {...rest}
    >
      {children}
    </div>
  );
};

export default TouchTargetArea;
