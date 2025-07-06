import React, { useState, useEffect } from 'react';
import { ShippingService } from '../services/ShippingService';
import type { ShippingRate, ShippingRateRequest } from '../models/shipping';
import { formatCurrency } from '@/utils/format';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { AlertCircle, AlertTriangle, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ShippingMethodSelectorProps {
  tenantId: string;
  shippingRequest: ShippingRateRequest;
  onSelect: (rate: ShippingRate) => void;
  selectedRateId?: string;
  isDisabled?: boolean;
}

/**
 * Component for selecting a shipping method from available rates
 */
export const ShippingMethodSelector: React.FC<ShippingMethodSelectorProps> = ({
  tenantId,
  shippingRequest,
  onSelect,
  selectedRateId,
  isDisabled = false
}) => {
  const [rates, setRates] = useState<ShippingRate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedRate, setSelectedRate] = useState<string | null>(selectedRateId || null);

  // Fetch shipping rates when the component mounts or the request changes
  useEffect(() => {
    const fetchRates = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await ShippingService.getRates(tenantId, shippingRequest);

        if (response.errors && response.errors.length > 0) {
          setError(response.errors.join(', '));
          setRates([]);
        } else {
          setRates(response.rates);

          // If we have rates but no selected rate, select the first one
          if (response.rates.length > 0 && !selectedRate) {
            setSelectedRate(response.rates[0].id ||
              `${response.rates[0].service.carrier}-${response.rates[0].service.code}`);
            onSelect(response.rates[0]);
          }
        }
      } catch (err) {
        setError('Failed to load shipping rates. Please try again.');
        console.error('Error fetching shipping rates:', err);
      } finally {
        setLoading(false);
      }
    };

    if (shippingRequest.origin && shippingRequest.destination) {
      fetchRates();
    }
  }, [tenantId, shippingRequest, onSelect]);

  // Handle selection change
  const handleSelectionChange = (value: string) => {
    setSelectedRate(value);
    const selected = rates.find(
      rate => rate.id === value ||
        `${rate.service.carrier}-${rate.service.code}` === value
    );
    if (selected) {
      onSelect(selected);
    }
  };

  // Get ID for a shipping rate
  const getRateId = (rate: ShippingRate): string => {
    return rate.id || `${rate.service.carrier}-${rate.service.code}`;
  };

  // Get carrier logo
  const getCarrierLogo = (carrier: string): string => {
    const carriers: Record<string, string> = {
      'usps': '/images/carriers/usps-logo.png',
      'ups': '/images/carriers/ups-logo.png',
      'fedex': '/images/carriers/fedex-logo.png',
      'dhl': '/images/carriers/dhl-logo.png',
      'LOCAL': '/images/carriers/local-delivery.png'
    };

    return carriers[carrier.toLowerCase()] || '/images/carriers/generic-shipping.png';
  };

  // Retry function
  const retryFetch = () => {
    setLoading(true);
    ShippingService.getRates(tenantId, shippingRequest)
      .then(response => {
        setRates(response.rates);
        setError(null);
      })
      .catch(err => {
        setError('Failed to load shipping rates. Please try again.');
      })
      .finally(() => {
        setLoading(false);
      });
  };

  // Render loading state
  if (loading) {
    return (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Shipping Method</h3>
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-16 w-full rounded-md" />
          ))}
        </div>
      </div>
    );
  }

  // Render error state
  if (error) {
    return (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Shipping Method</h3>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <Button
          size="sm"
          onClick={retryFetch}
          className="flex items-center space-x-2"
        >
          <RefreshCw className="h-4 w-4" />
          <span>Retry</span>
        </Button>
      </div>
    );
  }

  // Render no rates available state
  if (rates.length === 0) {
    return (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Shipping Method</h3>
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            No shipping methods available for this destination.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Render shipping rate options
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Shipping Method</h3>
      <RadioGroup
        value={selectedRate || ''}
        onValueChange={handleSelectionChange}
        disabled={isDisabled}
      >
        <div className="space-y-3">
          {rates.map((rate) => {
            const isSelected = selectedRate === getRateId(rate);
            return (
              <div
                key={getRateId(rate)}
                className={cn(
                  "border rounded-md p-4 transition-all duration-200",
                  isSelected ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:border-gray-300",
                  isDisabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"
                )}
                onClick={() => !isDisabled && handleSelectionChange(getRateId(rate))}
              >
                <div className="flex items-center space-x-3">
                  <RadioGroupItem value={getRateId(rate)} id={getRateId(rate)} disabled={isDisabled} />
                  <Label htmlFor={getRateId(rate)} className="flex-1 cursor-pointer">
                    <div className="flex flex-col w-full">
                      <div className="flex justify-between items-center mb-2">
                        <div className="flex items-center space-x-2">
                          <img
                            src={getCarrierLogo(rate.service.carrier)}
                            alt={rate.service.carrier}
                            className="h-5 w-auto object-contain"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                            }}
                          />
                          <span className="font-medium text-sm">
                            {rate.service.carrier.toUpperCase()}
                          </span>
                          {rate.service.isFastest && (
                            <Badge variant="secondary" className="text-xs">
                              Fastest
                            </Badge>
                          )}
                          {rate.service.isRecommended && (
                            <Badge className="text-xs bg-green-100 text-green-800 border-green-200">
                              Recommended
                            </Badge>
                          )}
                        </div>
                        <span className="text-lg font-semibold">
                          {formatCurrency(rate.totalCost)}
                        </span>
                      </div>

                      <div className="flex justify-between items-center text-sm text-gray-600">
                        <span>{rate.service.name}</span>
                        <span>{rate.estimatedDelivery}</span>
                      </div>

                      {rate.service.description && (
                        <p className="text-xs text-gray-500 mt-1">
                          {rate.service.description}
                        </p>
                      )}
                    </div>
                  </Label>
                </div>
              </div>
            );
          })}
        </div>
      </RadioGroup>
    </div>
  );
};

export default ShippingMethodSelector;
