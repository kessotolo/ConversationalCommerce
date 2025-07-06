import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useForm } from "react-hook-form";
import type { AddressRequest, Address } from "../../services/addressService";
import { createAddress, updateAddress } from "../../services/addressService";

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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isEditMode = !!address;

  const {
    register,
    handleSubmit,
    formState: { errors },
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

  const onSubmit = async (data: AddressRequest) => {
    setIsSubmitting(true);
    try {
      if (isEditMode && address) {
        await updateAddress(address.id, data);
      } else {
        await createAddress(data);
      }
      reset();
      if (onSuccess) onSuccess();
    } catch (error) {
      console.error('Error saving address:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>{isEditMode ? "Edit Address" : "Add New Address"}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Address Nickname */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Address Nickname *
            </label>
            <Input
              placeholder="Home, Work, etc."
              {...register("nickname", {
                required: "Nickname is required",
              })}
              className={errors.nickname ? "border-red-500" : ""}
            />
            {errors.nickname && (
              <p className="text-red-500 text-sm mt-1">{errors.nickname.message}</p>
            )}
          </div>

          {/* Recipient Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Recipient Name *
            </label>
            <Input
              placeholder="Full Name"
              {...register("recipient_name", {
                required: "Recipient name is required",
              })}
              className={errors.recipient_name ? "border-red-500" : ""}
            />
            {errors.recipient_name && (
              <p className="text-red-500 text-sm mt-1">{errors.recipient_name.message}</p>
            )}
          </div>

          {/* Street Address 1 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Street Address *
            </label>
            <Input
              placeholder="Street Address Line 1"
              {...register("street_address_1", {
                required: "Street address is required",
              })}
              className={errors.street_address_1 ? "border-red-500" : ""}
            />
            {errors.street_address_1 && (
              <p className="text-red-500 text-sm mt-1">{errors.street_address_1.message}</p>
            )}
          </div>

          {/* Street Address 2 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Street Address Line 2
            </label>
            <Input
              placeholder="Apt, Suite, Unit, etc. (optional)"
              {...register("street_address_2")}
              className={errors.street_address_2 ? "border-red-500" : ""}
            />
            {errors.street_address_2 && (
              <p className="text-red-500 text-sm mt-1">{errors.street_address_2.message}</p>
            )}
          </div>

          {/* City and State */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                City *
              </label>
              <Input
                placeholder="City"
                {...register("city", {
                  required: "City is required",
                })}
                className={errors.city ? "border-red-500" : ""}
              />
              {errors.city && (
                <p className="text-red-500 text-sm mt-1">{errors.city.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                State / Province *
              </label>
              <Input
                placeholder="State/Province"
                {...register("state", {
                  required: "State is required",
                })}
                className={errors.state ? "border-red-500" : ""}
              />
              {errors.state && (
                <p className="text-red-500 text-sm mt-1">{errors.state.message}</p>
              )}
            </div>
          </div>

          {/* Postal Code and Country */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Postal / Zip Code *
              </label>
              <Input
                placeholder="Postal/Zip Code"
                {...register("postal_code", {
                  required: "Postal code is required",
                })}
                className={errors.postal_code ? "border-red-500" : ""}
              />
              {errors.postal_code && (
                <p className="text-red-500 text-sm mt-1">{errors.postal_code.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Country *
              </label>
              <select
                {...register("country", {
                  required: "Country is required",
                })}
                className={`w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${errors.country ? "border-red-500" : ""
                  }`}
              >
                <option value="US">United States</option>
                <option value="CA">Canada</option>
                <option value="MX">Mexico</option>
                <option value="GB">United Kingdom</option>
              </select>
              {errors.country && (
                <p className="text-red-500 text-sm mt-1">{errors.country.message}</p>
              )}
            </div>
          </div>

          {/* Phone Number */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Phone Number (Optional)
            </label>
            <Input
              placeholder="Phone Number"
              type="tel"
              {...register("phone", {
                pattern: {
                  value: /^\+?[0-9]{10,15}$/,
                  message: "Invalid phone number",
                },
              })}
              className={errors.phone ? "border-red-500" : ""}
            />
            {errors.phone && (
              <p className="text-red-500 text-sm mt-1">{errors.phone.message}</p>
            )}
          </div>

          {/* Default Address Checkbox */}
          <div className="flex items-center">
            <input
              type="checkbox"
              {...register("is_default")}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label className="ml-2 block text-sm text-gray-900">
              Set as default address
            </label>
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white"
          >
            {isSubmitting ? "Saving..." : isEditMode ? "Save Changes" : "Add Address"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default AddressForm;
