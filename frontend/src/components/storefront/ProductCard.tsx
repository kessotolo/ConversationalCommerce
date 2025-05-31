import * as React from 'react';
import { ThemeContext } from '@/contexts/ThemeContext';// Removed circular import;
import Image from 'next/image';
import { useState } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { useThemeStyles } from '../../hooks/useThemeStyles';

interface Product {
    id: string;
    name: string;
    description: string;
    price: number;
    image_url: string | null;
    created_at: string;
    is_available: boolean;
}

interface ProductCardProps {
    product: Product;
    onAddToCart: () => void;
}

export default function ProductCard({ product, onAddToCart }: ProductCardProps) {
    const { theme } = useTheme();
    const styles = useThemeStyles();
    const [isHovered, setIsHovered] = useState(false);
    
    // Combine default styles with hover state styles when needed
    const cardStyle = {
        ...styles.productCard.style,
        ...(isHovered ? styles.productCard.hoverStyle : {})
    };

    return (
        <div 
            className={styles.productCard.className}
            style={cardStyle}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            <div 
                className={styles.productCard.imageContainer.className}
                style={styles.productCard.imageContainer.style}
            >
                {product.image_url ? (
                    <Image
                        src={product.image_url}
                        alt={product.name}
                        fill
                        className="object-cover"
                    />
                ) : (
                    <div 
                        className="w-full h-full flex items-center justify-center"
                        style={{ backgroundColor: `${theme.colors.secondary}15` }}
                    >
                        <span style={{ color: theme.colors.secondary }}>No image</span>
                    </div>
                )}
                {!product.is_available && (
                    <div 
                        className="absolute top-2 right-2 px-2 py-1 rounded text-sm"
                        style={styles.productCard.badge.style}
                    >
                        Out of Stock
                    </div>
                )}
            </div>
            <div className={styles.productCard.content.className}>
                <h3 style={styles.productCard.title.style}>
                    {product.name}
                </h3>
                <p style={styles.productCard.description.style}>
                    {product.description}
                </p>
                <div className="flex items-center justify-between mt-2">
                    <span style={styles.productCard.price.style}>
                        ${product.price.toFixed(2)}
                    </span>
                    {product.is_available && (
                        <button
                            onClick={onAddToCart}
                            style={{
                                backgroundColor: theme.colors.primary,
                                color: theme.componentStyles.button.primary.text,
                                borderRadius: theme.componentStyles.button.primary.borderRadius,
                                padding: theme.componentStyles.button.primary.padding,
                                border: 'none',
                                transition: 'background-color 0.2s ease-in-out',
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = theme.componentStyles.button.primary.hoverBackground;
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = theme.colors.primary;
                            }}
                        >
                            Add to Cart
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}