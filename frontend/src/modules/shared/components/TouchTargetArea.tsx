import React, { ReactNode } from 'react';
import { Box, BoxProps } from '@chakra-ui/react';
import mobileOptimizationService from '../../../services/MobileOptimizationService';

interface TouchTargetAreaProps extends BoxProps {
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
    if (!shouldEnhance) return {};
    
    // Add more touch padding for small elements
    if (minSize === 'small') {
      return { px: '4px', py: '4px' };
    }
    
    return {};
  };
  
  return (
    <Box
      display="inline-flex"
      alignItems="center"
      justifyContent="center"
      {...getMinSize()}
      {...getTouchPadding()}
      {...rest}
    >
      {children}
    </Box>
  );
};

export default TouchTargetArea;
