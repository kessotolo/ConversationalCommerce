import { csvService } from '@/modules/core/utils/csv-service';
import type { 
  Product, 
  ProductStatus,
  ProductType
} from '../models/product';

/**
 * Type defining a simplified product format for CSV export/import
 * Contains flattened product data suitable for tabular representation
 */
export interface ProductCsvFormat {
  id?: string; // Optional for imports
  name: string;
  sku: string;
  price: string;
  currency: string;
  sale_price?: string;
  status: string;
  type: string;
  description?: string;
  short_description?: string;
  inventory_quantity?: string;
  track_inventory?: string;
  categories?: string; // Comma-separated category IDs
  tags?: string; // Comma-separated tags
  barcode?: string;
  weight?: string;
  weight_unit?: string;
  featured?: string; // "true" or "false"
  created_at?: string; 
  updated_at?: string;
  variant_count?: string; // For exports only
}

/**
 * Service for handling product CSV import/export operations
 */
export class ProductCsvService {
  // CSV column headers for products
  private readonly csvHeaders = [
    'id',
    'name',
    'sku',
    'price',
    'currency',
    'sale_price',
    'status',
    'type',
    'description',
    'short_description',
    'inventory_quantity',
    'track_inventory',
    'categories',
    'tags',
    'barcode',
    'weight',
    'weight_unit',
    'featured',
    'created_at',
    'updated_at',
    'variant_count'
  ];
  
  /**
   * Convert products to CSV format for export
   * @param products - Array of products to export
   * @returns CSV string
   */
  public exportProductsToCsv(products: Product[]): string {
    const csvData = this.productsToFlatFormat(products);
    return csvService.objectsToCsv(csvData, this.csvHeaders);
  }
  
  /**
   * Download products as CSV file
   * @param products - Array of products to export
   * @param filename - Filename for the downloaded CSV
   */
  public downloadProductsCsv(products: Product[], filename = 'products.csv'): void {
    const csvString = this.exportProductsToCsv(products);
    csvService.downloadCsv(csvString, filename);
  }
  
  /**
   * Parse CSV string into product data for import
   * @param csvContent - CSV string containing product data
   * @returns Array of parsed product data in flat format
   */
  public importProductsFromCsv(csvContent: string): ProductCsvFormat[] {
    return csvService.csvToObjects<ProductCsvFormat>(csvContent, this.csvHeaders);
  }
  
  /**
   * Validate imported product data from CSV
   * @param productData - Array of product data from CSV import
   * @returns Object with valid products and validation errors
   */
  public validateImportedProducts(productData: ProductCsvFormat[]): {
    valid: ProductCsvFormat[];
    errors: Array<{ index: number; message: string }>;
  } {
    const valid: ProductCsvFormat[] = [];
    const errors: Array<{ index: number; message: string }> = [];
    
    productData.forEach((product, index) => {
      const validationErrors = this.validateProductData(product);
      
      if (validationErrors.length) {
        errors.push({
          index,
          message: `Row ${index + 1}: ${validationErrors.join(', ')}`,
        });
      } else {
        valid.push(product);
      }
    });
    
    return { valid, errors };
  }
  
  /**
   * Convert raw CSV import data to valid product data format
   * This method can be expanded to include conversion logic
   * @param importedData - Array of product data from CSV import
   * @returns Array of partially formed product objects for API submission
   */
  public convertImportedDataToApiFormat(
    importedData: ProductCsvFormat[]
  ): Partial<Product>[] {
    // This would contain logic for converting the flat CSV format to 
    // the structured Product format required by the API
    // Implementation depends on backend API expectations for bulk imports
    
    return importedData.map(data => {
      const partialProduct: Partial<Product> = {
        name: data.name,
        sku: data.sku,
        price: {
          amount: parseFloat(data.price) || 0,
          currency: data.currency || 'USD',
        },
        status: data.status as ProductStatus,
        type: data.type as ProductType,
      };
      
      // Add optional fields if present
      if (data.sale_price) {
        partialProduct.sale_price = {
          amount: parseFloat(data.sale_price),
          currency: data.currency || 'USD',
        };
      }
      
      if (data.description) {
        partialProduct.description = data.description;
      }
      
      if (data.short_description) {
        partialProduct.short_description = data.short_description;
      }
      
      if (data.inventory_quantity) {
        partialProduct.inventory_quantity = parseInt(data.inventory_quantity, 10);
      }
      
      if (data.track_inventory) {
        partialProduct.track_inventory = data.track_inventory.toLowerCase() === 'true';
      }
      
      if (data.categories) {
        partialProduct.categories = data.categories.split(',').map(c => c.trim());
      }
      
      if (data.tags) {
        partialProduct.tags = data.tags.split(',').map(t => t.trim());
      }
      
      if (data.barcode) {
        partialProduct.barcode = data.barcode;
      }
      
      if (data.weight) {
        partialProduct.weight = parseFloat(data.weight);
      }
      
      if (data.weight_unit) {
        partialProduct.weight_unit = data.weight_unit;
      }
      
      if (data.featured) {
        partialProduct.featured = data.featured.toLowerCase() === 'true';
      }
      
      // Create empty arrays for image data to be filled by file upload process
      partialProduct.images = [];
      
      return partialProduct;
    });
  }
  
