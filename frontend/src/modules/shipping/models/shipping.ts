import type { AddressInterface } from '@/modules/core/models/address';

/**
 * Interface for package dimensions used in shipping
 */
export interface PackageDimensions {
  length: number;
  width: number;
  height: number;
  weight: number;
}

/**
 * Interface for shipping service offered by a carrier
 */
export interface ShippingService {
  code: string;
  name: string;
  carrier: string;
  transit_days?: number;
  guaranteed_delivery: boolean;
  description?: string;
}

/**
 * Interface for shipping rate
 */
export interface ShippingRate {
  service: ShippingService;
  base_rate: number;
  taxes?: number;
  fees?: Record<string, number>;
  insurance_rate?: number;
  total_rate: number;
  currency: string;
  estimated_delivery_date?: string;
  transit_days?: number;
  id?: string; // Used for selecting a saved rate
}

/**
 * Interface for shipping rate request
 */
export interface ShippingRateRequest {
  origin: AddressInterface;
  destination: AddressInterface;
  packages: PackageDimensions[];
  service_codes?: string[];
  signature_required?: boolean;
  insurance_amount?: number;
}

/**
 * Interface for shipping rate response
 */
export interface ShippingRateResponse {
  rates: ShippingRate[];
  carrier: string;
  errors?: string[];
}

/**
 * Interface for shipping label format
 */
export enum LabelFormat {
  PDF = 'pdf',
  PNG = 'png',
  ZPL = 'zpl',
}

/**
 * Interface for shipping label request
 */
export interface LabelRequest {
  rate_id?: string;
  service_code: string;
  carrier: string;
  origin: AddressInterface;
  destination: AddressInterface;
  packages: PackageDimensions[];
  reference?: string;
  format?: LabelFormat;
  label_size?: string;
  signature_required?: boolean;
  insurance_amount?: number;
  label_order_id?: string;
}

/**
 * Interface for package label
 */
export interface PackageLabel {
  tracking_number: string;
  label_url: string;
  carrier: string;
  service_code: string;
  label_format: LabelFormat;
  shipment_id: string;
  package_dimensions: PackageDimensions;
  created_at: string;
}

/**
 * Interface for label response
 */
export interface LabelResponse {
  labels: PackageLabel[];
  carrier: string;
  total_cost: number;
  currency: string;
  shipment_id: string;
  estimated_delivery_date?: string;
  errors?: string[];
}

/**
 * Standard tracking statuses across providers
 */
export enum TrackingStatus {
  UNKNOWN = 'unknown',
  CREATED = 'created',
  PRE_TRANSIT = 'pre_transit',
  TRANSIT = 'in_transit',
  OUT_FOR_DELIVERY = 'out_for_delivery',
  DELIVERED = 'delivered',
  AVAILABLE_FOR_PICKUP = 'available_for_pickup',
  RETURN_TO_SENDER = 'return_to_sender',
  FAILURE = 'delivery_failure',
  CANCELLED = 'cancelled',
  EXCEPTION = 'exception',
}

/**
 * Interface for tracking event
 */
export interface TrackingEvent {
  timestamp: string;
  status: TrackingStatus;
  location?: string;
  description?: string;
  raw_status?: string;
}

/**
 * Interface for tracking response
 */
export interface TrackingResponse {
  tracking_number: string;
  carrier: string;
  status: TrackingStatus;
  estimated_delivery_date?: string;
  events: TrackingEvent[];
  last_event?: TrackingEvent;
  delivered_at?: string;
  errors?: string[];
}
