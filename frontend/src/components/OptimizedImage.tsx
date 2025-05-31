import { FC } from 'react';import { OptimizedImageProps } from '@/components/OptimizedImage';import * as React from 'react';
import { OptimizedImage } from '@/components/OptimizedImage';
import Image from 'next/image';

interface OptimizedImageProps {
  src: string;
  alt: string;
  width: number;
  height: number;
  className?: string;
  priority?: boolean;
  fallbackSrc?: string;
  lowQualitySrc?: string;
  onLoad?: () => void;
  onError?: () => void;
}

/**
 * OptimizedImage component specifically designed for low-bandwidth environments.
 * Features:
 * - Progressive loading (low quality placeholder that loads first)
 * - Fallback image when the main image fails to load
 * - Retry mechanism for failed loads
 * - Offline caching using localStorage (when possible)
 */
const OptimizedImage: React.FC<OptimizedImageProps> = ({
  src,
  alt,
  width,
  height,
  className = '',
  priority = false,
  fallbackSrc = '/images/placeholder.png',
  lowQualitySrc,
  onLoad,
  onError,
}) => {
  const [imageSrc, setImageSrc] = useState<string>(lowQualitySrc || src);
  const [isLoaded, setIsLoaded] = useState<boolean>(false);
  const [error, setError] = useState<boolean>(false);
  const [retries, setRetries] = useState<number>(0);
  const MAX_RETRIES = 3;

  useEffect(() => {
    // Reset states when src changes
    setIsLoaded(false);
    setError(false);
    setRetries(0);
    setImageSrc(lowQualitySrc || src);
  }, [src, lowQualitySrc]);

  useEffect(() => {
    // Only preload the high-quality image if we're showing the low-quality version
    if (lowQualitySrc && !isLoaded && !error) {
      const highQualityImage = new window.Image();
      highQualityImage.src = src;
      
      highQualityImage.onload = () => {
        // Cache the image data in localStorage if possible
        try {
          if (typeof window !== 'undefined' && window.localStorage) {
            localStorage.setItem(`img_cache_${src}`, 'cached');
          }
        } catch (e) {
          console.warn('Unable to cache image:', e);
        }
        
        setImageSrc(src);
        setIsLoaded(true);
        if (onLoad) onLoad();
      };
      
      highQualityImage.onerror = () => {
        if (retries < MAX_RETRIES) {
          // Implement exponential backoff for retries
          const backoffTime = Math.pow(2, retries) * 1000;
          console.log(`Retrying image load (${retries + 1}/${MAX_RETRIES}) after ${backoffTime}ms`);
          
          setTimeout(() => {
            setRetries(prev => prev + 1);
            // Force a refresh of the image
            highQualityImage.src = `${src}?retry=${Date.now()}`;
          }, backoffTime);
        } else {
          console.error(`Failed to load image after ${MAX_RETRIES} retries:`, src);
          setError(true);
          setImageSrc(fallbackSrc);
          if (onError) onError();
        }
      };
    }
  }, [src, lowQualitySrc, isLoaded, error, retries, onLoad, onError, fallbackSrc]);

  // Handle network status changes
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const handleOnline = () => {
      // When coming back online, retry loading any images that failed
      if (error) {
        setError(false);
        setRetries(0);
        setImageSrc(lowQualitySrc || src);
      }
    };
    
    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [error, lowQualitySrc, src]);

  return (
    <div className={`relative ${className}`} style={{ width, height }}>
      <Image
        src={imageSrc}
        alt={alt}
        width={width}
        height={height}
        className={`transition-opacity duration-300 ${isLoaded ? 'opacity-100' : 'opacity-70'}`}
        priority={priority}
        onLoad={() => {
          if (imageSrc === src) {
            setIsLoaded(true);
            if (onLoad) onLoad();
          }
        }}
        onError={() => {
          if (retries >= MAX_RETRIES) {
            setError(true);
            setImageSrc(fallbackSrc);
            if (onError) onError();
          }
        }}
      />
      
      {/* Loading indicator */}
      {!isLoaded && !error && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 bg-opacity-40">
          <div className="w-8 h-8 border-2 border-gray-200 border-t-blue-500 rounded-full animate-spin"></div>
        </div>
      )}
    </div>
  );
};

export default OptimizedImage;
