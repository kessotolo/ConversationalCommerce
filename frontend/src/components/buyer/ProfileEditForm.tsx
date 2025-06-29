import React, { useState } from "react";
import {
  Box,
  Button,
  FormControl,
  FormLabel,
  FormErrorMessage,
  Input,
  VStack,
  Heading,
  Text,
  useToast,
  Divider,
  InputGroup,
  InputRightElement,
  IconButton,
  HStack,
} from "@chakra-ui/react";
import { ViewIcon, ViewOffIcon } from "@chakra-ui/icons";
import { useForm } from "react-hook-form";
import { useMutation, useQuery, useQueryClient } from "react-query";
import { updateUserProfile, getUserProfile } from "../../services/userService";

interface ProfileData {
  name: string;
  email: string;
  phone?: string;
  current_password?: string;
  new_password?: string;
  confirm_password?: string;
}

const ProfileEditForm: React.FC = () => {
  const [isPasswordChangeVisible, setIsPasswordChangeVisible] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const toast = useToast();
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
    reset,
    setValue,
  } = useForm<ProfileData>();

  const watchNewPassword = watch("new_password", "");

  const { data: profile, isLoading } = useQuery("userProfile", getUserProfile, {
    onSuccess: (data) => {
      setValue("name", data.name);
      setValue("email", data.email);
      if (data.phone) setValue("phone", data.phone);
    },
  });

  const updateMutation = useMutation(updateUserProfile, {
    onSuccess: () => {
      toast({
        title: "Profile updated",
        status: "success",
        duration: 3000,
        isClosable: true,
      });
      queryClient.invalidateQueries("userProfile");

      // Clear password fields
      setValue("current_password", "");
      setValue("new_password", "");
      setValue("confirm_password", "");
      setIsPasswordChangeVisible(false);
    },
    onError: (err: any) => {
      toast({
        title: "Error updating profile",
        description: err.message || "An error occurred",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    },
  });

  const onSubmit = (data: ProfileData) => {
    // Only include password fields if the user is changing their password
    const payload = {
      name: data.name,
      email: data.email,
      phone: data.phone,
      ...(data.current_password && data.new_password
        ? {
            current_password: data.current_password,
            new_password: data.new_password,
          }
        : {}),
    };

    updateMutation.mutate(payload);
  };

  const togglePasswordChangeForm = () => {
    setIsPasswordChangeVisible(!isPasswordChangeVisible);
    if (!isPasswordChangeVisible) {
      setValue("current_password", "");
      setValue("new_password", "");
      setValue("confirm_password", "");
    }
  };

  if (isLoading) {
    return <Text>Loading profile...</Text>;
  }

  return (
    <Box p={4} borderWidth="1px" borderRadius="lg" bg="white" width="100%">
      <VStack spacing={6} align="stretch">
        <Heading size="md">Edit Profile</Heading>

        <form onSubmit={handleSubmit(onSubmit)}>
          <VStack spacing={4} align="stretch">
            <FormControl isRequired isInvalid={!!errors.name}>
              <FormLabel>Full Name</FormLabel>
              <Input
                type="text"
                placeholder="Full Name"
                {...register("name", {
                  required: "Name is required",
                  minLength: {
                    value: 2,
                    message: "Name must be at least 2 characters",
                  },
                })}
              />
              <FormErrorMessage>
                {errors.name?.message as string}
              </FormErrorMessage>
            </FormControl>

            <FormControl isRequired isInvalid={!!errors.email}>
              <FormLabel>Email</FormLabel>
              <Input
                type="email"
                placeholder="Email"
                {...register("email", {
                  required: "Email is required",
                  pattern: {
                    value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                    message: "Invalid email address",
                  },
                })}
              />
              <FormErrorMessage>
                {errors.email?.message as string}
              </FormErrorMessage>
            </FormControl>

            <FormControl isInvalid={!!errors.phone}>
              <FormLabel>Phone Number</FormLabel>
              <Input
                type="tel"
                placeholder="Phone Number (optional)"
                {...register("phone", {
                  pattern: {
                    value: /^\+?[0-9]{10,15}$/,
                    message: "Invalid phone number",
                  },
                })}
              />
              <FormErrorMessage>
                {errors.phone?.message as string}
              </FormErrorMessage>
            </FormControl>

            <Divider my={2} />

            <HStack justify="space-between">
              <Text fontWeight="medium">Password</Text>
              <Button
                size="sm"
                variant="outline"
                onClick={togglePasswordChangeForm}
              >
                {isPasswordChangeVisible ? "Cancel" : "Change Password"}
              </Button>
            </HStack>

            {isPasswordChangeVisible && (
              <>
                <FormControl isRequired isInvalid={!!errors.current_password}>
                  <FormLabel>Current Password</FormLabel>
                  <InputGroup>
                    <Input
                      type={showPassword ? "text" : "password"}
                      placeholder="Current Password"
                      {...register("current_password", {
                        required: "Current password is required",
                      })}
                    />
                    <InputRightElement>
                      <IconButton
                        aria-label={
                          showPassword ? "Hide password" : "Show password"
                        }
                        icon={showPassword ? <ViewOffIcon /> : <ViewIcon />}
                        onClick={() => setShowPassword(!showPassword)}
                        variant="ghost"
                        size="sm"
                      />
                    </InputRightElement>
                  </InputGroup>
                  <FormErrorMessage>
                    {errors.current_password?.message as string}
                  </FormErrorMessage>
                </FormControl>

                <FormControl isRequired isInvalid={!!errors.new_password}>
                  <FormLabel>New Password</FormLabel>
                  <InputGroup>
                    <Input
                      type={showPassword ? "text" : "password"}
                      placeholder="New Password"
                      {...register("new_password", {
                        required: "New password is required",
                        minLength: {
                          value: 8,
                          message: "Password must be at least 8 characters",
                        },
                        pattern: {
                          value:
                            /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
                          message:
                            "Password must include at least one uppercase letter, one lowercase letter, one number, and one special character",
                        },
                      })}
                    />
                    <InputRightElement>
                      <IconButton
                        aria-label={
                          showPassword ? "Hide password" : "Show password"
                        }
                        icon={showPassword ? <ViewOffIcon /> : <ViewIcon />}
                        onClick={() => setShowPassword(!showPassword)}
                        variant="ghost"
                        size="sm"
                      />
                    </InputRightElement>
                  </InputGroup>
                  <FormErrorMessage>
                    {errors.new_password?.message as string}
                  </FormErrorMessage>
                </FormControl>

                <FormControl isRequired isInvalid={!!errors.confirm_password}>
                  <FormLabel>Confirm New Password</FormLabel>
                  <InputGroup>
                    <Input
                      type={showPassword ? "text" : "password"}
                      placeholder="Confirm New Password"
                      {...register("confirm_password", {
                        required: "Please confirm your new password",
                        validate: (value) =>
                          value === watchNewPassword ||
                          "Passwords do not match",
                      })}
                    />
                    <InputRightElement>
                      <IconButton
                        aria-label={
                          showPassword ? "Hide password" : "Show password"
                        }
                        icon={showPassword ? <ViewOffIcon /> : <ViewIcon />}
                        onClick={() => setShowPassword(!showPassword)}
                        variant="ghost"
                        size="sm"
                      />
                    </InputRightElement>
                  </InputGroup>
                  <FormErrorMessage>
                    {errors.confirm_password?.message as string}
                  </FormErrorMessage>
                </FormControl>
              </>
            )}

            <Divider my={2} />

            <Button
              mt={4}
              colorScheme="blue"
              type="submit"
              isLoading={isSubmitting || updateMutation.isLoading}
              loadingText="Saving"
            >
              Save Changes
            </Button>
          </VStack>
        </form>
      </VStack>
    </Box>
  );
};

export default ProfileEditForm;
