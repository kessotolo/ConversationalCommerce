/**
 * Test script for the Cart module
 * This file is for testing purposes only and demonstrates the usage of the cart module
 */

// Standard clean imports
import { CartService, LocalStorageCartService, useCartStore } from './services';
import { CartItem } from './models';

/**
 * Test the CartService implementation
 */
function testCartService() {
  console.log('Testing CartService implementation...');
  
  // Create a new CartService instance with a test storage key
  const cartService = new LocalStorageCartService('test_cart');
  
  // Test initial state
  console.log('Initial items:', cartService.getItems());
  console.log('Initial count:', cartService.getItemCount());
  console.log('Initial total:', cartService.getTotal());
  
  // Test adding items
  const testItem = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    name: 'Test Product',
    price: 10.99,
    image_url: 'test-image.jpg'
  };
  
  cartService.addItem(testItem);
  console.log('After adding item:', cartService.getItems());
  console.log('Count after adding:', cartService.getItemCount());
  console.log('Total after adding:', cartService.getTotal());
  
  // Test updating quantity
  cartService.updateQuantity(testItem.id, 3);
  console.log('After updating quantity:', cartService.getItems());
  console.log('Count after updating:', cartService.getItemCount());
  console.log('Total after updating:', cartService.getTotal());
  
  // Test removing item
  cartService.removeItem(testItem.id);
  console.log('After removing item:', cartService.getItems());
  console.log('Count after removing:', cartService.getItemCount());
  console.log('Total after removing:', cartService.getTotal());
  
  // Cleanup
  cartService.clearCart();
  console.log('After clearing cart:', cartService.getItems());
  
  return 'CartService tests completed';
}

/**
 * Test the Zustand store
 * Note: This can only be fully tested in a browser environment
 * Here we demonstrate the API, but actual state updates won't be visible
 */
function testCartStore() {
  console.log('Demonstrating CartStore API (actual state management requires browser environment)');
  
  // Get initial state from the store
  const initialItems = useCartStore.getState().items;
  console.log('Initial store items:', initialItems);
  
  // Demonstrate the API
  const testItem = {
    id: '223e4567-e89b-12d3-a456-426614174000',
    name: 'Test Store Product',
    price: 15.99,
    image_url: 'test-store-image.jpg'
  };
  
  // These actions would update the state in a browser environment
  console.log('Adding item to store...');
  useCartStore.getState().addItem(testItem);
  
  console.log('Updating quantity in store...');
  useCartStore.getState().updateQuantity(testItem.id, 2);
  
  console.log('Removing item from store...');
  useCartStore.getState().removeItem(testItem.id);
  
  console.log('Clearing cart store...');
  useCartStore.getState().clearCart();
  
  return 'CartStore API demonstration completed';
}

// Run the tests
function runTests() {
  console.log('=== STARTING CART MODULE TESTS ===');
  
  const serviceResult = testCartService();
  console.log(serviceResult);
  
  console.log('---');
  
  const storeResult = testCartStore();
  console.log(storeResult);
  
  console.log('=== CART MODULE TESTS COMPLETED ===');
}

// Export the test functions
export { testCartService, testCartStore, runTests };

// For running in Node environment for testing
if (typeof window === 'undefined' && require.main === module) {
  runTests();
}