  /**
   * Convert products to flat format suitable for CSV export
   * @param products - Array of products to convert
   * @returns Array of flattened product data
   */
  private productsToFlatFormat(products: Product[]): ProductCsvFormat[] {
    return products.map(product => {
      return {
        id: product.id,
        name: product.name,
        sku: product.sku,
        price: product.price.amount.toString(),
        currency: product.price.currency,
        sale_price: product.sale_price?.amount.toString() || '',
        status: product.status,
        type: product.type,
        description: product.description || '',
        short_description: product.short_description || '',
        inventory_quantity: product.inventory_quantity?.toString() || '',
        track_inventory: product.track_inventory ? 'true' : 'false',
        categories: product.categories?.join(',') || '',
        tags: product.tags?.join(',') || '',
        barcode: product.barcode || '',
        weight: product.weight?.toString() || '',
        weight_unit: product.weight_unit || '',
        featured: product.featured ? 'true' : 'false',
        created_at: product.created_at,
        updated_at: product.updated_at,
        variant_count: (product.variants?.length || 0).toString(),
      };
    });
  }
  
  /**
   * Validate a single product record from CSV
   * @param product - Product data to validate
   * @returns Array of validation error messages or empty if valid
   */
  private validateProductData(product: ProductCsvFormat): string[] {
    const errors: string[] = [];
    
    // Required fields
    if (!product.name) {
      errors.push('Missing product name');
    }
    
    if (!product.sku) {
      errors.push('Missing SKU');
    }
    
    if (!product.price) {
      errors.push('Missing price');
    } else if (!this.isValidDecimal(product.price)) {
      errors.push('Invalid price format, must be a number');
    }
    
    if (!product.currency) {
      errors.push('Missing currency');
    } else if (!this.isValidCurrencyCode(product.currency)) {
      errors.push(`Invalid currency code: ${product.currency}`);
    }
    
    if (!product.status) {
      errors.push('Missing status');
    } else if (!this.isValidProductStatus(product.status)) {
      errors.push(`Invalid product status: ${product.status}`);
    }
    
    if (!product.type) {
      errors.push('Missing product type');
    } else if (!this.isValidProductType(product.type)) {
      errors.push(`Invalid product type: ${product.type}`);
    }
    
    // Optional fields
    if (product.sale_price && !this.isValidDecimal(product.sale_price)) {
      errors.push('Invalid sale price format, must be a number');
    }
    
    if (product.inventory_quantity && !this.isValidInteger(product.inventory_quantity)) {
      errors.push('Invalid inventory quantity format, must be a whole number');
    }
    
    if (product.track_inventory && 
        !['true', 'false'].includes(product.track_inventory.toLowerCase())) {
      errors.push('Track inventory must be "true" or "false"');
    }
    
    if (product.weight && !this.isValidDecimal(product.weight)) {
      errors.push('Invalid weight format, must be a number');
    }
    
    if (product.featured && 
        !['true', 'false'].includes(product.featured.toLowerCase())) {
      errors.push('Featured must be "true" or "false"');
    }
    
    return errors;
  }
  
  /**
   * Check if a status value is a valid ProductStatus
   * @param status - Status to validate
   * @returns Boolean indicating if status is valid
   */
  private isValidProductStatus(status: string): boolean {
    const validStatuses = [
      'ACTIVE',
      'DRAFT',
      'ARCHIVED',
      'OUT_OF_STOCK',
      'DISCONTINUED',
    ];
    
    return validStatuses.includes(status);
  }
  
  /**
   * Check if a type value is a valid ProductType
   * @param type - Type to validate
   * @returns Boolean indicating if type is valid
   */
  private isValidProductType(type: string): boolean {
    const validTypes = [
      'PHYSICAL',
      'DIGITAL',
      'SERVICE',
      'SUBSCRIPTION',
    ];
    
    return validTypes.includes(type);
  }
  
  /**
   * Validate currency code format (3 uppercase letters)
   * @param code - Currency code to validate
   * @returns Boolean indicating if currency code is valid
   */
  private isValidCurrencyCode(code: string): boolean {
    const currencyCodeRegex = /^[A-Z]{3}$/;
    return currencyCodeRegex.test(code);
  }
  
  /**
   * Validate decimal number format
   * @param value - Value to validate
   * @returns Boolean indicating if value is a valid decimal
   */
  private isValidDecimal(value: string): boolean {
    const decimalRegex = /^-?\d+(\.\d+)?$/;
    return decimalRegex.test(value);
  }
  
  /**
   * Validate integer number format
   * @param value - Value to validate
   * @returns Boolean indicating if value is a valid integer
   */
  private isValidInteger(value: string): boolean {
    const integerRegex = /^-?\d+$/;
    return integerRegex.test(value);
  }
}

// Export a singleton instance for use throughout the app
export const productCsvService = new ProductCsvService();
