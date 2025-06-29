import React, { useEffect } from "react";
import {
  Box,
  Button,
  FormControl,
  FormLabel,
  FormErrorMessage,
  Input,
  VStack,
  Heading,
  SimpleGrid,
  Select,
  Checkbox,
  useToast,
} from "@chakra-ui/react";
import { useForm } from "react-hook-form";
import { useMutation, useQueryClient } from "react-query";
import { AddressRequest, Address, createAddress, updateAddress } from "../../services/addressService";

interface AddressFormProps {
  address?: Address;
  onSuccess?: () => void;
  isDefault?: boolean;
}

const AddressForm: React.FC<AddressFormProps> = ({ 
  address,
  onSuccess,
  isDefault = false 
}) => {
  const toast = useToast();
  const queryClient = useQueryClient();
  const isEditMode = !!address;

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
    setValue,
  } = useForm<AddressRequest>({
    defaultValues: {
      nickname: "",
      recipient_name: "",
      street_address_1: "",
      street_address_2: "",
      city: "",
      state: "",
      postal_code: "",
      country: "US",
      is_default: isDefault,
    },
  });

  useEffect(() => {
    if (address) {
      // Populate form with existing address data
      setValue("nickname", address.nickname);
      setValue("recipient_name", address.recipient_name);
      setValue("street_address_1", address.street_address_1);
      setValue("street_address_2", address.street_address_2 || "");
      setValue("city", address.city);
      setValue("state", address.state);
      setValue("postal_code", address.postal_code);
      setValue("country", address.country);
      setValue("phone", address.phone || "");
      setValue("is_default", address.is_default);
    }
  }, [address, setValue]);

  const createMutation = useMutation(createAddress, {
    onSuccess: () => {
      toast({
        title: "Address created",
        status: "success",
        duration: 3000,
        isClosable: true,
      });
      queryClient.invalidateQueries("userAddresses");
      reset();
      if (onSuccess) onSuccess();
    },
    onError: (err: any) => {
      toast({
        title: "Error creating address",
        description: err.message || "An error occurred",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    },
  });

  const updateMutation = useMutation(
    (data: { id: string; address: AddressRequest }) =>
      updateAddress(data.id, data.address),
    {
      onSuccess: () => {
        toast({
          title: "Address updated",
          status: "success",
          duration: 3000,
          isClosable: true,
        });
        queryClient.invalidateQueries("userAddresses");
        if (onSuccess) onSuccess();
      },
      onError: (err: any) => {
        toast({
          title: "Error updating address",
          description: err.message || "An error occurred",
          status: "error",
          duration: 5000,
          isClosable: true,
        });
      },
    }
  );

  const onSubmit = (data: AddressRequest) => {
    if (isEditMode && address) {
      updateMutation.mutate({ id: address.id, address: data });
    } else {
      createMutation.mutate(data);
    }
  };

  return (
    <Box p={4} borderWidth="1px" borderRadius="lg" bg="white" width="100%">
      <VStack spacing={6} align="stretch">
        <Heading size="md">{isEditMode ? "Edit Address" : "Add New Address"}</Heading>

        <form onSubmit={handleSubmit(onSubmit)}>
          <VStack spacing={4} align="stretch">
            <FormControl isRequired isInvalid={!!errors.nickname}>
              <FormLabel>Address Nickname</FormLabel>
              <Input
                placeholder="Home, Work, etc."
                {...register("nickname", {
                  required: "Nickname is required",
                })}
              />
              <FormErrorMessage>
                {errors.nickname?.message}
              </FormErrorMessage>
            </FormControl>

            <FormControl isRequired isInvalid={!!errors.recipient_name}>
              <FormLabel>Recipient Name</FormLabel>
              <Input
                placeholder="Full Name"
                {...register("recipient_name", {
                  required: "Recipient name is required",
                })}
              />
              <FormErrorMessage>
                {errors.recipient_name?.message}
              </FormErrorMessage>
            </FormControl>

            <FormControl isRequired isInvalid={!!errors.street_address_1}>
              <FormLabel>Street Address</FormLabel>
              <Input
                placeholder="Street Address Line 1"
                {...register("street_address_1", {
                  required: "Street address is required",
                })}
              />
              <FormErrorMessage>
                {errors.street_address_1?.message}
              </FormErrorMessage>
            </FormControl>

            <FormControl isInvalid={!!errors.street_address_2}>
              <FormLabel>Street Address Line 2</FormLabel>
              <Input
                placeholder="Apt, Suite, Unit, etc. (optional)"
                {...register("street_address_2")}
              />
              <FormErrorMessage>
                {errors.street_address_2?.message}
              </FormErrorMessage>
            </FormControl>

            <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
              <FormControl isRequired isInvalid={!!errors.city}>
                <FormLabel>City</FormLabel>
                <Input
                  placeholder="City"
                  {...register("city", {
                    required: "City is required",
                  })}
                />
                <FormErrorMessage>
                  {errors.city?.message}
                </FormErrorMessage>
              </FormControl>

              <FormControl isRequired isInvalid={!!errors.state}>
                <FormLabel>State / Province</FormLabel>
                <Input
                  placeholder="State/Province"
                  {...register("state", {
                    required: "State is required",
                  })}
                />
                <FormErrorMessage>
                  {errors.state?.message}
                </FormErrorMessage>
              </FormControl>
            </SimpleGrid>

            <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
              <FormControl isRequired isInvalid={!!errors.postal_code}>
                <FormLabel>Postal / Zip Code</FormLabel>
                <Input
                  placeholder="Postal/Zip Code"
                  {...register("postal_code", {
                    required: "Postal code is required",
                  })}
                />
                <FormErrorMessage>
                  {errors.postal_code?.message}
                </FormErrorMessage>
              </FormControl>

              <FormControl isRequired isInvalid={!!errors.country}>
                <FormLabel>Country</FormLabel>
                <Select
                  {...register("country", {
                    required: "Country is required",
                  })}
                >
                  <option value="US">United States</option>
                  <option value="CA">Canada</option>
                  <option value="MX">Mexico</option>
                  <option value="GB">United Kingdom</option>
                  {/* Add more country options as needed */}
                </Select>
                <FormErrorMessage>
                  {errors.country?.message}
                </FormErrorMessage>
              </FormControl>
            </SimpleGrid>

            <FormControl isInvalid={!!errors.phone}>
              <FormLabel>Phone Number (Optional)</FormLabel>
              <Input
                placeholder="Phone Number"
                type="tel"
                {...register("phone", {
                  pattern: {
                    value: /^\+?[0-9]{10,15}$/,
                    message: "Invalid phone number",
                  },
                })}
              />
              <FormErrorMessage>
                {errors.phone?.message}
              </FormErrorMessage>
            </FormControl>

            <FormControl>
              <Checkbox
                {...register("is_default")}
                colorScheme="blue"
                size="md"
              >
                Set as default address
              </Checkbox>
            </FormControl>

            <Button
              mt={4}
              colorScheme="blue"
              isLoading={isSubmitting || createMutation.isLoading || updateMutation.isLoading}
              type="submit"
            >
              {isEditMode ? "Save Changes" : "Add Address"}
            </Button>
          </VStack>
        </form>
      </VStack>
    </Box>
  );
};

export default AddressForm;
