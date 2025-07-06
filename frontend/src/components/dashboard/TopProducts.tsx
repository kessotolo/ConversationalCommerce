import Image from 'next/image';

import { CardHeader, CardTitle, CardContent, Card } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils';

interface Product {
  id: string;
  name: string;
  imageUrl?: string;
  price: number;
  soldCount: number;
  revenue: number;
}

interface TopProductsProps {
  products: Product[];
  isLoading?: boolean;
}

export function TopProducts({ products, isLoading = false }: TopProductsProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Top Products</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center space-x-4">
                <div className="h-10 w-10 rounded-md bg-gray-200 animate-pulse" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4" />
                  <div className="h-3 bg-gray-200 rounded animate-pulse w-1/2" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Top Products</CardTitle>
      </CardHeader>
      <CardContent>
        {products.length === 0 ? (
          <p className="text-center py-4 text-muted-foreground">No products data</p>
        ) : (
          <div className="space-y-5">
            {products.map((product) => (
              <div key={product.id} className="flex items-start space-x-4">
                <div className="relative h-12 w-12 rounded-md overflow-hidden bg-muted">
                  {product.imageUrl ? (
                    <Image
                      src={product.imageUrl}
                      alt={product.name}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="flex items-center justify-center w-full h-full bg-gray-100 text-gray-400 text-xs">
                      No image
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{product.name}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatCurrency(product.price)} • {product.soldCount} sold
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium">{formatCurrency(product.revenue)}</p>
                  <p className="text-xs text-muted-foreground mt-1">Revenue</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
