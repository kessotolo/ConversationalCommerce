import { Badge } from '@/components/ui/badge';
import { OrderStatus } from '@/modules/order/models/order';

/**
 * Mapping of order status to corresponding style classes
 * Each status has a unique color scheme for visual distinction
 */
const statusStyles = {
  [OrderStatus.PENDING]: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  [OrderStatus.PROCESSING]: 'bg-blue-100 text-blue-800 border-blue-200',
  [OrderStatus.SHIPPED]: 'bg-purple-100 text-purple-800 border-purple-200',
  [OrderStatus.DELIVERED]: 'bg-green-100 text-green-800 border-green-200',
  [OrderStatus.CANCELLED]: 'bg-red-100 text-red-800 border-red-200',
  [OrderStatus.PAID]: 'bg-green-100 text-green-800 border-green-200',
  [OrderStatus.REFUNDED]: 'bg-gray-100 text-gray-800 border-gray-200',
  [OrderStatus.FAILED]: 'bg-red-100 text-red-800 border-red-200',
};

/**
 * Helper function to format order status for display
 * Capitalizes the first letter of the status and converts the rest to lowercase
 * 
 * @param {OrderStatus} status - The order status enum value
 * @returns {string} Formatted status string for display
 */
export function getStatusDisplay(status: OrderStatus): string {
  return status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
}

/**
 * Props for the OrderStatusBadge component
 * 
 * @interface OrderStatusBadgeProps
 * @property {OrderStatus} status - The order status to display
 * @property {string} [className] - Optional additional CSS classes
 */
interface OrderStatusBadgeProps {
  /** The order status to display */
  status: OrderStatus;
  
  /** Optional additional CSS classes to apply to the badge */
  className?: string;
}

/**
 * OrderStatusBadge Component
 * Renders a styled badge representing the current status of an order
 * Uses color coding to provide visual cues about different status types
 * 
 * @param {OrderStatusBadgeProps} props - Component props
 * @returns {JSX.Element} Styled badge with status text
 */
export function OrderStatusBadge({ status, className = '' }: OrderStatusBadgeProps) {
  return (
    <Badge className={`${statusStyles[status] || ''} ${className}`} variant="outline">
      {getStatusDisplay(status)}
    </Badge>
  );
}
