import { ChevronRight, Copy, Trash2, X } from 'lucide-react';
import Link from 'next/link';
import { useState, useRef } from 'react';

import { formatCurrency } from '@/lib/utils';

interface Product {
  id: string;
  name: string;
  price: number;
  image: string;
  description: string;
  inStock: boolean;
  category: string;
}

interface ProductCardProps {
  product: Product;
  onDelete: (id: string) => void;
  onDuplicate: (id: string) => void;
}

export function ProductCard({ product, onDelete, onDuplicate }: ProductCardProps) {
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const startX = useRef(0);
  const currentX = useRef(0);

  // Swipe action handlers for mobile
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches && e.touches.length > 0) {
      startX.current = e.touches[0]?.clientX || 0;
      currentX.current = startX.current;
      setIsSwiping(true);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isSwiping || !e.touches || e.touches.length === 0) return;

    currentX.current = e.touches[0]?.clientX || 0;
    const diff = currentX.current - startX.current;

    // Limit swipe to left direction and max 200px
    if (diff < 0) {
      setSwipeOffset(Math.max(diff, -200));
    }
  };

  const handleTouchEnd = () => {
    setIsSwiping(false);

    // If swiped more than 100px, keep open, otherwise close
    if (swipeOffset < -100) {
      setSwipeOffset(-200);
    } else {
      setSwipeOffset(0);
    }
  };

  const resetSwipe = () => {
    setSwipeOffset(0);
  };

  return (
    <div className="relative overflow-hidden rounded-lg bg-white shadow mb-4">
      {/* Main card content */}
      <div
        className="transition-transform duration-300 ease-out"
        style={{ transform: `translateX(${swipeOffset}px)` }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <Link href={`/dashboard/products/${product.id}`}>
          <div className="flex items-center p-4">
            <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-md">
              <img
                src={product.image ?? ''}
                alt={product.name ?? ''}
                className="h-full w-full object-cover object-center"
              />
            </div>
            <div className="ml-4 flex-1">
              <h3 className="text-base font-medium text-gray-900">{product.name}</h3>
              <p className="text-sm text-gray-500 line-clamp-1">{product.description}</p>
              <div className="flex items-center justify-between mt-1">
                <p className="text-sm font-medium text-gray-900">{formatCurrency(product.price)}</p>
                <span
                  className={`px-2 py-1 text-xs rounded-full ${product.inStock ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}
                >
                  {product.inStock ? 'In Stock' : 'Out of Stock'}
                </span>
              </div>
            </div>
            <ChevronRight className="h-5 w-5 text-gray-400" />
          </div>
        </Link>
      </div>

      {/* Swipe actions */}
      <div className="absolute inset-y-0 right-0 flex">
        <button
          onClick={() => onDuplicate(product.id)}
          className="w-16 bg-blue-500 text-white flex flex-col items-center justify-center"
        >
          <Copy className="h-5 w-5" />
          <span className="text-xs mt-1">Duplicate</span>
        </button>
        <button
          onClick={() => onDelete(product.id)}
          className="w-16 bg-red-500 text-white flex flex-col items-center justify-center"
        >
          <Trash2 className="h-5 w-5" />
          <span className="text-xs mt-1">Delete</span>
        </button>
      </div>

      {/* Show close button when swiped */}
      {swipeOffset < -100 && (
        <button
          onClick={resetSwipe}
          className="absolute top-2 right-2 bg-gray-200 rounded-full p-1"
        >
          <X className="h-4 w-4" />
        </button>
      )}

      {/* Mobile swipe hint */}
      <div className="text-xs text-gray-400 text-center pb-1 md:hidden">Swipe left for actions</div>
    </div>
  );
}
