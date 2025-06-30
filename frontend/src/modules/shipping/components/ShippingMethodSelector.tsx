import React, { useState, useEffect } from 'react';
import {
  Box,
  RadioGroup,
  Radio,
  Stack,
  Text,
  Flex,
  Skeleton,
  Badge,
  useColorModeValue,
  Divider,
  Alert,
  AlertIcon,
  Image,
  Button
} from '@chakra-ui/react';
import { ShippingService } from '../services/ShippingService';
import type { ShippingRate, ShippingRateRequest } from '../models/shipping';
import { formatCurrency } from '@/utils/format';

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
  
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  const highlightBg = useColorModeValue('blue.50', 'blue.900');
  
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

  // Render loading state
  if (loading) {
    return (
      <Stack spacing={4}>
        <Text fontWeight="bold" mb={2}>Shipping Method</Text>
        {[1, 2, 3].map(i => (
          <Skeleton key={i} height="60px" borderRadius="md" />
        ))}
      </Stack>
    );
  }

  // Render error state
  if (error) {
    return (
      <Box>
        <Text fontWeight="bold" mb={2}>Shipping Method</Text>
        <Alert status="error" borderRadius="md">
          <AlertIcon />
          {error}
        </Alert>
        <Button 
          mt={4} 
          size="sm" 
          colorScheme="blue" 
          onClick={() => {
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
          }}
        >
          Retry
        </Button>
      </Box>
    );
  }

  // Render no rates available state
  if (rates.length === 0) {
    return (
      <Box>
        <Text fontWeight="bold" mb={2}>Shipping Method</Text>
        <Alert status="warning" borderRadius="md">
          <AlertIcon />
          No shipping methods available for this destination.
        </Alert>
      </Box>
    );
  }

  // Render shipping rate options
  return (
    <Box>
      <Text fontWeight="bold" mb={4}>Shipping Method</Text>
      <RadioGroup onChange={handleSelectionChange} value={selectedRate || ''} isDisabled={isDisabled}>
        <Stack spacing={3}>
          {rates.map((rate) => {
            const isSelected = selectedRate === getRateId(rate);
            return (
              <Box
                key={getRateId(rate)}
                borderWidth="1px"
                borderRadius="md"
                borderColor={isSelected ? 'blue.500' : borderColor}
                bg={isSelected ? highlightBg : 'transparent'}
                p={3}
                transition="all 0.2s"
                cursor={isDisabled ? 'not-allowed' : 'pointer'}
                onClick={() => !isDisabled && handleSelectionChange(getRateId(rate))}
              >
                <Radio value={getRateId(rate)} isDisabled={isDisabled}>
                  <Flex direction="column" w="100%">
                    <Flex justify="space-between" align="center" mb={2}>
                      <Flex align="center" gap={2}>
                        <Image 
                          src={getCarrierLogo(rate.service.carrier)} 
                          alt={rate.service.carrier} 
                          height="20px"
                          objectFit="contain"
                        />
                        <Text fontWeight="medium">{rate.service.name}</Text>
                      </Flex>
                      <Text fontWeight="bold">{formatCurrency(rate.total_rate, rate.currency)}</Text>
                    </Flex>
                    
                    <Flex justify="space-between">
                      <Box>
                        {rate.transit_days && (
                          <Text fontSize="sm" color="gray.600">
                            {rate.transit_days === 1 
                              ? '1 day delivery' 
                              : `${rate.transit_days} days delivery`}
                          </Text>
                        )}
                        {rate.estimated_delivery_date && (
                          <Text fontSize="sm" color="gray.600">
                            Estimated delivery: {new Date(rate.estimated_delivery_date).toLocaleDateString()}
                          </Text>
                        )}
                      </Box>
                      
                      {rate.service.guaranteed_delivery && (
                        <Badge colorScheme="green" variant="subtle">
                          Guaranteed
                        </Badge>
                      )}
                    </Flex>
                  </Flex>
                </Radio>
              </Box>
            );
          })}
        </Stack>
      </RadioGroup>
    </Box>
  );
};

export default ShippingMethodSelector;
