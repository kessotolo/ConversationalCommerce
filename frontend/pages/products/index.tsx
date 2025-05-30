import { ThemeContext } from '@/contexts/ThemeContext';import { Product } from '@/types/product';
import { Store } from 'lucide-react';
import { useState } from 'react';
import ProductCard from '../../src/components/storefront/ProductCard';
import { ThemeProvider } from '../../src/components/ThemeProvider';
import { useTheme } from '../../src/contexts/ThemeContext';

// Sample product data
const SAMPLE_PRODUCTS = [
  {
    id: '1',
    name: 'Premium Coffee Blend',
    description: 'A rich, aromatic blend of premium coffee beans from around the world.',
    price: 14.99,
    image_url: 'https://images.unsplash.com/photo-1559056199-641a0ac8b55e?q=80&w=500',
    created_at: new Date().toISOString(),
    is_available: true,
  },
  {
    id: '2',
    name: 'Organic Green Tea',
    description: 'High-quality organic green tea leaves with natural antioxidants.',
    price: 9.99,
    image_url: 'https://images.unsplash.com/photo-1564890369478-c89ca6d9cde9?q=80&w=500',
    created_at: new Date().toISOString(),
    is_available: true,
  },
  {
    id: '3',
    name: 'Handcrafted Ceramic Mug',
    description: 'Beautifully designed ceramic mug, perfect for your morning coffee or tea.',
    price: 24.99,
    image_url: 'https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?q=80&w=500',
    created_at: new Date().toISOString(),
    is_available: false,
  },
  {
    id: '4',
    name: 'Artisan Chocolate Collection',
    description: 'Handcrafted chocolates made with premium ingredients and unique flavors.',
    price: 34.99,
    image_url: 'https://images.unsplash.com/photo-1549007994-cb92caebd54b?q=80&w=500',
    created_at: new Date().toISOString(),
    is_available: true,
  }
];

const ProductListing = () => {
  const [cartItems, setCartItems] = useState<string[]>([]);
  
  const handleAddToCart = (productId: string) => {
    setCartItems(prev => [...prev, productId]);
    alert(`Product added to cart! (${cartItems.length + 1} items)`);
  };
  
  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">Featured Products</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {SAMPLE_PRODUCTS.map(product => (
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
    <div style={{ 
      backgroundColor: theme.colors.background,
      color: theme.colors.text,
      fontFamily: theme.typography.fontFamily.body,
      minHeight: '100vh'
    }}>
      <header style={{
        backgroundColor: theme.componentStyles.navigation.background,
        borderBottom: `1px solid ${theme.colors.secondary}20`,
        padding: theme.layout.spacing.md
      }}>
        <div className="container mx-auto flex items-center justify-between">
          <h1 style={{ 
            color: theme.colors.primary,
            fontFamily: theme.typography.fontFamily.heading,
            fontWeight: theme.typography.fontWeight.bold,
            fontSize: theme.typography.fontSize['2xl']
          }}>
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
      
      <footer style={{
        backgroundColor: theme.colors.primary + '10',
        padding: theme.layout.spacing.lg,
        marginTop: theme.layout.spacing.xl,
        borderTop: `1px solid ${theme.colors.primary}20`
      }}>
        <div className="container mx-auto text-center">
          <p style={{ color: theme.colors.secondary }}>
            Themed with StorefrontTheme model • {new Date().getFullYear()}
          </p>
        </div>
      </footer>
    </div>
  );
}
