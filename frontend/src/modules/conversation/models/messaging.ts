/**
 * Conversation Models
 * 
 * These models define the core messaging capabilities that power
 * the conversational commerce functionality of the platform.
 */

import { ChannelType, Entity, TenantScoped, UUID } from '../../core/models/base';

/**
 * Conversation
 * Represents a messaging thread between a merchant and a customer
 */
export interface Conversation extends TenantScoped {
  customerId: UUID;
  channel: ChannelType;
  status: ConversationStatus;
  lastMessageAt: Date;
  unreadCount: number;
  metadata: ConversationMetadata;
  tags: string[];
}

/**
 * Conversation status
 * Represents the current state of a conversation
 */
export enum ConversationStatus {
  ACTIVE = 'active',
  ARCHIVED = 'archived',
  RESOLVED = 'resolved',
  BLOCKED = 'blocked'
}

/**
 * Conversation metadata
 * Additional data about the conversation
 */
export interface ConversationMetadata {
  customerName?: string;
  customerPhone?: string;
  customerAvatar?: string;
  assignedTo?: UUID;
  relatedOrderIds?: UUID[];
  relatedProductIds?: UUID[];
  source?: string;
  notes?: string;
}

/**
 * Message
 * A single message within a conversation
 */
export interface Message extends Entity {
  conversationId: UUID;
  senderId: UUID;
  senderType: 'customer' | 'merchant' | 'system';
  content: MessageContent;
  status: MessageStatus;
  metadata: MessageMetadata;
  replyToId?: UUID;
}

/**
 * Message content
 * The content of a message, supporting different types
 */
export interface MessageContent {
  type: MessageContentType;
  text?: string;
  mediaUrl?: string;
  locationData?: LocationData;
  productData?: ProductReferenceData;
  orderData?: OrderReferenceData;
  templateData?: TemplateData;
}

/**
 * Message content type
 * The type of content in a message
 */
export enum MessageContentType {
  TEXT = 'text',
  IMAGE = 'image',
  VIDEO = 'video',
  AUDIO = 'audio',
  DOCUMENT = 'document',
  LOCATION = 'location',
  PRODUCT = 'product',
  ORDER = 'order',
  TEMPLATE = 'template'
}

/**
 * Location data
 * Geographic location information
 */
export interface LocationData {
  latitude: number;
  longitude: number;
  name?: string;
  address?: string;
}

/**
 * Product reference data
 * Reference to a product in the catalog
 */
export interface ProductReferenceData {
  productId: UUID;
  name: string;
  price: number;
  currency: string;
  imageUrl?: string;
}

/**
 * Order reference data
 * Reference to an order
 */
export interface OrderReferenceData {
  orderId: UUID;
  orderNumber: string;
  status: string;
  total: number;
  currency: string;
}

/**
 * Template data
 * Data for a message template
 */
export interface TemplateData {
  templateId: string;
  parameters: Record<string, string>;
}

/**
 * Message status
 * The delivery status of a message
 */
export enum MessageStatus {
  SENDING = 'sending',
  SENT = 'sent',
  DELIVERED = 'delivered',
  READ = 'read',
  FAILED = 'failed'
}

/**
 * Message metadata
 * Additional data about the message
 */
export interface MessageMetadata {
  channelMessageId?: string;
  failureReason?: string;
  deliveredAt?: Date;
  readAt?: Date;
  clientTimestamp?: Date;
  isOffline?: boolean;
  retryCount?: number;
}

/**
 * Message template
 * Pre-defined message template for quick responses
 */
export interface MessageTemplate extends TenantScoped {
  name: string;
  content: string;
  parameters: MessageTemplateParameter[];
  category: string;
  isActive: boolean;
}

/**
 * Message template parameter
 * Dynamic parameter for a message template
 */
export interface MessageTemplateParameter {
  name: string;
  defaultValue?: string;
  required: boolean;
}
