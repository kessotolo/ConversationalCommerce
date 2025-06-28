import React, { useState, useEffect } from 'react';

import ProductCard from '../../src/components/storefront/ProductCard';
import { ThemeProvider } from '../../src/components/ThemeProvider';
import { useTheme } from '../../src/contexts/ThemeContext';
import { productService } from '../../src/lib/api';

interface Product {
  id: string;
  name: string;
  price: number;
  imageUrl?: string;
}

const ProductListing = () => {
  const [cartItems, setCartItems] = useState<string[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const handleAddToCart = (productId: string) => {
    setCartItems((prev) => [...prev, productId]);
    alert(`Product added to cart! (${cartItems.length + 1} items)`);
  };

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const response = await productService.getProducts();
        setProducts(response.data?.products || response.data?.items || []);
      } catch (e) {
        setError('Error fetching products');
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading products...</div>;
  }

  if (error) {
    return <div className="min-h-screen flex items-center justify-center">{error}</div>;
  }

  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">Featured Products</h1>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {products.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              onAddToCart={() => handleAddToCart(product.id)}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

// Wrap the page with ThemeProvider
export default function ProductsPage() {
  return (
    <ThemeProvider>
      <ThemedProductListing />
    </ThemeProvider>
  );
}

// Create a theme-aware wrapper component to access the theme context
function ThemedProductListing() {
  const { theme, isLoading } = useTheme();

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center">Loading theme...</div>;
  }

  return (
    <div
      style={{
        backgroundColor: theme.colors.background,
        color: theme.colors.text,
        fontFamily: theme.typography.fontFamily.body,
        minHeight: '100vh',
      }}
    >
      <header
        style={{
          backgroundColor: theme.componentStyles.navigation.background,
          borderBottom: `1px solid ${theme.colors.secondary}20`,
          padding: theme.layout.spacing.md,
        }}
      >
        <div className="container mx-auto flex items-center justify-between">
          <h1
            style={{
              color: theme.colors.primary,
              fontFamily: theme.typography.fontFamily.heading,
              fontWeight: theme.typography.fontWeight.bold,
              fontSize: theme.typography.fontSize['2xl'],
            }}
          >
            Themed Store
          </h1>
          <div>
            <span style={{ color: theme.componentStyles.navigation.text }}>
              Theme: {theme.name}
            </span>
          </div>
        </div>
      </header>

      <ProductListing />

      <footer
        style={{
          backgroundColor: `${theme.colors.primary}10`,
          padding: theme.layout.spacing.lg,
          marginTop: theme.layout.spacing.xl,
          borderTop: `1px solid ${theme.colors.primary}20`,
        }}
      >
        <div className="container mx-auto text-center">
          <p style={{ color: theme.colors.secondary }}>
            Themed with StorefrontTheme model • {new Date().getFullYear()}
          </p>
        </div>
      </footer>
    </div>
  );
}
